/**
 * The card's clock, the customer removed and «شكون رجع؟», for real, on phones against the running app:
 * the first card's new question (no clock until chosen), the owner's «جديد» note opening the card on
 * its clock, the clock saved, «المحل» saying it, the customers' list (the hourglass, the deadline, a
 * customer removed for good), the customer's card (the bar that empties; the card back at zero after
 * its clock), a tampon after the clock (zero, then one), the daily sweep, and the insights page.
 * Throwaway robot accounts (scripts/robots.mjs), deleted at the end; pictures in .e2e/clock/.
 *
 *   node scripts/clock.mjs      (from v2/, dev server on :3200 — or BASE=)
 */
import { mkdirSync } from "node:fs";
import { config } from "dotenv";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const BASE = process.env.BASE || "http://localhost:3200";
const OUT = ".e2e/clock";
mkdirSync(OUT, { recursive: true });
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
for (const ip of ["local", "::1", "127.0.0.1"]) await admin.rpc("forget_tries", { p_key: `login-ip:${ip}` });
const PASS = "clock-e2e-2026";
// every one-time note but the clock's: the home shows that one and nothing else
const NOTES = ["card_hello", "coach", "logo_tip", "offer", "push", "install", "fix_tip", "first_scan", "first_gift", "mission", "links_tip", "new_insights"];
const DAY = 86_400_000;
const ago = (ms) => new Date(Date.now() - ms).toISOString();
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

async function person(name) {
  const d = await robot(admin, `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`);
  phones.push(d);
  const { data, error } = await admin.auth.admin.createUser({ email: `216${d}@phone.pointidi.app`, password: PASS, email_confirm: true, app_metadata: { phone: `+216${d}` } });
  if (error) throw error;
  made.push(data.user.id);
  await admin.from("people").upsert({ id: data.user.id, name, phone: `+216${d}`, seen: NOTES });
  return { id: data.user.id, digits: d, name };
}
const shopOf = async (owner, extra) => {
  const { data, error } = await admin
    .from("shops")
    .insert({ owner_id: owner.id, name: "Café Clock", kind: "coffee", color: "#6C47FF", created_at: ago(60 * DAY), paid_until: new Date(Date.now() + 300 * DAY).toISOString(), ...extra })
    .select("*")
    .single();
  if (error) throw error;
  return data;
};
/** a card with its history: a tampon on each of those days ago, the card's stamps as given */
const cardOf = async (shop, who, stamps, daysAgo) => {
  const { data: c, error } = await admin
    .from("cards")
    .insert({ shop_id: shop.id, user_id: who.id, stamps, last_at: ago(Math.min(...daysAgo) * DAY), created_at: ago(Math.max(...daysAgo) * DAY) })
    .select("*")
    .single();
  if (error) throw error;
  await admin.from("moments").insert(daysAgo.map((d) => ({ shop_id: shop.id, card_id: c.id, kind: "stamp", created_at: ago(d * DAY) })));
  return c;
};

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ar-TN" };
async function signIn(who) {
  const ctx = await browser.newContext(phone);
  const page = await ctx.newPage();
  for (let attempt = 1; ; attempt++) {
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 120000 });
    await page.waitForTimeout(800);
    await page.locator('input[name="phone"]').fill(who.digits);
    await page.locator('input[name="password"]').fill(PASS);
    if ((await page.locator('input[name="phone"]').inputValue()).replace(/\D/g, "") !== who.digits) continue;
    await page.locator('button[type="submit"]').click();
    const away = await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 45000 }).then(() => true, () => false);
    if (away) return { ctx, page };
    if (attempt >= 2) throw new Error(`could not sign in ${who.digits}`);
  }
}
const shot = async (page, name) => {
  await page.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((e) => (e.style.display = "none")));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}.png` });
};
const go = async (page, path) => {
  await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(1500);
};
const text = (page) => page.evaluate(() => document.body.innerText);
const shopRow = async (id) => (await admin.from("shops").select("reset_days, reset_since, reset_paused_at").eq("id", id).single()).data;
const cardRow = async (id) => (await admin.from("cards").select("stamps, reset_at, reset_from, clock_from").eq("id", id).maybeSingle()).data;
const TIP = "الكارط ترجع للصفر كان الحريف غاب";
const ASK = "الحريف كان غاب، الكارط ترجع للصفر؟";

// the founder's switch for the clock, every shop at once: found as it is, off for the first checks, on for
// the rest, and put back as it was found at the end. The clock is live since 6 Nov 2026: flipping the switch
// on the real database turns the clock off, or on, for every real owner and customer for the minutes this
// runs. So it never does without being told to (CLOCK_TEST_LIVE=1) — a database of its own needs no flag.
const SWITCH = (await admin.from("settings").select("value").eq("key", "clock_on").maybeSingle()).data?.value ?? null;
if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("srhqhulyijtzwmqhcsse") && process.env.CLOCK_TEST_LIVE !== "1") {
  console.log(`The real database (the founder's switch is ${SWITCH === "1" ? "ON for every shop" : "off"}): this test flips it for every real owner while it runs. Not run — CLOCK_TEST_LIVE=1 to run it anyway.`);
  process.exit(2);
}
const setSwitch = async (v) => {
  const { error } = v === null ? await admin.from("settings").delete().eq("key", "clock_on") : await admin.from("settings").upsert({ key: "clock_on", value: v });
  if (error) throw error;
};

try {
  // ── the switch off (as every shop has it until the founder turns it on): no clock anywhere ──
  await setSwitch("");
  const owner = await person("سنية");
  const shop = await shopOf(owner, { goal: 8, gift: "قهوة بلاش" });
  const { data: liveNews } = await admin.from("news").select("id").eq("active", true);
  if (liveNews?.length) await admin.from("news_views").insert(liveNews.map((x) => ({ news_id: x.id, person_id: owner.id })));
  const rania = await person("رانية");
  const sami = await person("سامي");
  const omar = await person("عمر");
  const lina = await person("لينا");
  const cR = await cardOf(shop, rania, 5, [20, 12, 6, 2]); // came 2 days ago
  const cS = await cardOf(shop, sami, 3, [30, 20, 10]); // 10 days quiet
  const cO = await cardOf(shop, omar, 6, [25, 18, 11, 5]); // 5 days quiet
  const cL = await cardOf(shop, lina, 2, [45, 40]); // long gone

  console.log("\nThe switch off: no clock anywhere");
  const o = await signIn(owner);
  check("no «جديد» note on the home", !(await o.page.getByRole("dialog", { name: TIP }).waitFor({ timeout: 6000 }).then(() => true, () => false)));
  check("…and it is not written down as seen", !((await admin.from("people").select("seen").eq("id", owner.id).single()).data?.seen ?? []).includes("reset_tip"));
  await go(o.page, "/shop/settings");
  check("«المحل» has no clock", !(await text(o.page)).includes("الكارط ترجع للصفر"));
  await shot(o.page, "0-off-settings");
  await go(o.page, "/shop/clock");
  check("the clock's page leads back to «المحل»", new URL(o.page.url()).pathname === "/shop/settings", o.page.url());
  await go(o.page, "/shop/card?at=reset");
  check("the card's questions never ask about it", !(await text(o.page)).includes(ASK));
  // a clock already in the database (set 8 days ago) does nothing while the switch is off
  await admin.from("shops").update({ reset_days: 7, reset_since: ago(8 * DAY) }).eq("id", shop.id);
  await go(o.page, "/shop/customers");
  const off = await text(o.page);
  check("a clock in the database does nothing: Sami (10 days quiet) still reads 3/8", /سامي[\s\S]{0,120}3\/8/.test(off), off.slice(0, 300));
  check("…no hourglass on anyone", (await o.page.locator('svg[aria-label^="الكارط متاعو ترجع للصفر"]').count()) === 0);
  const sweptOff = await admin.rpc("reset_sweep");
  check("…and the daily sweep takes nothing", !sweptOff.error && (await cardRow(cS.id)).stamps === 3 && (await cardRow(cL.id)).stamps === 2, sweptOff.data ?? sweptOff.error?.message);
  await admin.from("shops").update({ reset_days: null, reset_since: null }).eq("id", shop.id);
  await setSwitch("1");

  // ── a new owner: the first card asks about the clock, «لا» until chosen ──
  console.log("\nThe first card: the clock's question");
  const fresh = await person("نادية");
  const freshShop = await shopOf(fresh, { name: "Salon Nadia", kind: "barber" });
  const n = await signIn(fresh);
  await go(n.page, "/shop/card");
  for (let i = 0; i < 3; i++) {
    await n.page.getByRole("button", { name: "كمّل", exact: true }).click();
    await n.page.waitForTimeout(700);
  }
  const q = await text(n.page);
  check("the 4th question is the card's clock", q.includes("الحريف كان غاب، الكارط ترجع للصفر؟"), q.slice(0, 200));
  check("…with «لا» chosen to begin with", q.includes("لا: التامبونات يقعدو ديما في الكارط متاعو."));
  await shot(n.page, "1-first-card-clock");
  await n.page.getByRole("radio", { name: "15 يوم" }).or(n.page.getByRole("button", { name: "15 يوم" })).first().click();
  await n.page.waitForTimeout(400);
  check("picking 15 days says what it does", (await text(n.page)).includes("كان ما خذاش تامبون 15 يوم، الكارط ترجع للصفر."));
  await n.page.getByRole("button", { name: "كمّل", exact: true }).click();
  await n.page.waitForTimeout(700);
  await n.page.getByRole("button", { name: "حلّ الكارط" }).click();
  // the save lands in the database a moment after the tap: looked for there, up to 45 s. A save that failed
  // says «صار مشكل. عاود جرّب» (this PC opens a fresh connection after the questions' quiet seconds, and
  // it sometimes times out): the owner taps again, and so does this, twice at most
  let fr = null;
  let retried = 0;
  for (let i = 0; i < 45 && !(fr?.goal && fr?.reset_days); i++) {
    await n.page.waitForTimeout(1000);
    fr = (await admin.from("shops").select("goal, reset_days, reset_since").eq("id", freshShop.id).single()).data;
    if (!fr?.goal && retried < 2 && (await text(n.page)).includes("صار مشكل")) {
      retried++;
      console.log(`  (the save failed on this PC's network: tapped again, ${retried})`);
      await n.page.getByRole("button", { name: "حلّ الكارط" }).click();
    }
  }
  check("the first card is saved with its clock: 15 days, counted from today", fr?.goal && fr.reset_days === 15 && Date.now() - Date.parse(fr.reset_since) < 5 * 60_000, { db: fr, url: n.page.url(), screen: (await text(n.page)).slice(0, 240) });
  await n.ctx.close();

  console.log("\nThe switch on — the owner: the note, then the clock set");
  await go(o.page, "/shop");
  // the home: the note rises there, once (shown twice it would be a bug)
  const tip = o.page.getByRole("dialog", { name: TIP });
  check("the «جديد» note shows on the home", await tip.waitFor({ timeout: 30000 }).then(() => true, () => false));
  check("…and is written down as seen at once", ((await admin.from("people").select("seen").eq("id", owner.id).single()).data?.seen ?? []).includes("reset_tip"));
  await shot(o.page, "2-home-note");
  await o.page.getByRole("link", { name: "نحدّدها توّا" }).click();
  await o.page.waitForURL(/\/shop\/card\?at=reset/, { timeout: 60000 });
  await o.page.waitForTimeout(1500);
  check("«نحدّدها توّا» opens the card straight on its clock", (await text(o.page)).includes("الحريف كان غاب، الكارط ترجع للصفر؟"));
  await o.page.getByRole("button", { name: "7 أيّام" }).click();
  await shot(o.page, "3-wizard-clock");
  await o.page.getByRole("button", { name: "كمّل", exact: true }).click();
  await o.page.waitForTimeout(600);
  await o.page.getByRole("button", { name: "كمّل", exact: true }).click();
  await o.page.waitForTimeout(600);
  await o.page.getByRole("button", { name: "سجّل" }).click();
  await o.page.waitForURL((u) => u.pathname === "/shop", { timeout: 60000 }).catch(() => {});
  const s1 = await shopRow(shop.id);
  check("the clock is saved: 7 days", s1.reset_days === 7, s1);

  // the clock set 8 days ago: Sami (10 days quiet) is past it, Omar (5 days) runs out in 2, Rania in 5
  await admin.from("shops").update({ reset_since: ago(8 * DAY) }).eq("id", shop.id);

  console.log("\n«المحل»");
  await go(o.page, "/shop/settings");
  const st = await text(o.page);
  check("«المحل» says the clock (switch on)", st.includes("الكارط ترجع للصفر") && st.includes("كان الحريف غاب 7 أيّام"));
  check("«المحل» leads to «شكون رجع؟»", st.includes("شكون رجع؟"));
  await shot(o.page, "4-settings");

  console.log("\nThe customers");
  await go(o.page, "/shop/customers");
  const ct = await text(o.page);
  check("Sami's card, past its clock, reads 0", /سامي[\s\S]{0,120}0\/8/.test(ct), ct.slice(0, 300));
  check("an hourglass on the one running out (Omar)", (await o.page.locator('svg[aria-label^="الكارط متاعو ترجع للصفر"]').count()) >= 1);
  await shot(o.page, "5-customers");
  await o.page.getByRole("button", { name: /عمر/ }).first().click();
  await o.page.waitForTimeout(900);
  const sheet = await text(o.page);
  check("Omar's sheet: back to zero in 2 days", sheet.includes("الكارط متاعو ترجع للصفر بعد يومين كان ما جاش"), sheet.slice(0, 300));
  await shot(o.page, "6-customer-sheet");
  await o.page.getByRole("button", { name: "نحّي الحريف" }).click();
  await o.page.waitForTimeout(700);
  check("removing asks first, and says what goes", (await text(o.page)).includes("تنحّي عمر من الحرفاء متاعك؟"));
  await shot(o.page, "7-remove-ask");
  await o.page.getByRole("button", { name: "إيه، نحّيه" }).click();
  await o.page.waitForTimeout(2500);
  check("Omar's card is gone", (await cardRow(cO.id)) === null);
  check("…his account stays", !!(await admin.from("people").select("id").eq("id", omar.id).maybeSingle()).data);
  // the list drawn again a moment later: looked for up to 15 s
  let gone = false;
  for (let i = 0; i < 30 && !gone; i++) {
    gone = !(await text(o.page)).includes("عمر");
    if (!gone) await o.page.waitForTimeout(500);
  }
  check("…and he is off the list", gone);

  console.log("\nThe customers' own cards");
  const r = await signIn(rania);
  await go(r.page, `/c/${cR.id}`);
  const rc = await text(r.page);
  check("Rania's card: back to zero in 5 days, a bar under it", rc.includes("الكارط ترجع للصفر بعد 5 أيّام كان ما خذيتش تامبون"), rc.slice(0, 300));
  await shot(r.page, "8-card-countdown");
  const s = await signIn(sami);
  await go(s.page, `/c/${cS.id}`);
  const sc = await text(s.page);
  check("Sami's card: back at zero, and why", sc.includes("الكارط رجعت للصفر: غبت أكثر من 7 أيّام"), sc.slice(0, 300));
  await shot(s.page, "9-card-reset");
  await go(s.page, "/wallet");
  check("Sami's wallet says it too", (await text(s.page)).includes("الكارط رجعت للصفر"));

  console.log("\nAt the counter: Sami, past his clock");
  await go(o.page, "/shop/collect");
  await o.page.locator('input[inputmode="tel"]').fill(sami.digits);
  await o.page.getByRole("button", { name: /^رجّعلو/ }).waitFor({ timeout: 30000 }).catch(() => {});
  const at = await text(o.page);
  check("the counter says why Sami reads 0, and offers his 3 back", at.includes("الكارط متاعو رجعت للصفر") && /0\/8/.test(at), at.slice(0, 300));
  await shot(o.page, "6b-counter-reset");
  await o.page.getByRole("button", { name: /^رجّعلو/ }).click();
  let sc0 = null;
  for (let i = 0; i < 20 && !(sc0?.stamps === 3 && !sc0.reset_from); i++) {
    await o.page.waitForTimeout(500);
    sc0 = await cardRow(cS.id);
  }
  check("given back at the counter: Sami has his 3, his clock from today", sc0?.stamps === 3 && sc0.reset_from === null && Date.now() - Date.parse(sc0.clock_from) < 5 * 60_000, sc0);
  let at2 = "";
  for (let i = 0; i < 20 && !(at2.includes("رجعولو تامبوناتو") && /3\/8/.test(at2)); i++) {
    await o.page.waitForTimeout(500);
    at2 = await text(o.page);
  }
  check("…the counter says so, and shows 3/8", at2.includes("رجعولو تامبوناتو") && /3\/8/.test(at2), at2.slice(0, 300));
  await shot(o.page, "6c-counter-restored");
  // Sami past his clock again (his last tampon 10 days ago), for the tampon below
  await admin.from("cards").update({ last_at: ago(10 * DAY), clock_from: null }).eq("id", cS.id);

  console.log("\nA tampon after the clock, and the daily sweep");
  const ownerApi = createClient(URL_, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  await ownerApi.auth.signInWithPassword({ email: `216${owner.digits}@phone.pointidi.app`, password: PASS });
  const g = await ownerApi.rpc("give_stamp", { p_who: sami.digits });
  const sAfter = await cardRow(cS.id);
  check("a tampon on Sami's card past its clock: zero first, then 1", g.data?.ok === true && sAfter.stamps === 1 && !!sAfter.reset_at, { give: g.data ?? g.error?.message, card: sAfter });
  check("…and the tampon's answer says what was lost (3), for the counter to offer back", g.data?.card?.reset_lost === 3, g.data?.card);
  await go(s.page, `/c/${cS.id}`);
  const sc1 = await text(s.page);
  check("Sami's card, 1 tampon after the clock: it says why it started again", sc1.includes("الكارط رجعت للصفر: غبت أكثر من 7 أيّام"), sc1.slice(0, 300));
  const swept = await admin.rpc("reset_sweep");
  check("the daily sweep takes Lina's card back to zero", !swept.error && swept.data >= 1 && (await cardRow(cL.id)).stamps === 0, swept.data ?? swept.error?.message);

  console.log("\nThe owner's clock page");
  await go(o.page, "/shop/clock");
  const ck = await text(o.page);
  check("the clock page: 7 days, running", ck.includes("كان الحريف غاب 7 أيّام") && ck.includes("يخدم"), ck.slice(0, 300));
  check("…what protects every customer", ck.includes("باش حتى حد ما يخسر بالغلط") && ck.includes("في 14 يوم"));
  check("…and what it took lately (Sami and Lina), to give back", ck.includes("رجعت للصفر في آخر 14 يوم") && ck.includes("رجّعلهم التامبونات"), ck.slice(0, 400));
  await shot(o.page, "11-clock-page");

  console.log("\nGiven back: one from the customer's sheet, the rest from the clock page");
  await go(o.page, "/shop/customers");
  await o.page.getByRole("button", { name: /لينا/ }).first().click();
  await o.page.waitForTimeout(900);
  check("Lina's sheet says her card went back to zero", (await text(o.page)).includes("الكارط متاعو رجعت للصفر"));
  await shot(o.page, "12-sheet-restore");
  await o.page.getByRole("button", { name: /^رجّعلو/ }).click();
  let l2 = null;
  for (let i = 0; i < 20 && !(l2?.stamps === 2); i++) {
    await o.page.waitForTimeout(500);
    l2 = await cardRow(cL.id);
  }
  check("Lina gets her 2 tampons back, her clock from today", l2?.stamps === 2 && l2.reset_from === null && Date.now() - Date.parse(l2.clock_from) < 5 * 60_000, l2);
  // the list drawn again arrives a moment later: looked for up to 15 s
  let ls = "";
  for (let i = 0; i < 30 && !/لينا[\s\S]{0,400}2\/8/.test(ls); i++) {
    await o.page.waitForTimeout(500);
    ls = await text(o.page);
  }
  check("…the sheet stays open and says so, with her 2/8 back", ls.includes("رجعولو تامبوناتو") && /لينا[\s\S]{0,400}2\/8/.test(ls), ls.slice(0, 400));
  await shot(o.page, "12b-sheet-restored");
  await go(o.page, "/shop/clock");
  await o.page.getByRole("button", { name: "رجّعلهم التامبونات" }).click();
  await o.page.waitForTimeout(600);
  check("giving back to all asks first", (await text(o.page)).includes("ترجّع التامبونات اللي خسروهم؟"));
  await shot(o.page, "11b-restore-ask");
  await o.page.getByRole("button", { name: "إيه، رجّعهم" }).click();
  let s2 = null;
  for (let i = 0; i < 20 && !(s2?.stamps === 4); i++) {
    await o.page.waitForTimeout(500);
    s2 = await cardRow(cS.id);
  }
  check("Sami gets his 3 back on top of the new one: 4", s2?.stamps === 4 && s2.reset_from === null, s2);
  await o.page.waitForTimeout(800);
  check("…the page says it", (await text(o.page)).includes("رجعولهم:"));

  console.log("\nThe pause");
  // Rania past the clock: her last tampon 10 days ago (the clock set 8 days ago, 7 days long)
  await admin.from("cards").update({ last_at: ago(10 * DAY) }).eq("id", cR.id);
  await go(o.page, "/shop/clock");
  await o.page.getByRole("switch", { name: "وقّف العدّاد" }).click();
  let p1 = null;
  for (let i = 0; i < 20 && !p1?.reset_paused_at; i++) {
    await o.page.waitForTimeout(500);
    p1 = await shopRow(shop.id);
  }
  check("«وقّف العدّاد» pauses it", !!p1?.reset_paused_at, p1);
  await o.page.waitForTimeout(1200);
  check("…the page says «موقوف»", (await text(o.page)).includes("موقوف"));
  await shot(o.page, "13-paused");
  const sweptPaused = await admin.rpc("reset_sweep");
  check("paused: the sweep leaves Rania's 5 (past the clock)", !sweptPaused.error && (await cardRow(cR.id)).stamps === 5, sweptPaused.error?.message);
  await go(r.page, `/c/${cR.id}`);
  const rp = await text(r.page);
  check("paused: Rania's card shows her 5 and no countdown", !rp.includes("ترجع للصفر") && !rp.includes("رجعت للصفر"), rp.slice(0, 300));
  await shot(r.page, "13b-card-paused");
  await o.page.getByRole("switch", { name: "وقّف العدّاد" }).click();
  let p2 = null;
  for (let i = 0; i < 20 && (p2 === null || p2.reset_paused_at); i++) {
    await o.page.waitForTimeout(500);
    p2 = await shopRow(shop.id);
  }
  check("back on: it counts from today for everyone", p2 && !p2.reset_paused_at && Date.now() - Date.parse(p2.reset_since) < 5 * 60_000, p2);
  const sweptBack = await admin.rpc("reset_sweep");
  check("…so Rania keeps her 5 (7 days from today)", !sweptBack.error && (await cardRow(cR.id)).stamps === 5);

  console.log("\nThe customer told the day before");
  // the clock set 6½ days ago: Rania's card goes back to zero in half a day
  await admin.from("shops").update({ reset_since: ago(6.5 * DAY) }).eq("id", shop.id);
  const w1 = await admin.rpc("reset_warnings");
  const mine = (w1.data ?? []).filter((w) => w.card === cR.id);
  check("the daily job finds Rania's card, with her 5", !w1.error && mine.length === 1 && mine[0].stamps === 5 && mine[0].shop === "Café Clock", w1.data ?? w1.error?.message);
  const w2 = await admin.rpc("reset_warnings");
  check("…once: the next day's run does not tell her again", !w2.error && !(w2.data ?? []).some((w) => w.card === cR.id));

  console.log("\nThe clock taken off");
  await go(o.page, "/shop/clock");
  await o.page.getByRole("button", { name: "نحّي العدّاد" }).click();
  await o.page.waitForTimeout(600);
  check("taking it off asks first", (await text(o.page)).includes("تنحّي العدّاد؟"));
  await shot(o.page, "14a-remove-ask");
  await o.page.getByRole("button", { name: "إيه، نحّيه" }).click();
  let off2 = null;
  for (let i = 0; i < 20 && off2?.reset_days !== null; i++) {
    await o.page.waitForTimeout(500);
    off2 = await shopRow(shop.id);
  }
  check("the clock is off", off2?.reset_days === null, off2);
  await o.page.waitForTimeout(1200);
  check("…and the page says «العدّاد مطفي»", (await text(o.page)).includes("العدّاد مطفي"));
  await shot(o.page, "14-clock-off");

  console.log("\n«شكون رجع؟»");
  await go(o.page, "/shop/insights");
  const it = await text(o.page);
  check("the insights open, with the return rate", it.includes("من الحرفاء رجعولك") && /\d+%/.test(it), it.slice(0, 300));
  check("…who is slipping away, and the most loyal", it.includes("وين وصلو الحرفاء") && it.includes("أوفى الحرفاء"));
  await o.page.setViewportSize({ width: 390, height: 1700 });
  await shot(o.page, "10-insights");
  const wide = await o.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  check("the insights never wider than the phone", wide);
} catch (e) {
  failed.push(`crashed: ${e.message}`);
  console.log(`  ✗ crashed: ${e.message}`);
} finally {
  await setSwitch(SWITCH).catch((e) => console.log(`  ✗ the switch could not be put back: ${e.message}`));
  console.log(`  (the founder's switch put back as found: ${JSON.stringify(SWITCH)})`);
  await browser.close();
  for (const id of made) await admin.auth.admin.deleteUser(id);
  await unrobot(admin, phones);
  console.log(`\n${passed} passed, ${failed.length} failed${failed.length ? `: ${failed.join(" · ")}` : ""} — robots deleted`);
  process.exit(failed.length ? 1 : 0);
}
