/**
 * What a card has to say before the customer finds out the hard way.
 *
 * Three cards, three things that used to be invisible:
 *  - a shop the founder stopped: the card said nothing, the scan failed, and
 *    the app looked broken when it was the shop that stopped;
 *  - a tampon taken a moment ago: the wait between two was met only as a
 *    refusal after scanning, never before;
 *  - and the ordinary one, which must keep saying what it always said.
 *
 *   node scripts/next-says.mjs        (from v2/, with the dev server on :3200)
 */
import { mkdirSync } from "node:fs";
import { config } from "dotenv";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const BASE = process.env.BASE || "http://localhost:3200";
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = ".e2e/next-says";
mkdirSync(OUT, { recursive: true });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const PASS = "next-says-2026";
const ALL_NOTES = ["card_hello", "coach", "logo_tip", "offer", "push", "install", "first_scan", "first_gift", "mission"];
const made = [];
const phones = [];
const shops = [];
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
async function shopWith(owner, name, fields) {
  const { data, error } = await admin.from("shops").insert({ owner_id: owner.id, name, kind: "cafe", goal: 8, gift: "قهوة بلاش", color: "#6C47FF", ...fields }).select().single();
  if (error) throw error;
  shops.push(data.id);
  return data;
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
try {
  const customer = await person("نور");
  // one shop to an owner (shops_owner_id_key), so three shops means three owners
  const stopped = await shopWith(await person("مولى ١"), "محل موقّف", { paused: true });
  const soon = await shopWith(await person("مولى ٢"), "محل قريب", { stamp_gap: 60 });
  const plain = await shopWith(await person("مولى ٣"), "محل عادي", { stamp_gap: 60 });
  await admin.from("cards").insert([
    { shop_id: stopped.id, user_id: customer.id, goal: 8, gift: "قهوة بلاش", stamps: 2 },
    // a tampon five minutes ago, on a shop that gives one an hour: another cannot land yet
    { shop_id: soon.id, user_id: customer.id, goal: 8, gift: "قهوة بلاش", stamps: 3, last_at: new Date(Date.now() - 5 * 60_000).toISOString() },
    // long ago: nothing in the way
    { shop_id: plain.id, user_id: customer.id, goal: 8, gift: "قهوة بلاش", stamps: 4, last_at: new Date(Date.now() - 5 * 3_600_000).toISOString() },
  ]);

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "ar-TN" });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "load", timeout: 90000 });
  await page.locator('input[name="phone"]').fill(customer.digits);
  await page.locator('input[name="password"]').fill(PASS);
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 90000 }), page.locator('button[type="submit"]').click()]);
  await page.goto(`${BASE}/next`, { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(1500); // the clock is read after mounting
  const text = (await page.locator("body").innerText()).replace(/\s+/g, " ");

  check("a stopped shop says it is stopped", text.includes("المحل موقّف توّا"), text.slice(0, 120));
  check("a tampon too soon says when the next one can land", /تامبون جديد/.test(text), text.slice(0, 120));
  check("  → and says a time, not just «soon»", /تامبون جديد\s+\S+/.test(text));
  check("the ordinary card still says what is left", /مازالولك \d+ على/.test(text));
  await page.screenshot({ path: `${OUT}/what-a-card-says.png` });
} catch (e) {
  failed.push("the run itself");
  console.error(`
  the run broke: ${e?.stack || JSON.stringify(e)}`);
} finally {
  await browser.close();
  for (const id of shops) await admin.from("shops").delete().eq("id", id);
  for (const id of made) await admin.auth.admin.deleteUser(id).catch(() => {});
  for (const d of phones) await unrobot(admin, d).catch(() => {});
  console.log(`\n${failed.length ? `${failed.length} failed` : `all ${passed} ok`}`);
  process.exit(failed.length ? 1 : 0);
}
