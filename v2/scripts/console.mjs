/**
 * The founder's console, on a screen.
 *
 * Fills the database with a believable handful of shops, owners, customers
 * and moments; signs a throwaway admin in; walks every console page at a few
 * desktop sizes; and says, for each one, whether anything spills sideways or
 * whether a Latin run has flipped inside the Arabic. Everything it made is
 * deleted at the end, even if a check fails.
 *
 *   node scripts/console.mjs            (from v2/, with the dev server on :3200)
 *   SIZE=1280x800 node scripts/console.mjs
 */
import { mkdirSync } from "node:fs";
import { config } from "dotenv";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const BASE = process.env.BASE || "http://localhost:3200";
const OUT = process.env.OUT || "shots/console";
mkdirSync(OUT, { recursive: true });
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const [W, H] = (process.env.SIZE || "1600x1000").split("x").map(Number);

const TAG = "zzdemo";
const made = { users: [], shops: [] };
const rnd = () => Math.random();
const pick = (a) => a[Math.floor(rnd() * a.length)];
const phoneNo = () => `9${String(Math.floor(rnd() * 1e7)).padStart(7, "0")}`;
const ago = (h) => new Date(Date.now() - h * 3600_000).toISOString();

const phones = [];
async function person(name, { admin = false } = {}) {
  // a robot: on the list before it exists, so the founder's console never shows it (scripts/robots.mjs)
  const phone = await robot(db, phoneNo());
  phones.push(phone);
  const { data, error } = await db.auth.admin.createUser({ email: `216${phone}@phone.pointidi.app`, password: `${TAG}-123456`, email_confirm: true, app_metadata: { phone: `+216${phone}` } });
  if (error) throw error;
  await db.from("people").upsert({ id: data.user.id, name, phone: `+216${phone}`, is_admin: admin });
  made.users.push(data.user.id);
  return { id: data.user.id, phone };
}

/* ── 1 · a database worth looking at ────────────────────────────────── */
const SHOPS = [
  ["قهوة الصباح", "cafe", 10, "قهوة بلاش", "#6C47FF"],
  ["حلاقة باب بحر", "barber", 8, "حلاقة بلاش", "#C2410C"],
  ["مخبزة النور", "bakery", 10, "كرواسون بلاش", "#15803D"],
  ["عصير الحومة", "juice", 6, "عصير بلاش", "#0E7490"],
  ["بيتزا سيتا", "pizza", 10, "بيتزا صغيرة بلاش", "#9D174D"],
  ["صالون ياسمين", "beauty", 8, "منيكير بلاش", "#8A6508"],
];
const NAMES = ["سامي", "أمين", "ياسمين", "كريم", "هاجر", "محمد علي", "نور", "أيوب", "سارة", "وليد", "فاطمة", "حاتم"];

console.log("· building a demo world");
const customers = [];
for (const n of NAMES) customers.push(await person(`${n}`));

for (const [i, [name, kind, goal, gift, color]] of SHOPS.entries()) {
  const owner = await person(`مولى ${name}`);
  const { data: shop, error } = await db.from("shops").insert({ owner_id: owner.id, name, kind, goal: i === 5 ? null : goal, gift: i === 5 ? null : gift, color, paused: i === 4 }).select("id").single();
  if (error) throw error;
  made.shops.push(shop.id);
  // a handful of customers each, some near the gift, some who already got one
  for (const c of customers.slice(0, 3 + Math.floor(rnd() * 7))) {
    const stamps = Math.floor(rnd() * (goal + 2));
    const gifts = stamps > goal ? 1 : 0;
    const { data: card } = await db.from("cards").insert({ shop_id: shop.id, user_id: c.id, stamps: Math.min(stamps, goal), gifts, goal, gift, last_at: ago(rnd() * 72) }).select("id").single();
    if (!card) continue;
    for (let k = 0; k < Math.min(stamps, 6); k++) await db.from("moments").insert({ shop_id: shop.id, card_id: card.id, kind: "stamp", created_at: ago(rnd() * 120) });
    if (gifts) await db.from("moments").insert({ shop_id: shop.id, card_id: card.id, kind: "gift", gift, given_at: ago(rnd() * 40), created_at: ago(rnd() * 48) });
  }
}

const boss = await person("Saif", { admin: true });
for (const ip of ["local", "::1", "127.0.0.1"])
  for (const key of [`join-ip:${ip}`, `login-ip:${ip}`]) {
    try { await db.rpc("forget_tries", { p_key: key }); } catch { /* the counter may not be there */ }
  }

/* ── 2 · walk it ────────────────────────────────────────────────────── */
// only ever delete what this run made, by id — never by a time window
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, locale: "ar-TN" });
const page = await ctx.newPage();
const problems = [];
page.on("pageerror", (e) => problems.push(`THROW ${e.message}`));
page.on("console", (m) => {
  const s = m.text();
  if (m.type() === "error" && !/favicon|404|Failed to load resource/i.test(s)) problems.push(`ERR ${s.slice(0, 140)}`);
});

/** A page is good when nothing spills sideways and no Latin run sits unisolated in the Arabic. */
async function check(name, url, wait = 1100) {
  await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(wait);
  await page.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((e) => (e.style.display = "none")));
  // every page must BE the console: the rail is there, and we were not bounced
  if (!page.url().includes("/admin")) throw new Error(`${name}: bounced to ${page.url()}`);
  if ((await page.locator("aside nav").count()) === 0) throw new Error(`${name}: no console rail on ${page.url()}`);
  const r = await page.evaluate(() => {
    const doc = document.documentElement;
    const wide = [];
    for (const el of document.querySelectorAll("main *")) {
      const b = el.getBoundingClientRect();
      if (b.width && (b.right > innerWidth + 1 || b.left < -1)) wide.push(`${el.tagName.toLowerCase()}.${(el.className || "").toString().split(" ")[0]}`);
    }
    // What actually reorders on screen: TWO OR MORE Latin runs with a neutral
    // between them inside an Arabic line — the runs swap places. One Latin
    // word among Arabic is laid out right by the browser, so it is no bug.
    // A line that opens on a neutral before Latin ("/wallet · …") is the
    // other one: the slash jumps to the far end.
    const loose = [];
    for (const el of document.querySelectorAll("main td, main dd, main p, main span, main b")) {
      if (el.children.length) continue;
      const txt = (el.textContent || "").trim();
      if (!/[؀-ۿ]/.test(txt)) continue;
      const runs = txt.match(/[A-Za-z][A-Za-z._-]*(?:[ ]+[A-Za-z][A-Za-z._-]*)*/g) || [];
      const opensNeutral = /^[/\.:#·+-]/.test(txt) && /[A-Za-z]/.test(txt);
      if (runs.length < 2 && !opensNeutral) continue;
      if (el.closest("bdi, .num, .lat, [dir='ltr']")) continue;
      loose.push(txt.slice(0, 44));
    }
    // the other way round: Arabic words sealed INSIDE a left-to-right box —
    // «4 أكتوبر 2026» comes out «أكتوبر 2026 4»
    const flipped = [];
    for (const el of document.querySelectorAll("main .num, main .lat, main [dir='ltr'], main [dir='ltr'] *")) {
      if (el.children.length) continue; // a chart row is LTR on purpose; its labels are what matter
      const txt = (el.textContent || "").trim();
      if (!/[؀-ۿ]{2}/.test(txt)) continue;
      if (getComputedStyle(el).direction !== "ltr") continue;
      flipped.push(txt.slice(0, 44));
    }
    return { scroll: doc.scrollWidth - doc.clientWidth, wide: [...new Set(wide)].slice(0, 5), loose: [...new Set(loose)].slice(0, 5), flipped: [...new Set(flipped)].slice(0, 5), title: document.title };
  });
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  const bad = r.scroll > 1 || r.wide.length || r.loose.length || r.flipped.length;
  console.log(`  ${bad ? "✗" : "✓"} ${name.padEnd(22)} ${r.scroll > 1 ? `spills ${r.scroll}px ` : ""}${r.wide.length ? `wide: ${r.wide.join(", ")} ` : ""}${r.loose.length ? `loose latin: ${r.loose.join(" | ")} ` : ""}${r.flipped.length ? `flipped: ${r.flipped.join(" | ")}` : ""}`);
  if (bad) problems.push(`${name}: ${JSON.stringify(r)}`);
}

try {
  await page.goto(`${BASE}/login?next=/admin`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="phone"]').fill(boss.phone);
  await page.locator('input[name="password"]').fill(`${TAG}-123456`);
  await page.locator('button[type="submit"]').click();
  // "/login?next=/admin" matches "**/admin**" too — wait for the console itself
  await page.locator("aside nav").first().waitFor({ timeout: 60000 });
  console.log(`· signed in, walking at ${W}×${H}`);

  await check("01-console", "/admin");
  await check("02-shops", "/admin/shops");
  const shopId = made.shops[0];
  await check("03-shop", `/admin/shops/${shopId}`);
  await check("04-people", "/admin/people");
  const { data: someone } = await db.from("cards").select("user_id").limit(1).single();
  await check("05-person", `/admin/people/${someone.user_id}`);
  for (const tab of ["overview", "pages", "sources", "visits", "heat"]) await check(`06-traffic-${tab}`, `/admin/traffic?all=1&tab=${tab}`);
  await check("07-news", "/admin/news");
  await check("08-news-new", "/admin/news?new=1");
  await check("09-settings", "/admin/settings");
} finally {
  await browser.close();
  console.log("· cleaning up");
  for (const id of made.shops) await db.from("shops").delete().eq("id", id);
  for (const id of made.users) await db.auth.admin.deleteUser(id).catch(() => {});
  await unrobot(db, phones);
}

console.log(problems.length ? `\n${problems.length} problem(s):\n` + problems.map((p) => "  · " + p).join("\n") : "\nno problems");
process.exit(problems.length ? 1 : 0);
