/**
 * The card's clock, explained while a new owner makes their first card (7 Nov
 * 2026, the founder: «make sure to add the card reset thing in the onboarding
 * … so they understand it when creating the card»).
 *
 * A throwaway owner with a fresh shop walks /shop/card to the clock's question
 * on a 390×844 phone and on a 360×640 one, and the script checks that the
 * question says what it does, gives an example, and says it is off unless the
 * owner turns it on — all of it on the screen, with nothing to scroll. Then one
 * owner picks 30 days and the other leaves «لا»: the shop's reset_days is 30
 * for the first and still null for the second. Accounts deleted at the end;
 * pictures in .e2e/reset-first-card/.
 *
 *   node scripts/reset-first-card.mjs   (from v2/, dev server on :3200 — or BASE=)
 *
 * Needs the founder's switch (settings.clock_on) on, as it is in production:
 * off, the question is not asked at all. The script never flips it.
 */
import { mkdirSync } from "node:fs";
import { config } from "dotenv";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const BASE = process.env.BASE || "http://localhost:3200";
const OUT = ".e2e/reset-first-card";
mkdirSync(OUT, { recursive: true });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
for (const ip of ["local", "::1", "127.0.0.1"]) await admin.rpc("forget_tries", { p_key: `login-ip:${ip}` });
const PASS = "reset-first-e2e-2026";
const NOTES = ["card_hello", "coach", "logo_tip", "offer", "push", "install", "fix_tip", "first_scan", "first_gift", "mission", "links_tip", "reset_tip", "new_insights"];
const made = [];
const phones = [];
let passed = 0;
const failed = [];
const check = (name, ok, detail) => {
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed.push(name);
    console.log(`  ✗ ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`);
  }
};

const { data: sw } = await admin.from("settings").select("value").eq("key", "clock_on").maybeSingle();
if (sw?.value !== "1") {
  console.log("The founder's clock switch is off: the first card asks nothing about it. Nothing to check.");
  process.exit(0);
}

async function owner(name, shopName) {
  const d = await robot(admin, `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`);
  phones.push(d);
  const { data, error } = await admin.auth.admin.createUser({ email: `216${d}@phone.pointidi.app`, password: PASS, email_confirm: true, app_metadata: { phone: `+216${d}` } });
  if (error) throw error;
  made.push(data.user.id);
  await admin.from("people").upsert({ id: data.user.id, name, phone: `+216${d}`, seen: NOTES });
  const { data: live } = await admin.from("news").select("id").eq("active", true);
  if (live?.length) await admin.from("news_views").insert(live.map((n) => ({ news_id: n.id, person_id: data.user.id })));
  // a shop just opened: a name and a kind, no card yet — /shop/card is the first card
  const { data: shop, error: e2 } = await admin.from("shops").insert({ owner_id: data.user.id, name: shopName, kind: "cafe", goal: null, gift: null }).select("id").single();
  if (e2) throw e2;
  return { id: data.user.id, digits: d, shop: shop.id };
}

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const phoneAt = (width, height) => ({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ar-TN" });
async function signIn(who, opts) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  for (let attempt = 1; ; attempt++) {
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 90000 });
    await page.waitForTimeout(800);
    await page.locator('input[name="phone"]').fill(who.digits);
    await page.locator('input[name="password"]').fill(PASS);
    if ((await page.locator('input[name="phone"]').inputValue()).replace(/\D/g, "") !== who.digits) continue;
    await page.locator('button[type="submit"]').click();
    const away = await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 }).then(() => true, () => false);
    if (away) return { ctx, page };
    if (attempt >= 2) throw new Error(`could not sign in ${who.digits}`);
  }
}
const shot = async (page, name) => {
  await page.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((e) => (e.style.display = "none")));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}.png` });
};
// the first card is one form as tall as the screen, scrolling inside itself on the smallest phones
const fits = (page) =>
  page.evaluate(() => {
    const f = document.querySelector("form");
    return { wide: document.documentElement.scrollWidth <= innerWidth + 1, tall: document.documentElement.scrollHeight <= innerHeight + 1 && (!f || f.scrollHeight <= f.clientHeight + 1), over: f ? f.scrollHeight - f.clientHeight : null };
  });
const heading = (page, title) => page.getByRole("heading", { level: 1, name: title }).waitFor({ timeout: 20000 });
const next = async (page) => {
  await page.getByRole("button", { name: "كمّل", exact: true }).click();
  await page.waitForTimeout(500);
};
/** what an owner can read on the clock's question: visible text only (a line hidden on a short phone is not read) */
const readable = (page) => page.evaluate(() => document.querySelector("form")?.innerText ?? "");

async function toClock(page) {
  await page.goto(`${BASE}/shop/card`, { waitUntil: "load", timeout: 90000 });
  await heading(page, "قدّاش من تامبون؟");
  await page.waitForTimeout(1200);
  await next(page);
  await heading(page, "شنوّة يربح؟");
  await next(page);
  await heading(page, "كل قدّاش ينجم الحريف ياخو تامبون؟");
  await next(page);
  await page.getByRole("radiogroup", { name: /الكارط ترجع للصفر/ }).waitFor({ timeout: 20000 });
  await page.waitForTimeout(700);
}

try {
  const a = await owner("سليم", "Café Slim");
  const b = await owner("منى", "Café Mouna");

  for (const [who, [w, h], pick] of [
    [a, [390, 844], 30],
    [b, [360, 640], 0],
  ]) {
    console.log(`\nA new owner at ${w}×${h}, the first card's clock question`);
    const s = await signIn(who, phoneAt(w, h));
    await toClock(s.page);
    const said = await readable(s.page);
    check("it is asked: the card goes back to zero", said.includes("ترجع للصفر"), said);
    check("…«لا» chosen to begin with", (await s.page.getByRole("radio", { name: "لا", exact: true }).getAttribute("aria-checked")) === "true");
    check("…an example: «كان الحريف ما جاش 30 يوم، الكارط ترجع للصفر»", said.includes("كان الحريف ما جاش 30 يوم، الكارط ترجع للصفر"), said);
    check("…it is optional, off unless the owner turns it on", said.includes("اختياري") && said.includes("مطفي"), said);
    check("…the tampons stay while it is off", said.includes("التامبونات يقعدو"), said);
    const f = await fits(s.page);
    check(`…all of it on the screen at ${w}×${h}: nothing to scroll`, f.wide && f.tall, f);
    await shot(s.page, `${w}x${h}-1-off`);

    await s.page.getByRole("radio", { name: "15 يوم", exact: true }).click();
    await s.page.waitForTimeout(500);
    const said15 = await readable(s.page);
    check("15 days picked: the example follows, «ما جاش 15 يوم»", said15.includes("كان الحريف ما جاش 15 يوم، الكارط ترجع للصفر"), said15);
    check("…and says what is kept: the gifts won", said15.includes("الكادوات اللي ربحهم يقعدولو"), said15);
    check("…and that the customer sees it on their card", said15.includes("يشوف في الكارط متاعو قدّاش بقالو"), said15);
    check("…and that it can be changed later", said15.includes("تنجم تبدّلو"), said15);
    const f15 = await fits(s.page);
    check(`…still nothing to scroll at ${w}×${h}`, f15.wide && f15.tall, f15);
    await shot(s.page, `${w}x${h}-2-on`);

    // the owner's own answer, then the card made
    await s.page.getByRole("radio", { name: pick ? `${pick} يوم` : "لا", exact: true }).click();
    await s.page.waitForTimeout(300);
    await next(s.page);
    await heading(s.page, "اللون واللوغو متاعك");
    await s.page.getByRole("button", { name: "حلّ الكارط", exact: true }).click();
    const out = await s.page.waitForURL(/\/shop\/start/, { timeout: 60000 }).then(() => true, () => false);
    check("the card is made", out, s.page.url());
    const { data: row } = await admin.from("shops").select("goal, reset_days").eq("id", who.shop).single();
    check(pick ? `…its clock: ${pick} days, as picked` : "…its clock left off (reset_days null), as «لا» says", row?.goal && (pick ? row.reset_days === pick : row.reset_days === null), row);
    await s.ctx.close();
  }
} catch (e) {
  failed.push(`crashed: ${e.message}`);
  console.log(`  ✗ crashed: ${e.message}`);
  for (const [i, pg] of browser.contexts().flatMap((c) => c.pages()).entries()) {
    console.log(`    page ${i}: ${pg.url()}`);
    await pg.screenshot({ path: `${OUT}/crash-${i}.png` }).catch(() => {});
  }
} finally {
  await browser.close();
  for (const id of made) {
    await admin.from("shops").delete().eq("owner_id", id);
    await admin.auth.admin.deleteUser(id);
  }
  await unrobot(admin, phones);
  console.log(`\n${passed} passed, ${failed.length} failed (removed ${made.length} accounts) · pictures in ${OUT}/`);
  if (failed.length) process.exit(1);
}
