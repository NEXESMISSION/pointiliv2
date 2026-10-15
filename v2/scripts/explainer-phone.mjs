/**
 * An explainer to send owners, filmed on the real app: a customer without
 * their phone — the tampon given with their phone number. A perfume shop
 * like Sultan al oud (the counter asks which perfume): «سكاني» → «اكتب
 * الكود» → the number → the perfume → «زيد تامبون» → done. A finger shows
 * each tap and one line on top says each step. 720×1280 MP4 for WhatsApp.
 *
 *   node scripts/explainer-phone.mjs      (from v2/, dev server on :3200)
 *   → social/explainers/tampon-by-phone.mp4
 */
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { config } from "dotenv";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const BASE = "http://localhost:3200";
const OUT = "../social/explainers";
const TMP = ".e2e/explainer";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const phoneNo = () => `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
const owner = await robot(admin, phoneNo());
// the customer's number as the owner types it: a robot's, never somebody's real number
let cust;
do cust = phoneNo();
while ((await admin.from("people").select("id").eq("phone", `+216${cust}`).maybeSingle()).data);
await robot(admin, cust);
const PERFUMES = ["Parfum 30 ml", "Parfum 50 ml", "Parfum 100 ml", "Parfum 30 ml CP", "Parfum 50 ml CP", "Parfum 100 ml CP"];
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
mkdirSync(OUT, { recursive: true });

// a camera that sees a dark counter (not «الكاميرا ما خدمتش», as a browser without a camera says)
const FF = process.env.FFMPEG || "ffmpeg";
execFileSync(FF, ["-v", "error", "-y", "-f", "lavfi", "-i", "color=c=0x2a2533:s=640x480:d=2", "-pix_fmt", "yuv420p", `${TMP}/cam.y4m`]);
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", `--use-file-for-fake-video-capture=${resolve(TMP, "cam.y4m")}`],
});
const phone = { viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ar-TN" };

/** the caption on top and the finger: drawn into the page, over everything, touching nothing */
const OVERLAY = `
  (() => {
    if (document.getElementById("xp-cap")) return;
    const st = document.createElement("style");
    st.textContent = \`
      #xp-cap { position: fixed; z-index: 2147483647; inset: auto 12px 14px 12px; padding: 12px 14px; border-radius: 18px;
        background: rgba(15,14,23,.92); color: #fff; font: 700 17px/1.4 "IBM Plex Sans Arabic", system-ui, sans-serif; text-align: center;
        direction: rtl; pointer-events: none; box-shadow: 0 12px 30px -10px rgba(0,0,0,.5); transition: opacity .25s; }
      #xp-cap b { display: inline-grid; place-items: center; width: 26px; height: 26px; margin-inline-end: 8px; border-radius: 99px; background: #6c47ff; font-size: 14px; }
      #xp-dot { position: fixed; z-index: 2147483647; width: 44px; height: 44px; margin: -22px 0 0 -22px; border-radius: 99px;
        background: rgba(255,255,255,.55); border: 3px solid #ff6b4a; box-shadow: 0 6px 18px rgba(0,0,0,.35); pointer-events: none;
        transition: left .55s cubic-bezier(.3,.8,.3,1), top .55s cubic-bezier(.3,.8,.3,1), transform .15s; opacity: 0; }
      #xp-dot.tap { transform: scale(.7); }
    \`;
    document.head.appendChild(st);
    const cap = document.createElement("div"); cap.id = "xp-cap"; cap.style.opacity = "0"; document.body.appendChild(cap);
    const dot = document.createElement("div"); dot.id = "xp-dot"; document.body.appendChild(dot);
  })();
`;
async function overlay(p) {
  await p.evaluate(OVERLAY);
}
/** `top`: where the screen's own button sits at the bottom (the camera's «اكتب الكود») */
async function caption(p, n, text, top = false) {
  await overlay(p);
  await p.evaluate(([n, text, top]) => {
    const c = document.getElementById("xp-cap");
    c.innerHTML = `<b>${n}</b>${text}`;
    c.style.top = top ? "64px" : "auto";
    c.style.bottom = top ? "auto" : "14px";
    c.style.opacity = "1";
  }, [n, text, top]);
}
/** the finger moves onto the thing, presses it, and the tap is real */
async function tap(p, locator) {
  await overlay(p);
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await p.evaluate(([x, y]) => {
    const d = document.getElementById("xp-dot");
    d.style.opacity = "1";
    d.style.left = x + "px";
    d.style.top = y + "px";
  }, [x, y]);
  await p.waitForTimeout(800);
  await p.evaluate(() => document.getElementById("xp-dot").classList.add("tap"));
  await p.waitForTimeout(180);
  await p.evaluate(() => document.getElementById("xp-dot").classList.remove("tap"));
  await locator.click();
}

try {
  // the shop, set up as a perfume shop with its perfumes and the counter's question on
  const o0 = await (await browser.newContext(phone)).newPage();
  await o0.goto(BASE + "/shop/new", { waitUntil: "load" });
  await o0.locator('input[name="name"]').fill("Bader");
  await o0.locator('input[name="shop"]').fill("Sultan al oud");
  await o0.locator('input[name="phone"]').fill(owner);
  await o0.locator('input[name="password"]').fill("explainer1");
  await o0.getByRole("button", { name: /الكل/ }).click();
  await o0.locator('input[type="search"]').fill("parfum");
  await o0.getByRole("dialog").getByRole("button", { name: "عطورات" }).click();
  await Promise.all([o0.waitForURL("**/shop/card?new=1", { timeout: 60000 }), o0.locator('button[type="submit"]').click()]);
  await Promise.all([o0.waitForURL("**/shop/start", { timeout: 60000 }), o0.getByRole("button", { name: "حلّ الكارط" }).click()]);
  const { data: me } = await admin.from("people").select("id, seen").eq("phone", `+216${owner}`).single();
  const { data: shop } = await admin.from("shops").select("id").eq("owner_id", me.id).single();
  await admin.from("items").insert(PERFUMES.map((name, i) => ({ shop_id: shop.id, name, rank: i })));
  await admin.from("shops").update({ items_on: true, color: "#7a3b8f" }).eq("id", shop.id);
  // every note already seen: nothing pops over the film
  await admin.from("people").update({ seen: ["card_hello", "coach", "logo_tip", "offer", "push", "install", "first_scan", "first_gift", "mission", "fix_tip"] }).eq("id", me.id);
  const cookies = await o0.context().cookies();
  await o0.context().close();

  // the customer, with an account and two tampons already
  const c = await (await browser.newContext(phone)).newPage();
  await c.goto(BASE + "/join", { waitUntil: "load" });
  await c.locator('input[name="name"]').fill("أحمد");
  await c.locator('input[name="phone"]').fill(cust);
  await c.locator('input[name="password"]').fill("explainer1");
  await Promise.all([c.waitForURL((u) => u.pathname === "/", { timeout: 60000 }), c.locator('button[type="submit"]').click()]);
  const { data: cu } = await admin.from("people").select("id").eq("phone", `+216${cust}`).single();
  const { data: card } = await admin.from("cards").insert({ shop_id: shop.id, user_id: cu.id, stamps: 2, last_at: new Date(Date.now() - 3 * 86400_000).toISOString() }).select("id").single();
  void card;
  await c.context().close();

  // the film
  const ctx = await browser.newContext({ ...phone, permissions: ["camera"], recordVideo: { dir: TMP, size: { width: 720, height: 1280 } } });
  await ctx.addCookies(cookies);
  const p = await ctx.newPage();
  await p.goto(BASE + "/shop", { waitUntil: "load" });
  await p.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((e) => e.remove()));
  await p.waitForTimeout(600);
  await caption(p, 1, "الحريف ما عندوش التليفون؟ انزل على «سكاني»");
  await p.waitForTimeout(1800);
  await tap(p, p.locator('a[href="/shop/collect?by=scan"]').first());
  await p.waitForURL("**/shop/collect**");
  await p.waitForTimeout(900);
  await p.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((e) => e.remove()));
  await caption(p, 2, "انزل على «اكتب الكود»", true);
  await p.waitForTimeout(1500);
  await tap(p, p.getByRole("button", { name: /اكتب الكود/ }).first());
  await p.waitForTimeout(700);
  await caption(p, 3, "اكتب النومرو متاع الحريف");
  await p.waitForTimeout(1200);
  const box = p.getByRole("textbox").first();
  await tap(p, box);
  for (const ch of cust) {
    await p.keyboard.type(ch);
    await p.waitForTimeout(170);
  }
  await p.waitForTimeout(1800);
  // the perfume, when the counter asks (a shop that says what it sells)
  const perfume = p.getByRole("button", { name: /Parfum 50 ml/ }).first();
  if (await perfume.isVisible().catch(() => false)) {
    await caption(p, 4, "انزل على البارفان اللي خذاه");
    await p.waitForTimeout(1500);
    await tap(p, perfume);
    await p.waitForTimeout(900);
  }
  const give = p.getByRole("button", { name: /زيد تامبون/ }).first();
  if (await give.isVisible().catch(() => false)) {
    await caption(p, 5, "انزل على «زيد تامبون»");
    await p.waitForTimeout(1500);
    await tap(p, give);
  }
  await p.waitForTimeout(1500);
  await p.evaluate(() => (document.getElementById("xp-dot").style.opacity = "0"));
  await caption(p, "✓", "خلاص! التامبون تسجّل للحريف، على البارفان اللي خذاه");
  await p.waitForTimeout(3500);
  await ctx.close();

  // the recording → an MP4 WhatsApp plays
  const webm = readdirSync(TMP).find((f) => f.endsWith(".webm"));
  execFileSync(FF, ["-y", "-i", `${TMP}/${webm}`, "-ss", "0.6", "-vf", "scale=720:1280,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "22", "-movflags", "+faststart", "-an", `${OUT}/tampon-by-phone.mp4`], { stdio: "inherit" });
  console.log(`→ ${OUT}/tampon-by-phone.mp4`);
} finally {
  await browser.close();
  for (const d of [owner, cust]) {
    const { data } = await admin.from("people").select("id").eq("phone", `+216${d}`).maybeSingle();
    if (data) {
      await admin.from("shops").delete().eq("owner_id", data.id);
      await admin.auth.admin.deleteUser(data.id);
    }
  }
  await unrobot(admin, [owner, cust]);
}
