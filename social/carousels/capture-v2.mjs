/**
 * Real Pointili v2 screens for the posts, full phone size (1170×2532), into screens/v2-*.png.
 * Three throwaway shops (a café, a snack, a clothes shop) and their customers, all robots
 * (scripts/robots.mjs: never in the founder's console, never in his Telegram), deleted at the end.
 *
 *   cd v2 && node ../social/carousels/capture-v2.mjs            (BASE= defaults to the live site)
 *   … --only cafe,food,store                                    → just those shops' screens
 */
import { createRequire } from "node:module";
import path from "node:path";
import { chromium } from "playwright-core";
import { robot, unrobot } from "../../v2/scripts/robots.mjs";

const V2 = path.join(import.meta.dirname, "..", "..", "v2");
const require = createRequire(path.join(V2, "package.json"));
require("dotenv").config({ path: path.join(V2, ".env.local"), quiet: true });
const { createClient } = require("@supabase/supabase-js");
const BASE = process.env.BASE || "https://www.pointili.online";
const OUT = path.join(import.meta.dirname, "screens");
const only = (process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : "cafe,food,store").split(",");
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const PASS = "posts-v2-2026";
const NOTES = ["card_hello", "coach", "logo_tip", "offer", "push", "fix_tip", "install", "pwa", "tip_counter", "counter_tip", "wheel_hello", "store_hello"];
const ago = (ms) => new Date(Date.now() - ms).toISOString();
const DAY = 86_400_000;
const made = [], phones = [];

async function person(name) {
  const d = await robot(admin, `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`);
  phones.push(d);
  const { data, error } = await admin.auth.admin.createUser({ email: `216${d}@phone.pointidi.app`, password: PASS, email_confirm: true, app_metadata: { phone: `+216${d}` } });
  if (error) throw error;
  made.push(data.user.id);
  await admin.from("people").upsert({ id: data.user.id, name, phone: `+216${d}`, seen: NOTES });
  const { data: row } = await admin.from("people").select("code").eq("id", data.user.id).single();
  return { id: data.user.id, digits: d, code: row.code };
}
async function shopOf(owner, s) {
  const { data, error } = await admin.from("shops").insert({ owner_id: owner.id, created_at: ago(40 * DAY), paid_until: new Date(Date.now() + 300 * DAY).toISOString(), ...s }).select("*").single();
  if (error) throw error;
  const { data: live } = await admin.from("news").select("id").eq("active", true);
  if (live?.length) await admin.from("news_views").insert(live.map((n) => ({ news_id: n.id, person_id: owner.id })));
  return data;
}
/** a card with `stamps` on it, the last one days ago, and `vouchers` gifts waiting */
async function card(shop, who, stamps, vouchers = 0) {
  const { data: c, error } = await admin.from("cards").insert({ shop_id: shop.id, user_id: who.id, stamps, goal: shop.goal, gift: shop.gift, last_at: ago(2 * DAY) }).select("id").single();
  if (error) throw error;
  const rows = Array.from({ length: stamps + vouchers * shop.goal }, (_, i) => ({ shop_id: shop.id, card_id: c.id, kind: "stamp", gift: null, banked: false, created_at: ago((i + 3) * 20 * 3_600_000) }));
  for (let v = 0; v < vouchers; v++) rows.push({ shop_id: shop.id, card_id: c.id, kind: "gift", gift: shop.gift, banked: true, created_at: ago((v + 2) * DAY) });
  if (rows.length) { const { error: e } = await admin.from("moments").insert(rows); if (e) throw e; }
  if (vouchers) await admin.from("cards").update({ gifts: vouchers }).eq("id", c.id);
  return c.id;
}
async function setCard(id, patch) { await admin.from("cards").update(patch).eq("id", id); }

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: "ar-TN" };
async function signIn(who) {
  const page = await (await browser.newContext(phone)).newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "load", timeout: 90000 });
  await page.locator('input[name="phone"]').fill(who.digits);
  await page.locator('input[name="password"]').fill(PASS);
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 90000 }), page.locator('button[type="submit"]').click()]);
  return page;
}
async function shot(page, name, wait = 900) {
  await page.waitForTimeout(wait);
  await page.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((e) => (e.style.display = "none")));
  await page.screenshot({ path: path.join(OUT, `v2-${name}.png`) });
  console.log(`  ✓ v2-${name}.png  (${page.url().replace(BASE, "")})`);
}
const readQr = async (page) => {
  await page.addScriptTag({ path: path.join(V2, "node_modules/jsqr/dist/jsQR.js") });
  return page.evaluate(async () => {
    const svg = document.querySelector("[data-qr] svg").outerHTML;
    const img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    await img.decode();
    const c = document.createElement("canvas");
    c.width = c.height = 600;
    const g = c.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, 600, 600); g.drawImage(img, 40, 40, 520, 520);
    return window.jsQR(g.getImageData(0, 0, 600, 600).data, 600, 600)?.data ?? null;
  });
};

try {
  for (const ip of ["local", "::1", "127.0.0.1"]) await admin.rpc("forget_tries", { p_key: `login-ip:${ip}` });

  if (only.includes("cafe")) {
    // ── a café: a regular on his way, then close, then the card full and the gift waiting ──
    const o = await person("كريم");
    const shop = await shopOf(o, { name: "Café El Medina", kind: "cafe", goal: 8, gift: "قهوة بلاش", color: "#6C47FF" });
    const amine = await person("أمين");
    const id = await card(shop, amine, 5);
    const c = await signIn(amine);
    await c.goto(`${BASE}/c/${id}`, { waitUntil: "load" }); await shot(c, "cafe-card-5", 1500);
    await setCard(id, { stamps: 6 });
    await c.reload({ waitUntil: "load" }); await shot(c, "cafe-card-6", 1500);
    await setCard(id, { stamps: 7 });
    await c.reload({ waitUntil: "load" }); await shot(c, "cafe-card-7", 1500);
    await c.goto(`${BASE}/`, { waitUntil: "load" }); await shot(c, "cafe-home", 1500);
  }

  if (only.includes("food")) {
    // ── a snack: the counter's code, a customer scans it, his card ──
    const o = await person("نزار");
    const shop = await shopOf(o, { name: "Snack El Bahja", kind: "fastfood", goal: 10, gift: "ساندويتش بلاش", color: "#E5484D" });
    const yassine = await person("ياسين");
    const id = await card(shop, yassine, 6);
    const op = await signIn(o);
    await op.goto(`${BASE}/shop`, { waitUntil: "load" }); await shot(op, "food-owner-home", 2000);
    await op.goto(`${BASE}/shop/qr`, { waitUntil: "load" });
    await op.locator("[data-qr]").waitFor({ timeout: 30000 });
    await shot(op, "food-counter", 2000);
    const url = await readQr(op);
    if (!url) throw new Error("could not read the counter's code");
    const c = await signIn(yassine);
    await c.goto(BASE + new URL(url).pathname, { waitUntil: "load" });
    await shot(c, "food-stamped", 3500);
    await shot(op, "food-counter-after", 500);
    await c.goto(`${BASE}/c/${id}`, { waitUntil: "load" }); await shot(c, "food-card", 1500);
  }

  if (only.includes("store")) {
    // ── a clothes shop: two gifts waiting while the card starts again ──
    const o = await person("سنية");
    const shop = await shopOf(o, { name: "Maison Lina", kind: "clothes", goal: 5, gift: "10 دينارات على الشرية", color: "#0F766E" });
    const sarra = await person("سارة");
    const id = await card(shop, sarra, 1, 2);
    const c = await signIn(sarra);
    await c.goto(`${BASE}/`, { waitUntil: "load" }); await shot(c, "store-home", 1800);
    await c.goto(`${BASE}/c/${id}`, { waitUntil: "load" }); await shot(c, "store-card", 1800);
    await c.goto(`${BASE}/`, { waitUntil: "load" });
    const open = c.getByRole("button", { name: /كادو|كادوات/ }).first();
    if (await open.count()) { await open.click(); await c.getByRole("dialog").waitFor({ timeout: 15000 }).catch(() => {}); await shot(c, "store-gift-code", 1200); }
    const op = await signIn(o);
    await op.goto(`${BASE}/shop/collect?by=code`, { waitUntil: "load" });
    await op.getByRole("textbox").fill(sarra.code);
    await op.getByRole("dialog").waitFor({ timeout: 20000 }).catch(() => {});
    await shot(op, "store-owner-give", 1500);
  }
} finally {
  await browser.close();
  for (const id of made) {
    await admin.from("shops").delete().eq("owner_id", id);
    await admin.auth.admin.deleteUser(id);
  }
  await unrobot(admin, phones);
  console.log(`cleaned ${made.length} accounts`);
}
