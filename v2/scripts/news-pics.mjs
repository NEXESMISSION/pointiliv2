/**
 * The pictures of the news slides: real screens of Pointili, the place to tap
 * lit up (the rest dimmed, a coral ring around it), cut to what the slide
 * talks about, into public/news/*.webp. Made on throwaway accounts, deleted
 * at the end.
 *
 *   node scripts/news-pics.mjs      (from v2/, dev server on :3200 — or BASE=)
 */
import { mkdirSync } from "node:fs";
import { config } from "dotenv";
import sharp from "sharp";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const BASE = process.env.BASE || "http://localhost:3200";
const OUT = "public/news";
mkdirSync(OUT, { recursive: true });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
for (const ip of ["local", "::1", "127.0.0.1"]) await admin.rpc("forget_tries", { p_key: `login-ip:${ip}` });
const PASS = "news-pics-2026";
const NOTES = ["card_hello", "coach", "logo_tip", "offer"];
const ago = (ms) => new Date(Date.now() - ms).toISOString();
const made = [];

const phones = [];
async function person(name) {
  // a robot: on the list before it exists, so the founder's console never shows it (scripts/robots.mjs)
  const d = await robot(admin, `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`);
  phones.push(d);
  const { data, error } = await admin.auth.admin.createUser({ email: `216${d}@phone.pointidi.app`, password: PASS, email_confirm: true, app_metadata: { phone: `+216${d}` } });
  if (error) throw error;
  made.push(data.user.id);
  await admin.from("people").upsert({ id: data.user.id, name, phone: `+216${d}`, seen: NOTES });
  const { data: row } = await admin.from("people").select("code").eq("id", data.user.id).single();
  return { id: data.user.id, digits: d, code: row.code };
}

// a café with its regulars: one with a gift waiting, others on their way
const owner = await person("سامي");
const { data: shop } = await admin.from("shops").insert({ owner_id: owner.id, name: "Café Yasmine", kind: "cafe", goal: 8, gift: "قهوة بلاش", color: "#6C47FF", created_at: ago(30 * 86_400_000), paid_until: new Date(Date.now() + 300 * 86_400_000).toISOString() }).select("*").single();
async function card(who, stamps, gift = false) {
  const { data: c } = await admin.from("cards").insert({ shop_id: shop.id, user_id: who.id, stamps, goal: 8, gift: "قهوة بلاش", last_at: ago(3 * 3_600_000) }).select("id").single();
  const rows = Array.from({ length: stamps }, (_, i) => ({ shop_id: shop.id, card_id: c.id, kind: "stamp", created_at: ago((i + 3) * 26 * 3_600_000) }));
  if (gift) rows.push({ shop_id: shop.id, card_id: c.id, kind: "gift", gift: "قهوة بلاش", created_at: ago(2 * 3_600_000) });
  await admin.from("moments").insert(rows);
}
const nour = await person("نور");
await card(nour, 8, true);
const regulars = [];
for (const [i, n] of ["أمين", "سلمى", "يوسف", "مريم"].entries()) {
  const p = await person(n);
  regulars.push(p);
  await card(p, [5, 3, 6, 2][i]);
}

// the news already out: seen by this owner, so nothing covers the home
const { data: live } = await admin.from("news").select("id").eq("active", true);
if (live?.length) await admin.from("news_views").insert(live.map((n) => ({ news_id: n.id, person_id: owner.id })));

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ar-TN" };
async function signIn(who) {
  const ctx = await browser.newContext(phone);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "load", timeout: 90000 });
  await page.locator('input[name="phone"]').fill(who.digits);
  await page.locator('input[name="password"]').fill(PASS);
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 90000 }), page.locator('button[type="submit"]').click()]);
  return page;
}

/** dim the screen but this, ring it, and put a tap on it */
async function spot(page, locator, { pad = 8, radius = 22, tap = false } = {}) {
  const box = await locator.boundingBox();
  await page.evaluate(
    ({ box, pad, radius, tap }) => {
      const ring = document.createElement("div");
      Object.assign(ring.style, {
        position: "fixed",
        left: `${box.x - pad}px`,
        top: `${box.y - pad}px`,
        width: `${box.width + 2 * pad}px`,
        height: `${box.height + 2 * pad}px`,
        borderRadius: `${radius}px`,
        boxShadow: "0 0 0 9999px rgba(20,16,40,0.38)",
        outline: "3px solid #ff6b4a",
        zIndex: "99998",
        pointerEvents: "none",
      });
      document.body.appendChild(ring);
      if (!tap) return;
      const dot = document.createElement("div");
      Object.assign(dot.style, {
        position: "fixed",
        left: `${box.x + box.width / 2 - 16}px`,
        top: `${box.y + box.height / 2 - 16}px`,
        width: "32px",
        height: "32px",
        borderRadius: "50%",
        background: "rgba(255,107,74,0.92)",
        border: "3px solid #fff",
        boxShadow: "0 0 0 10px rgba(255,107,74,0.28), 0 10px 20px rgba(0,0,0,0.25)",
        zIndex: "99999",
        pointerEvents: "none",
      });
      document.body.appendChild(dot);
    },
    { box, pad, radius, tap },
  );
  return box;
}

/** a slice of the screen around a box (or the given top), saved as a slide's picture */
async function save(page, name, { around, top, height = 320 } = {}) {
  await page.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((e) => (e.style.display = "none")));
  await page.waitForTimeout(400);
  const H = 844;
  const y = top ?? Math.round(Math.min(Math.max((around ? around.y + around.height / 2 : H / 2) - height / 2, 0), H - height));
  const png = await page.screenshot({ clip: { x: 0, y, width: 390, height } });
  await sharp(png).resize({ width: 720 }).webp({ quality: 84 }).toFile(`${OUT}/${name}.webp`);
  console.log(`  ✓ ${name}.webp`);
}

try {
  // ── the customer: the gift's code ──
  const c = await signIn(nour);
  await c.goto(`${BASE}/`, { waitUntil: "load" });
  await c.getByRole("button", { name: /عندك كادو يستنّى فيك/ }).waitFor({ timeout: 30000 });
  await c.reload({ waitUntil: "load" });
  await c.getByRole("button", { name: /عندك كادو يستنّى فيك/ }).click();
  const sheet = c.getByRole("dialog");
  await sheet.waitFor({ timeout: 20000 });
  await c.waitForTimeout(700);
  const sb = await sheet.locator(":scope > div").boundingBox();
  // from the title down: the sheet's handle and its ✕ stay out of the picture
  await save(c, "gift-code", { top: Math.round(sb.y) + 46, height: 350 });

  // ── the owner: the camera, the gift's question ──
  const o = await signIn(owner);
  await o.goto(`${BASE}/shop`, { waitUntil: "load" });
  const scanTile = o.getByRole("link", { name: "سكاني الكود متاع الحريف" });
  await scanTile.waitFor({ timeout: 30000 });
  await o.waitForTimeout(1200);
  await save(o, "gift-scan", { around: await spot(o, scanTile, { radius: 28 }), height: 330 });

  await o.goto(`${BASE}/shop/collect?by=code`, { waitUntil: "load" });
  await o.getByRole("textbox").fill(nour.code);
  const give = o.getByRole("button", { name: "إيه، عطيه الكادو" });
  await give.waitFor({ timeout: 20000 });
  await o.waitForTimeout(800);
  const ask = await o.getByRole("dialog").locator(":scope > div").boundingBox();
  await save(o, "gift-ask", { top: Math.max(0, Math.round(ask.y) - 10), height: Math.min(400, 844 - Math.max(0, Math.round(ask.y) - 10)) });

  // the code typed: who it is, and the tampon
  await o.goto(`${BASE}/shop/collect?by=code`, { waitUntil: "load" });
  await o.getByRole("textbox").fill(regulars[0].code);
  await o.getByRole("button", { name: /زيد تامبون لـ/ }).waitFor({ timeout: 20000 });
  await o.waitForTimeout(700);
  const input = await o.getByRole("textbox").boundingBox();
  await save(o, "scan-code", { top: Math.max(0, Math.round(input.y) - 60), height: 340 });

  // the counter's code
  await o.goto(`${BASE}/shop/qr`, { waitUntil: "load" });
  await o.locator("[data-qr] svg").waitFor({ timeout: 30000 });
  await o.waitForTimeout(1200);
  const qr = await o.locator("[data-qr]").boundingBox();
  await save(o, "counter-qr", { around: qr, height: 360 });

  // the card: how long between two tampons
  await o.goto(`${BASE}/shop/card`, { waitUntil: "load" });
  for (let n = 0; n < 2; n++) await o.getByRole("button", { name: "كمّل", exact: true }).click();
  const day = o.getByRole("button", { name: "مرّة في النهار" });
  await day.waitFor({ timeout: 20000 });
  await day.click();
  await o.waitForTimeout(700);
  const chips = day.locator("..");
  await save(o, "wait-choose", { around: await spot(o, chips, { radius: 24, tap: false }), height: 330 });

  // a change of card: what happens to the customers on their way
  await o.goto(`${BASE}/shop/card`, { waitUntil: "load" });
  await o.getByRole("button", { name: "10", exact: true }).click();
  for (let n = 0; n < 4; n++) await o.getByRole("button", { name: "كمّل", exact: true }).click();
  await o.getByRole("button", { name: "سجّل" }).click();
  await o.getByText("يكمّلو كارطهم القديمة").waitFor({ timeout: 20000 });
  await o.waitForTimeout(800);
  const change = await o.getByRole("dialog").locator(":scope > div").boundingBox();
  const top = Math.max(0, Math.round(change.y));
  await save(o, "card-change", { top, height: Math.min(470, 844 - top) });
} finally {
  await browser.close();
  for (const id of made) {
    await admin.from("shops").delete().eq("owner_id", id);
    await admin.auth.admin.deleteUser(id);
  }
  await unrobot(admin, phones);
}
