/**
 * Two clips of the wheel, filmed off the real screens, for the note that tells
 * owners about it:
 *
 *   win — what a customer sees: a full card, the wheel, the spin, the prize.
 *   set — how the owner prepares it: the prizes written, the chances shared
 *         out, saved, the switch turned on.
 *
 * The note leads with «win», because somebody who has never seen a roulette
 * needs to know what it is before they are shown a screen of settings.
 *
 * They land in public/clips beside the owner's first story — 540 wide, no
 * sound, H.264 so an iPhone plays them, about half a megabyte each — with a
 * still beside each for the first frame.
 *
 *   node scripts/wheel-clip.mjs            (from v2/, dev server on :3200 — or BASE=)
 *   ONLY=win node scripts/wheel-clip.mjs   (one of them)
 *
 * A new cut is a new name: wheel-win-v2.mp4.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import sharp from "sharp";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const BASE = process.env.BASE || "http://localhost:3200";
const ONLY = process.env.ONLY ? process.env.ONLY.split(",").map((s) => s.trim()) : null;
const OUT = "public/clips";
const RAW = ".e2e/wheel-clip";
mkdirSync(OUT, { recursive: true });
mkdirSync(RAW, { recursive: true });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const PASS = "wheel-clip-2026";
const NOTES = ["card_hello", "coach", "logo_tip", "offer", "push", "install", "first_scan", "first_gift", "mission"];
const PRIZES = ["قهوة بلاش", "كرواسون", "ريميز 20%"];
const GOAL = 8;
const SIZE = { width: 540, height: 960 };
const made = [];
const phones = [];

for (const ip of ["local", "::1", "127.0.0.1"]) await admin.rpc("forget_tries", { p_key: `login-ip:${ip}` });

async function person(name) {
  const d = await robot(admin, `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`);
  phones.push(d);
  const { data, error } = await admin.auth.admin.createUser({ email: `216${d}@phone.pointidi.app`, password: PASS, email_confirm: true, app_metadata: { phone: `+216${d}` } });
  if (error) throw error;
  made.push(data.user.id);
  await admin.from("people").upsert({ id: data.user.id, name, phone: `+216${d}`, seen: NOTES });
  return { id: data.user.id, digits: d };
}

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });

/** Signed in once in a context that is not filmed, so a clip starts on the screen it is about. */
async function cookiesFor(who) {
  const warm = await browser.newContext({ viewport: SIZE, locale: "ar-TN" });
  const p = await warm.newPage();
  await p.goto(`${BASE}/login`, { waitUntil: "load", timeout: 90000 });
  await p.locator('input[name="phone"]').fill(who.digits);
  await p.locator('input[name="password"]').fill(PASS);
  await Promise.all([p.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 90000 }), p.locator('button[type="submit"]').click()]);
  const state = await warm.storageState();
  await warm.close();
  return { cookies: state.cookies, origins: [] };
}

/** Films `act` and gives back the raw film. */
async function film(name, cookies, act) {
  const dir = join(RAW, name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({ viewport: SIZE, locale: "ar-TN", storageState: cookies, recordVideo: { dir, size: SIZE } });
  // the dev server's own badge would be filmed with everything else
  await ctx.addInitScript(() => {
    const css = document.createElement("style");
    css.textContent = "nextjs-portal{display:none!important}";
    document.documentElement.append(css);
  });
  const p = await ctx.newPage();
  await act(p);
  await ctx.close();
  const webm = readdirSync(dir).find((f) => f.endsWith(".webm"));
  if (!webm) throw new Error(`${name}: nothing was filmed`);
  return join(dir, webm);
}

/**
 * The cut: the first seconds are the page still painting, so they go, and it
 * runs faster than it was filmed — a browser driven by a script moves at a
 * crawl and nobody watches a popup for twenty seconds. `crop` takes out the
 * parts of the screen that carry nothing, because a 9:16 clip inside a
 * popup's card shrinks to a thumbnail nobody can follow.
 */
async function cut(src, name, { from, length, speed, crop, size, poster }) {
  const mp4 = join(OUT, `${name}.mp4`);
  const vf = [`setpts=PTS/${speed}`, crop ? `crop=${crop}` : null, `scale=${size}:flags=lanczos`, "fps=24"].filter(Boolean).join(",");
  execFileSync("ffmpeg", ["-y", "-ss", String(from), "-i", src, "-t", String(length), "-an", "-c:v", "libx264", "-preset", "slow", "-b:v", "430k", "-maxrate", "600k", "-bufsize", "1200k", "-vf", vf, "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4], { stdio: "pipe" });
  const png = join(RAW, `${name}.png`);
  execFileSync("ffmpeg", ["-y", "-ss", String(poster), "-i", mp4, "-vframes", "1", png], { stdio: "pipe" });
  await sharp(png).webp({ quality: 72 }).toFile(mp4.replace(/\.mp4$/, ".webp"));
  console.log(`  ${name}.mp4 + .webp`);
}

const want = (n) => !ONLY || ONLY.includes(n);
try {
  // ── what a customer sees ────────────────────────────────────────────────
  if (want("win")) {
    console.log("filming the spin…");
    const owner = await person("صاحب المحل");
    const { data: shop, error: e1 } = await admin
      .from("shops")
      .insert({ owner_id: owner.id, name: "Café Pointili", kind: "cafe", color: "#6C47FF", goal: GOAL, gift: "الروليت", wheel_allowed: true, wheel_on: true, created_at: new Date(Date.now() - 9 * 86_400_000).toISOString() })
      .select("*")
      .single();
    if (e1) throw e1;
    await admin.from("wheel_prizes").insert(PRIZES.map((name, i) => ({ shop_id: shop.id, name, chance: i === 0 ? 34 : 33, rank: i })));
    const buyer = await person("نور");
    const { data: card, error: e2 } = await admin
      .from("cards")
      .insert({ shop_id: shop.id, user_id: buyer.id, stamps: GOAL, goal: GOAL, gift: "الروليت", last_at: new Date().toISOString(), created_at: new Date(Date.now() - 5 * 86_400_000).toISOString() })
      .select("id")
      .single();
    if (e2) throw e2;
    // the turn itself, written as give() writes it when a card fills in a wheel shop
    const { error: e3 } = await admin.from("moments").insert({ shop_id: shop.id, card_id: card.id, kind: "gift", gift: "الروليت", wheel: true, banked: true });
    if (e3) throw e3;

    const raw = await film("win", await cookiesFor(buyer), async (p) => {
      await p.goto(`${BASE}/c/${card.id}`, { waitUntil: "load", timeout: 90000 });
      // the turn opens by itself; a breath to read «كمّلت الكارط!» before the hub is tapped
      await p.getByRole("dialog").waitFor({ timeout: 25000 });
      await p.waitForTimeout(2200);
      await p.getByRole("button", { name: "دوّر" }).click({ timeout: 20000 });
      // it turns, lands, and the prize is said with confetti
      await p.waitForTimeout(7000);
    });
    // the wheel sits in the middle of a tall dark screen: cut to it and the words around it
    await cut(raw, "wheel-win-v1", { from: 1.2, length: 11, speed: 1.25, crop: "540:660:0:150", size: "540:660", poster: 6.2 });
  }

  // ── how the owner prepares it ───────────────────────────────────────────
  if (want("set")) {
    console.log("filming the setting up…");
    const owner = await person("صاحب المحل");
    const { error } = await admin.from("shops").insert({ owner_id: owner.id, name: "Café Pointili", kind: "cafe", color: "#6C47FF", goal: GOAL, gift: "قهوة بلاش", wheel_allowed: true, created_at: new Date(Date.now() - 9 * 86_400_000).toISOString() });
    if (error) throw error;
    const raw = await film("set", await cookiesFor(owner), async (p) => {
      await p.goto(`${BASE}/shop/wheel`, { waitUntil: "load", timeout: 90000 });
      await p.waitForTimeout(1200);
      const field = p.getByPlaceholder("زيد كادو");
      for (const name of PRIZES) {
        await field.click();
        await field.type(name, { delay: 110 });
        await p.waitForTimeout(260);
        await p.getByRole("button", { name: "زيد كادو" }).click();
        await p.waitForTimeout(520);
      }
      await p.waitForTimeout(500);
      const even = p.getByRole("button", { name: "قسّم بالتساوي" });
      if (await even.count()) {
        await even.click();
        await p.waitForTimeout(900);
      }
      await p.getByRole("button", { name: "سجّل" }).click();
      await p.waitForTimeout(1500);
      await p.getByLabel("خدّم الروليت للحرفاء").first().click({ timeout: 20000 });
      await p.waitForTimeout(2200);
    });
    // cut to the wheel, the prizes and the save button: the header and the foot carry nothing
    await cut(raw, "wheel-set-v1", { from: 2.4, length: 19.6, speed: 1.6, crop: "540:720:0:170", size: "540:720", poster: 5 });
  }
} finally {
  await browser.close();
  for (const id of made) await admin.auth.admin.deleteUser(id).catch(() => {});
  await unrobot(admin, phones);
  console.log("(accounts removed)");
}
