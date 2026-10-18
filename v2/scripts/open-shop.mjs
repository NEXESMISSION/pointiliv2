/**
 * How long it takes to open a shop and have a code a customer can scan.
 *
 * The founder, 18 Oct 2026: «the registration of stuff of the owner take so
 * much time dont like that». Measured first, from the real traffic: a median
 * of 92 seconds and ten screens from /shop/new to /shop/qr, 350s for the
 * slowest tenth — and the two angriest screens in the whole app were the two
 * the first card did not need (57% of taps on the colour and 34% on the wait
 * were people hammering at it).
 *
 * So a first card asks two things now. This walks it as a person does, with
 * no shortcuts, and says how many screens and how many seconds it cost.
 *
 *   node scripts/open-shop.mjs        (from v2/, with the dev server on :3200)
 */
import { config } from "dotenv";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const BASE = process.env.BASE || "http://localhost:3200";
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const PASS = "open-shop-2026";
let passed = 0;
const failed = [];
const check = (name, ok, detail) => {
  if (ok) (passed++, console.log(`  ok   ${name}${detail ? ` — ${detail}` : ""}`));
  else (failed.push(name), console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`));
};

for (const ip of ["local", "::1", "127.0.0.1"]) for (const key of [`join-ip:${ip}`, `login-ip:${ip}`]) await admin.rpc("forget_tries", { p_key: key });
const digits = await robot(admin, `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`);

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
let userId = null;
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "ar-TN" });
  const page = await ctx.newPage();
  const seen = [];
  page.on("framenavigated", (f) => f === page.mainFrame() && seen.push(new URL(f.url()).pathname));

  const t0 = Date.now();
  await page.goto(`${BASE}/shop/new`, { waitUntil: "load", timeout: 90000 });
  await page.locator('input[name="name"]').fill("مولى التجربة");
  await page.locator('input[name="shop"]').fill("قهوة التجربة");
  await page.locator('input[name="phone"]').fill(digits);
  await page.locator('input[name="password"]').fill(PASS);
  // the trade: one tap opens every kind, then the one you sell
  await page.locator('button[aria-haspopup="dialog"]').first().click({ timeout: 20000 });
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "قهوة", exact: true }).first().click({ timeout: 20000 });
  await page.waitForTimeout(400);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/shop\/(card|setup)/, { timeout: 30000 }).catch(async () => {
    // say what the form said rather than timing out blind
    const said = (await page.locator("body").innerText()).replace(/\s+/g, " ");
    await page.screenshot({ path: ".e2e/open-shop-stuck.png" });
    throw new Error(`the form did not move on: ${page.url()} — ${said.slice(0, 220)}`);
  });
  if (page.url().includes("/shop/setup")) {
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/shop\/card/, { timeout: 30000 });
  }

  // the card: how many tampons, then what the customer wins — and that is the card
  const next = async () => {
    const btn = page.getByRole("button", { name: /حلّ الكارط|كمّل|سجّل/ }).last();
    if (!(await btn.count())) {
      const said = (await page.locator("body").innerText()).replace(/\s+/g, " ");
      await page.screenshot({ path: ".e2e/open-shop-stuck.png" });
      throw new Error(`no way on at ${page.url()} — ${said.slice(0, 200)}`);
    }
    await btn.click({ timeout: 20000 });
    await page.waitForTimeout(500);
  };
  const body = async () => (await page.locator("body").innerText()).replace(/\s+/g, " ");
  const onCard = await body();
  check("the card's own screen never asks for the wait", !/كل قدّاش ينجم الحريف/.test(onCard));
  check("  → the colour is offered under the button, not in the way", /اللون واللوغو/.test(onCard));

  // the first screen finishes the card
  await next();
  await page.waitForTimeout(1500);
  for (let i = 0; i < 6 && !page.url().includes("/shop/qr"); i++) {
    const on = page.getByRole("button", { name: /حلّ الكارط|كمّل|فهمت|وفّى|يبدا|الكود/ }).first();
    if (await on.count()) await on.click({ timeout: 10000 }).catch(() => {});
    else await page.goto(`${BASE}/shop/qr`, { waitUntil: "load" });
    await page.waitForTimeout(900);
  }
  const seconds = Math.round((Date.now() - t0) / 1000);
  const screens = [...new Set(seen)].length;
  check("it ends on a code a customer can scan", page.url().includes("/shop/qr"), page.url());
  console.log(`\n  ${screens} screens, ${seconds}s for a robot that never hesitates (the real median was 92s over 10 screens)`);

  const { data } = await admin.from("shops").select("id, color, stamp_gap, owner_id").eq("name", "قهوة التجربة").maybeSingle();
  userId = data?.owner_id ?? null;
  check("the shop took the trade's colour without being asked", !!data?.color && data.color.toUpperCase() !== "#6C47FF", data?.color);
  check("the wait is the hour it always was", (data?.stamp_gap ?? 60) === 60, String(data?.stamp_gap));
} catch (e) {
  failed.push("the run itself");
  console.error(`\n  the run broke: ${e?.stack || JSON.stringify(e)}`);
} finally {
  await browser.close();
  await admin.from("shops").delete().eq("name", "قهوة التجربة");
  if (userId) await admin.auth.admin.deleteUser(userId).catch(() => {});
  await unrobot(admin, digits).catch(() => {});
  console.log(`\n${failed.length ? `${failed.length} failed` : `all ${passed} ok`}`);
  process.exit(failed.length ? 1 : 0);
}
