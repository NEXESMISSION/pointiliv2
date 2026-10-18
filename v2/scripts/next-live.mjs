/**
 * The new customer home keeps itself: a tampon landing at a counter shows up
 * on a phone that is already open, with nobody pulling the page down.
 *
 * It proves the whole chain, not a piece of it: a moment written to the
 * database fires public.ping_counter, which sends on «pointili:p:<person>»,
 * which components/next/Live hears, which asks the server again. The page is
 * never reloaded by the test — if the number changes, it changed by itself.
 *
 * Then it proves the fallback: with the radio cut (offline), coming back to
 * the tab looks again anyway.
 *
 *   node scripts/next-live.mjs        (from v2/, with the dev server on :3200)
 */
import { mkdirSync } from "node:fs";
import { config } from "dotenv";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const BASE = process.env.BASE || "http://localhost:3200";
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = ".e2e/next-live";
mkdirSync(OUT, { recursive: true });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const PASS = "next-live-2026";
const ALL_NOTES = ["card_hello", "coach", "logo_tip", "offer", "push", "install", "first_scan", "first_gift", "mission"];
const made = [];
const phones = [];
let passed = 0;
const failed = [];
const check = (name, ok, detail) => {
  if (ok) (passed++, console.log(`  ok   ${name}`));
  else (failed.push(name), console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`));
};

for (const ip of ["local", "::1", "127.0.0.1"]) for (const key of [`join-ip:${ip}`, `login-ip:${ip}`]) await admin.rpc("forget_tries", { p_key: key });

const phoneNo = () => `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
async function person(name) {
  const d = await robot(admin, phoneNo());
  phones.push(d);
  const { data, error } = await admin.auth.admin.createUser({ email: `216${d}@phone.pointidi.app`, password: PASS, email_confirm: true, app_metadata: { phone: `+216${d}` } });
  if (error) throw error;
  made.push(data.user.id);
  await admin.from("people").upsert({ id: data.user.id, name, phone: `+216${d}`, seen: ALL_NOTES });
  return { id: data.user.id, digits: d, name };
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
let shopId = null;
try {
  const owner = await person("مولى المحل");
  const customer = await person("نور");
  const { data: shop } = await admin
    .from("shops")
    .insert({ owner_id: owner.id, name: "قهوة التجربة", kind: "cafe", goal: 8, gift: "قهوة بلاش", color: "#6C47FF" })
    .select()
    .single();
  shopId = shop.id;
  const { data: card } = await admin.from("cards").insert({ shop_id: shop.id, user_id: customer.id, goal: 8, gift: "قهوة بلاش", stamps: 3 }).select().single();

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "ar-TN" });
  const page = await ctx.newPage();
  await page.addStyleTag?.({ content: "nextjs-portal{display:none!important}" }).catch(() => {});
  await page.goto(`${BASE}/login`, { waitUntil: "load", timeout: 90000 });
  await page.locator('input[name="phone"]').fill(customer.digits);
  await page.locator('input[name="password"]').fill(PASS);
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 90000 }), page.locator('button[type="submit"]').click()]);
  await page.goto(`${BASE}/next`, { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(2500); // the radio subscribes
  const reloads = { n: 0 };
  page.on("load", () => (reloads.n += 1));

  const shown = async () => (await page.locator("body").innerText()).replace(/\s+/g, " ");
  check("the card is on screen at 3", /3\s*\/\s*8/.test(await shown()), (await shown()).slice(0, 80));

  // the counter gives a tampon: the card moves, and the moment pings the person
  await admin.from("cards").update({ stamps: 4, last_at: new Date().toISOString() }).eq("id", card.id);
  await admin.from("moments").insert({ shop_id: shop.id, card_id: card.id, kind: "stamp" });

  let live = false;
  for (let i = 0; i < 20 && !live; i++) {
    await page.waitForTimeout(500);
    live = /4\s*\/\s*8/.test(await shown());
  }
  check("it says 4 without the page being reloaded", live);
  check("  → and nothing reloaded it", reloads.n === 0, `${reloads.n} reload(s)`);
  await page.screenshot({ path: `${OUT}/after-the-ping.png` });

  // the fallback: radio cut, the page still looks again when it comes back
  await ctx.setOffline(true);
  await admin.from("cards").update({ stamps: 5 }).eq("id", card.id);
  await admin.from("moments").insert({ shop_id: shop.id, card_id: card.id, kind: "stamp" });
  await page.waitForTimeout(1500);
  await ctx.setOffline(false);
  await page.evaluate(() => {
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
  });
  let back = false;
  for (let i = 0; i < 20 && !back; i++) {
    await page.waitForTimeout(500);
    back = /5\s*\/\s*8/.test(await shown());
  }
  check("coming back to the tab looks again", back);
  check("  → still no reload", reloads.n === 0, `${reloads.n} reload(s)`);
} finally {
  await browser.close();
  if (shopId) await admin.from("shops").delete().eq("id", shopId);
  for (const id of made) await admin.auth.admin.deleteUser(id).catch(() => {});
  for (const d of phones) await unrobot(admin, d).catch(() => {});
  console.log(`\n${failed.length ? `${failed.length} failed` : `all ${passed} ok`}`);
  process.exit(failed.length ? 1 : 0);
}
