/**
 * The prices (7 Nov 2026), for real, on phones: a shop in its trial's first 3
 * days (the three lengths, the year first, two months more on six months and
 * the year, the offer's popup), an old customer whose year ran out (120 a
 * year, «الأبونمان وفى» on the home, the counter and «المحل»), a shop a few
 * days from its end («جدّد»), a shop paid far ahead, the founder's form, and
 * the public price page. Throwaway accounts, deleted at the end; pictures in
 * .e2e/prices/.
 *
 *   node scripts/prices.mjs      (from v2/, dev server on :3200 — or BASE=)
 */
import { mkdirSync } from "node:fs";
import { config } from "dotenv";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const BASE = process.env.BASE || "http://localhost:3200";
const OUT = ".e2e/prices";
mkdirSync(OUT, { recursive: true });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
for (const ip of ["local", "::1", "127.0.0.1"]) await admin.rpc("forget_tries", { p_key: `login-ip:${ip}` });
const PASS = "prices-e2e-2026";
// every one-time note: the home shows only what a test lets through
const NOTES = ["card_hello", "coach", "logo_tip", "offer", "push", "install", "fix_tip", "first_scan", "first_gift", "mission", "links_tip", "reset_tip", "new_insights"];
const DAY = 86_400_000;
const at = (ms) => new Date(Date.now() + ms).toISOString();
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

async function person(name, { seen = NOTES, isAdmin = false } = {}) {
  // a robot: on the list before it exists, so the founder's console never shows it (scripts/robots.mjs)
  const d = await robot(admin, `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`);
  phones.push(d);
  const { data, error } = await admin.auth.admin.createUser({ email: `216${d}@phone.pointidi.app`, password: PASS, email_confirm: true, app_metadata: { phone: `+216${d}` } });
  if (error) throw error;
  made.push(data.user.id);
  await admin.from("people").upsert({ id: data.user.id, name, phone: `+216${d}`, seen, is_admin: isAdmin });
  const { data: live } = await admin.from("news").select("id").eq("active", true);
  if (live?.length) await admin.from("news_views").insert(live.map((n) => ({ news_id: n.id, person_id: data.user.id })));
  return { id: data.user.id, digits: d };
}
async function shopFor(who, row) {
  const { data, error } = await admin
    .from("shops")
    .insert({ owner_id: who.id, kind: "cafe", goal: 6, gift: "قهوة بلاش", color: "#6C47FF", trial_first: false, trial_days: 3, ...row })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

// ① in its trial's first 3 days — its last half-day, so the offer's popup shows without a customer
const fresh = await person("سامي", { seen: NOTES.filter((n) => n !== "offer") });
const freshShop = await shopFor(fresh, { name: "Café Sami", created_at: at(-2.5 * DAY) });
// ② an old customer: paid before 7 Nov 2026 (old_price), its year ran out two days ago
const old = await person("هالة");
const oldShop = await shopFor(old, { name: "Parfum Hela", created_at: at(-400 * DAY), paid_until: at(-2 * DAY), old_price: true });
// ③ on the new prices, paid, three days from its end
const near = await person("ياسين");
await shopFor(near, { name: "Barber Yassine", created_at: at(-40 * DAY), paid_until: at(3 * DAY) });
// ④ paid far ahead
const far = await person("ريم");
await shopFor(far, { name: "Boutique Rim", created_at: at(-40 * DAY), paid_until: at(200 * DAY) });
// the founder
const boss = await person("Boss", { isAdmin: true });

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ar-TN" };
async function signIn(who, ctxOpts = phone) {
  const ctx = await browser.newContext(ctxOpts);
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
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${OUT}/${name}.png` });
};
const fits = (page) => page.evaluate(() => ({ wide: document.documentElement.scrollWidth <= innerWidth + 1, tall: document.documentElement.scrollHeight <= innerHeight + 1 }));
const go = async (page, path) => {
  await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 90000 });
  await page.locator("main, h1").first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(1500);
};
const text = (page) => page.evaluate(() => document.body.innerText);
const wa = async (page) => decodeURIComponent((await page.locator('a[href^="https://wa.me/"]').first().getAttribute("href")).split("text=")[1]);

try {
  console.log("\n① A shop in its trial's first 3 days");
  const s = await signIn(fresh);
  await go(s.page, "/shop");
  const popup = s.page.getByRole("dialog", { name: "شهرين بلاش" });
  check("the offer's popup: «شهرين بلاش»", await popup.waitFor({ timeout: 15000 }).then(() => true, () => false));
  const said = await popup.innerText().catch(() => "");
  check("…six months and the year side by side, 120 and 180, each «+شهرين»", /120/.test(said) && /180/.test(said) && /6 شهور/.test(said) && /عام/.test(said) && (said.match(/\+شهرين/g) ?? []).length >= 2, said.slice(0, 300));
  check("…never the old «3 شهور» nor «15 شهر»", !/3 شهور|15 شهر/.test(said));
  await shot(s.page, "1-offer-popup");
  await s.page.getByRole("link", { name: "نخلّص توّا" }).click();
  await s.page.waitForURL(/\/shop\/pay$/, { timeout: 30000 });
  await s.page.waitForTimeout(1500);
  const tiles = s.page.getByRole("radiogroup", { name: "اختار المدّة" }).getByRole("radio");
  check("the pay page: three lengths", (await tiles.count()) === 3);
  const labels = await tiles.evaluateAll((b) => b.map((x) => x.getAttribute("aria-label")));
  check("…a month 35, six months 120, a year 180", labels.join("|") === "شهر · 35 د|6 شهور · 120 د|عام · 180 د", labels);
  const chosen = await tiles.evaluateAll((b) => b.map((x) => x.getAttribute("aria-checked")));
  check("…the year chosen first", chosen.join() === "false,false,true", chosen);
  const page1 = await text(s.page);
  check("…the year marked «الأحسن», the month «بلا التزام»", page1.includes("الأحسن") && page1.includes("بلا التزام"));
  check("…«+شهرين» on six months and the year, not on the month", (await tiles.nth(0).innerText()).includes("+شهرين") === false && (await tiles.nth(1).innerText()).includes("+شهرين") && (await tiles.nth(2).innerText()).includes("+شهرين"));
  check("…what a month comes to with the gift: 15 on six months (120/8), 13 on the year (180/14)", (await tiles.nth(1).innerText()).includes("15 د في الشهر") && (await tiles.nth(2).innerText()).includes("13 د في الشهر"));
  check("…the offer's clock beside «على 6 شهور وعلى العام»", page1.includes("على 6 شهور وعلى العام") && /\d\d:\d\d:\d\d/.test(page1));
  await shot(s.page, "2-pay-offer");
  await s.page.getByRole("radio", { name: "D17" }).click();
  await s.page.waitForTimeout(400);
  check("the year chosen, D17: «ابعث 180 د»", (await text(s.page)).includes("ابعث 180 د على D17"));
  check("…the WhatsApp to the founder says the plan: «عام + شهرين بلاش، 180 د»", (await wa(s.page)).includes("(عام + شهرين بلاش، 180 د) بـ D17"), await wa(s.page));
  await shot(s.page, "3-pay-year-d17");
  await tiles.nth(0).click();
  await s.page.waitForTimeout(400);
  check("the month chosen: «ابعث 35 د», and the message «شهر، 35 د» (no gift)", (await text(s.page)).includes("ابعث 35 د على D17") && (await wa(s.page)).includes("(شهر، 35 د)"), await wa(s.page));
  await tiles.nth(1).click();
  await s.page.waitForTimeout(400);
  check("six months chosen: «ابعث 120 د», «6 شهور + شهرين بلاش، 120 د»", (await text(s.page)).includes("ابعث 120 د على D17") && (await wa(s.page)).includes("(6 شهور + شهرين بلاش، 120 د)"), await wa(s.page));
  const f1 = await fits(s.page);
  check("the pay page at 390×844: nothing sideways, nothing below", f1.wide && f1.tall, f1);
  for (const [w, h] of [[360, 640], [412, 915]]) {
    await s.page.setViewportSize({ width: w, height: h });
    await go(s.page, "/shop/pay");
    const f = await fits(s.page);
    check(`…at ${w}×${h}: nothing sideways, nothing below`, f.wide && f.tall, f);
    await shot(s.page, `4-pay-${w}x${h}`);
  }
  await s.page.setViewportSize({ width: 390, height: 844 });
  await s.ctx.close();

  console.log("\n② An old customer (paid before 7 Nov 2026), its year ran out");
  const o = await signIn(old);
  await go(o.page, "/shop");
  const home2 = await text(o.page);
  check("the home says «الأبونمان وفى», never «التجربة وفات»", home2.includes("الأبونمان وفى") && !home2.includes("التجربة وفات"));
  check("…its WhatsApp asks to renew", (await wa(o.page)).includes("الأبونمان وفى ونحب نجدّدو"), await wa(o.page));
  await shot(o.page, "5-old-home");
  await go(o.page, "/shop/pay");
  const pay2 = await text(o.page);
  check("its pay page: «جدّد الأبونمان», the year at 120, nothing else to choose", pay2.includes("جدّد الأبونمان") && pay2.includes("120") && pay2.includes("في العام") && !pay2.includes("180") && (await o.page.getByRole("radiogroup", { name: "اختار المدّة" }).count()) === 0);
  check("…no offer", !pay2.includes("+شهرين"));
  await o.page.getByRole("radio", { name: "Virement" }).click();
  await o.page.waitForTimeout(400);
  check("…«ابعث 120 د», the message «عام، 120 د»", (await text(o.page)).includes("ابعث 120 د") && (await wa(o.page)).includes("(عام، 120 د) بـ Virement"), await wa(o.page));
  await shot(o.page, "6-old-pay");
  await go(o.page, "/shop/settings");
  check("«المحل» says «الأبونمان وفى»", (await text(o.page)).includes("الأبونمان وفى"));
  await o.page.goto(`${BASE}/shop/qr`, { waitUntil: "load", timeout: 90000 });
  const counterSays = await o.page.getByText("الأبونمان وفى").first().waitFor({ timeout: 30000 }).then(() => true, () => false);
  check("the counter, stopped, says «الأبونمان وفى»", counterSays && !(await text(o.page)).includes("التجربة وفات"));
  await shot(o.page, "7-old-counter");
  await o.ctx.close();

  console.log("\n③ New prices, paid, three days from its end");
  const n = await signIn(near);
  await go(n.page, "/shop");
  const renew = n.page.getByRole("link", { name: /الأبونمان يوفى نهار/ });
  check("the home: «الأبونمان يوفى نهار …» and «جدّد»", (await renew.count()) === 1 && (await renew.innerText()).includes("جدّد"));
  await shot(n.page, "8-near-home");
  await renew.click();
  await n.page.waitForURL(/\/shop\/pay$/, { timeout: 30000 });
  await n.page.waitForTimeout(1500);
  const pay3 = await text(n.page);
  check("its pay page: «جدّد الأبونمان», until when, the three lengths", pay3.includes("جدّد الأبونمان") && pay3.includes("مخلّص حتى") && (await n.page.getByRole("radiogroup", { name: "اختار المدّة" }).getByRole("radio").count()) === 3);
  check("…the offer long gone: no «+شهرين»", !pay3.includes("+شهرين"));
  await shot(n.page, "9-near-pay");
  await n.ctx.close();

  console.log("\n④ Paid far ahead");
  const r = await signIn(far);
  await go(r.page, "/shop");
  check("the home says nothing of paying", !(await text(r.page)).includes("الأبونمان يوفى") && (await r.page.getByRole("link", { name: /جدّد/ }).count()) === 0);
  await go(r.page, "/shop/pay");
  const pay4 = await text(r.page);
  check("its pay page: until when, nothing to pay", pay4.includes("مخلّص حتى") && (await r.page.getByRole("radio", { name: "D17" }).count()) === 0);
  await shot(r.page, "10-far-pay");
  await r.ctx.close();

  console.log("\n⑤ The founder's form");
  const b = await signIn(boss, { viewport: { width: 1280, height: 900 }, locale: "ar-TN" });
  for (const [shopId, name, want, gift] of [
    [freshShop.id, "fresh", ["شهر · 35 د", "6 شهور · 120 د", "عام · 180 د"], true],
    [oldShop.id, "old", ["عام · 120 د"], false],
  ]) {
    await b.page.goto(`${BASE}/admin/shop/${shopId}`, { waitUntil: "load", timeout: 90000 });
    await b.page.getByRole("button", { name: "خدّم الأبونمان" }).first().click({ timeout: 30000 });
    await b.page.waitForTimeout(500);
    const all = await text(b.page);
    check(`${name}: its price list as chips (${want.join(", ")})`, want.every((w) => all.includes(w)) && (name === "old" ? !all.includes("180 د") : true));
    const box = b.page.getByRole("checkbox", { name: /\+شهرين بلاش/ });
    check(`${name}: ${gift ? "the offer's two months, ticked (the offer runs)" : "no two months to give"}`, gift ? await box.isChecked() : (await box.count()) === 0);
    check(`${name}: the button says what turns on (${gift ? "14 شهر" : "عام"})`, (await b.page.getByRole("button", { name: gift ? "خدّم 14 شهر" : "خدّم عام" }).count()) === 1);
    await shot(b.page, `11-admin-${name}`);
  }
  await b.ctx.close();

  console.log("\n⑥ The public price page");
  const v = await browser.newContext(phone);
  const p = await v.newPage();
  await p.goto(`${BASE}/prix`, { waitUntil: "load", timeout: 90000 });
  await p.waitForTimeout(1200);
  const prix = await text(p);
  check("/prix: 35, 120 and 180, the year the best", prix.includes("35") && prix.includes("120") && prix.includes("180") && prix.includes("الأحسن"));
  check("…the two months of the trial's first 3 days", prix.includes("شهرين زايدين بلاش"));
  check("…nothing left of «un seul abonnement» or «15 mois»", !/un seul abonnement|15 mois|48 heures/.test(prix));
  const ld = await p.evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"]')].map((x) => x.textContent).join(" "));
  check("…its data for search engines: three offers", (ld.match(/"@type":"Offer"/g) ?? []).length === 3 && ld.includes('"price":35') && ld.includes('"price":180'), ld.slice(0, 200));
  const fp = await fits(p);
  check("…nothing sideways on a phone", fp.wide, fp);
  await p.screenshot({ path: `${OUT}/12-prix.png`, fullPage: true });
  const llms = await (await fetch(`${BASE}/llms.txt`)).text();
  check("llms.txt: the three prices, no «one plan only»", llms.includes("35 TND a month, 120 TND for 6 months or 180 TND a year") && !/one plan only/i.test(llms));
  await v.close();
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
