/**
 * A gift, from won to handed over, in two phones. The customer's card says
 * «الكادو متاعك حاضر!» and opens its code whole (the QR, the 6 digits, dark on
 * light) — from the card and from the wallet. The owner's home has no gift
 * row: one way to hand a gift over, «سكاني». The code read there brings the
 * question up, and «إيه، عطيه الكادو» hands it over. Pictures land in
 * v2/shots/gift.
 *
 *   node scripts/gift.mjs        (from v2/, with the dev server on :3200)
 */
import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { config } from "dotenv";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const BASE = process.env.BASE || "http://localhost:3200";
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
for (const ip of ["local", "::1", "127.0.0.1"]) await admin.rpc("forget_tries", { p_key: `login-ip:${ip}` });
const NOTES = ["card_hello", "coach", "logo_tip", "offer"];
const password = randomBytes(9).toString("base64url");
const made = [], phones = [];
mkdirSync("shots/gift", { recursive: true });
let bad = 0;
const check = (name, ok, extra) => { if (!ok) bad++; console.log(`${ok ? "  ok " : "  BAD"} ${name}${ok || extra === undefined ? "" : " · " + JSON.stringify(extra)}`); };

async function person(name) {
  const d = await robot(admin, `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`);
  phones.push(d);
  const email = `216${d}@phone.pointidi.app`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { phone: `+216${d}` } });
  if (error) throw error;
  made.push(data.user.id);
  await admin.from("people").upsert({ id: data.user.id, name, phone: `+216${d}`, seen: NOTES });
  const as = createClient(URL_, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { error: e2 } = await as.auth.signInWithPassword({ email, password });
  if (e2) throw e2;
  return { id: data.user.id, digits: d, rpc: async (fn, args) => (await as.rpc(fn, args)).data };
}
async function signIn(ctx, who) {
  const p = await ctx.newPage();
  await p.goto(BASE + "/login", { waitUntil: "load" });
  await p.locator('input[name="phone"]').fill(who.digits);
  await p.locator('input[name="password"]').fill(password);
  await Promise.all([p.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60000 }), p.locator('button[type="submit"]').click()]);
  return p;
}
const quiet = (p) => p.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {});

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
try {
  const owner = await person("Robot owner");
  const { data: shop } = await admin.from("shops").insert({ owner_id: owner.id, name: "Robot glace", kind: "juice", color: "#E0457B", goal: 3, gift: "جلاطي بلاش", stamp_gap: 0, paid_until: new Date(Date.now() + 9e9).toISOString() }).select("*").single();
  const client = await person("Saif");
  const code = (await client.rpc("me"))?.code;
  check("the customer has a code", /^\d{6}$/.test(String(code)), code);
  let last = null;
  for (let i = 0; i < 3; i++) last = await owner.rpc("give_stamp", { p_who: code });
  check("three tampons by the code: the gift waits", last?.ok && last.gift === true && !!last.waiting?.id, last);
  const { data: card } = await admin.from("cards").select("id").eq("shop_id", shop.id).eq("user_id", client.id).single();

  for (const size of [{ width: 390, height: 844 }, { width: 360, height: 640 }]) {
    const tag = `${size.width}x${size.height}`;
    const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ar-TN" });
    const p = await signIn(ctx, client);
    // the customer's card: the gift box, then its code
    await p.goto(`${BASE}/c/${card.id}`, { waitUntil: "load" });
    await quiet(p);
    await p.waitForTimeout(900);
    await p.screenshot({ path: `shots/gift/client-card-${tag}.png` });
    await p.getByRole("button", { name: /ورّي الكود/ }).click();
    const sheet = p.getByRole("dialog");
    await sheet.waitFor({ timeout: 10000 });
    await p.waitForTimeout(700);
    const m = await p.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      const svg = d.querySelector("div.aspect-square svg");
      const digits = d.querySelector("p.num");
      const r = svg?.getBoundingClientRect();
      const panel = d.firstElementChild.getBoundingClientRect();
      return {
        onBody: d.parentElement === document.body,
        qr: r ? { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) } : null,
        digits: digits?.textContent?.trim(),
        digitsColor: digits ? getComputedStyle(digits).color : null,
        panel: { top: Math.round(panel.top), bottom: Math.round(panel.bottom), w: Math.round(panel.width) },
        vw: innerWidth,
        vh: innerHeight,
      };
    });
    await p.screenshot({ path: `shots/gift/client-code-${tag}.png` });
    check(`[${tag}] the code sheet sits on the page's body, as wide as the screen`, m.onBody && m.panel.w >= Math.min(m.vw, 448) - 1 && m.panel.bottom <= m.vh + 1, m.panel);
    check(`[${tag}] the QR is whole and big enough to read`, !!m.qr && m.qr.w >= 170 && Math.abs(m.qr.w - m.qr.h) <= 2 && m.qr.left >= 0 && m.qr.right <= m.vw && m.qr.top >= 0 && m.qr.bottom <= m.vh, m.qr);
    check(`[${tag}] the 6 digits are there, dark on light`, m.digits?.replace(/\s/g, "") === code && /rgb\(\s*(\d+)/.test(m.digitsColor) && Number(m.digitsColor.match(/rgb\(\s*(\d+)/)[1]) < 90, [m.digits, m.digitsColor]);
    await p.keyboard.press("Escape");
    // the wallet: the same sheet from the gift's banner
    await p.goto(BASE + "/", { waitUntil: "load" });
    await quiet(p);
    await p.waitForTimeout(700);
    await p.screenshot({ path: `shots/gift/client-wallet-${tag}.png` });
    await p.getByRole("button", { name: /ورّي الكود/ }).click();
    await p.getByRole("dialog").waitFor({ timeout: 10000 });
    await p.waitForTimeout(600);
    const w = await p.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      const r = d.querySelector("div.aspect-square")?.getBoundingClientRect();
      return { onBody: d.parentElement === document.body, w: Math.round(r?.width ?? 0), bottom: Math.round(r?.bottom ?? 0), vh: innerHeight };
    });
    await p.screenshot({ path: `shots/gift/client-wallet-code-${tag}.png` });
    check(`[${tag}] from the wallet too: the sheet whole`, w.onBody && w.w >= 170 && w.bottom <= w.vh, w);
    await ctx.close();
  }

  // the owner: no gift row at home, one «سكاني»; the code brings the question up
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ar-TN" });
  const p = await signIn(ctx, owner);
  await p.goto(BASE + "/shop", { waitUntil: "load" });
  await quiet(p);
  await p.waitForTimeout(900);
  await p.screenshot({ path: "shots/gift/owner-home.png" });
  const home = await p.evaluate(() => ({ scans: document.querySelectorAll('a[href="/shop/collect?by=scan"]').length, lately: [...document.querySelectorAll("section li")].map((li) => li.textContent.replace(/\s+/g, " ").trim()).slice(0, 4) }));
  check("the owner's home: one «سكاني», no gift row", home.scans === 1, home);
  check("…who won stays in «who came lately»", home.lately.some((l) => l.includes("ربح") && l.includes("جلاطي بلاش")), home.lately);
  await p.locator('a[href="/shop/collect?by=scan"]').click();
  await p.waitForURL((u) => u.pathname === "/shop/collect", { timeout: 20000 });
  await p.waitForTimeout(1200);
  await quiet(p);
  await p.screenshot({ path: "shots/gift/owner-scan.png" });
  // no camera here: the code typed does what the camera's read does
  await p.getByRole("button", { name: /اكتب الكود/ }).first().click();
  await p.locator('input[inputmode="numeric"]').fill(code);
  const pop = p.getByRole("dialog");
  await pop.waitFor({ timeout: 15000 });
  await p.waitForTimeout(700);
  await p.screenshot({ path: "shots/gift/owner-question.png" });
  const asked = (await pop.textContent()).replace(/\s+/g, " ");
  check("the question: who, which gift, give it now?", asked.includes("Saif") && asked.includes("جلاطي بلاش") && asked.includes("تعطيهولو توّا؟"), asked);
  await pop.getByRole("button", { name: "إيه، عطيه الكادو" }).click();
  await p.getByText(/Saif خذا جلاطي بلاش/).waitFor({ timeout: 15000 });
  await p.waitForTimeout(600);
  await p.screenshot({ path: "shots/gift/owner-handed.png" });
  const { data: gifts } = await admin.from("moments").select("given_at").eq("card_id", card.id).eq("kind", "gift");
  check("handed over in the database", gifts.length === 1 && !!gifts[0].given_at, gifts);
  await ctx.close();
} finally {
  await browser.close();
  for (const id of made) { await admin.from("shops").delete().eq("owner_id", id); await admin.auth.admin.deleteUser(id); }
  await unrobot(admin, phones);
}
console.log(bad ? `\n${bad} BAD` : "\nall good");
process.exit(bad ? 1 : 0);
