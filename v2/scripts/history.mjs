/**
 * «التاريخ» and the ways to take a tampon back (10 Nov 2026), on a café of
 * throwaway accounts: the database's rules first (which tampon can be taken
 * back, which cannot, and why), then the owner's own screens on a phone — the
 * home's «التاريخ», the history, the sheet, the line once taken back, a
 * customer's card with its «فسّخ». The screens go to .e2e/history/ with the
 * places tapped (taps.json): scripts/explainer-videos.mjs films them
 * (ONLY=cancel). Everything it made is removed at the end.
 *
 *   node scripts/history.mjs      (from v2/, dev server on :3200 — or BASE=)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { config } from "dotenv";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const BASE = process.env.BASE || "http://localhost:3200";
const OUT = ".e2e/history";
mkdirSync(OUT, { recursive: true });
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
for (const ip of ["local", "::1", "127.0.0.1"]) await admin.rpc("forget_tries", { p_key: `login-ip:${ip}` });
const PASS = `history-${randomBytes(6).toString("hex")}`;
const NOTES = ["card_hello", "coach", "logo_tip", "offer", "push", "install", "fix_tip", "first_scan", "first_gift", "mission", "links_tip", "reset_tip", "new_insights"];
const MIN = 60_000;
const ago = (ms) => new Date(Date.now() - ms).toISOString();

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

const users = [];
const phones = [];
async function person(name) {
  // a robot: on the list before it exists, so the founder's console never shows it (scripts/robots.mjs)
  const d = await robot(admin, `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`);
  phones.push(d);
  const { data, error } = await admin.auth.admin.createUser({ email: `216${d}@phone.pointidi.app`, password: PASS, email_confirm: true, app_metadata: { phone: `+216${d}` } });
  if (error) throw error;
  users.push(data.user.id);
  await admin.from("people").upsert({ id: data.user.id, name, phone: `+216${d}`, seen: NOTES });
  return { id: data.user.id, digits: d, name };
}

let shop = null;
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
try {
  // a café a month old, paid (no banner), its owner and six regulars
  const owner = await person("سامي");
  ({ data: shop } = await admin
    .from("shops")
    .insert({ owner_id: owner.id, name: "Café Yasmine", kind: "cafe", goal: 6, gift: "قهوة بلاش", color: "#6C47FF", created_at: ago(30 * 86_400_000), paid_until: new Date(Date.now() + 300 * 86_400_000).toISOString() })
    .select("*")
    .single());
  const people = {};
  for (const n of ["أمين", "ياسمين", "كريم", "نور", "يوسف", "مريم"]) people[n] = await person(n);

  /** a card and its tampons ([minutes ago, how it came]), oldest first; a full card's gift, won and (maybe) handed over */
  const ids = {};
  async function card(who, tampons, { stamps, gift = null } = {}) {
    const { data: c } = await admin.from("cards").insert({ shop_id: shop.id, user_id: who.id, stamps: stamps ?? tampons.length, goal: 6, gift: "قهوة بلاش", last_at: ago(tampons[tampons.length - 1][0] * MIN), created_at: ago(tampons[0][0] * MIN) }).select("id").single();
    ids[who.name] = { card: c.id, moments: [] };
    for (const [mins, via] of tampons) {
      const at = ago(mins * MIN);
      const { data: m } = await admin.from("moments").insert({ shop_id: shop.id, card_id: c.id, kind: "stamp", created_at: at }).select("id").single();
      ids[who.name].moments.push(m.id);
      // a code taken at that very moment: the counter's (qr) or a link sent (link); none is a number typed
      if (via !== "number") await admin.from("codes").insert({ shop_id: shop.id, hash: randomBytes(16).toString("hex"), expires_at: at, used_at: at, used_by: who.id, online: via === "link" });
    }
    if (gift) await admin.from("moments").insert({ shop_id: shop.id, card_id: c.id, kind: "gift", gift: "قهوة بلاش", banked: true, created_at: ago(gift.won * MIN), given_at: gift.given ? ago(gift.given * MIN) : null });
  }
  await card(people["أمين"], [[3000, "qr"], [1600, "qr"], [40, "qr"]]);
  await card(people["ياسمين"], [[2900, "number"], [190, "qr"], [120, "number"]]);
  await card(people["كريم"], [[1500, "link"], [70, "link"]]);
  // a full card: its sixth tampon, the gift won with it and handed over five minutes later
  await card(people["نور"], [[9000, "qr"], [7000, "qr"], [5000, "qr"], [3100, "qr"], [1450, "qr"], [25, "qr"]], { stamps: 0, gift: { won: 25, given: 20 } });
  // a tampon from yesterday morning, more than a day old: past the time to take it back
  await card(people["مريم"], [[1600, "qr"]]);
  await card(people["يوسف"], [[1700, "qr"]]);
  // and one taken back yesterday, already
  await admin.from("cancels").insert({ shop_id: shop.id, card_id: ids["يوسف"].card, user_id: people["يوسف"].id, stamped_at: ago(1380 * MIN), via: "qr", cancelled_at: ago(1378 * MIN) });
  // the news already out: seen by this owner, so nothing covers the home
  const { data: live } = await admin.from("news").select("id").eq("active", true);
  if (live?.length) await admin.from("news_views").insert(live.map((n) => ({ news_id: n.id, person_id: owner.id })));

  console.log("\nThe rules, in the database");
  const db = createClient(URL_, ANON, { auth: { persistSession: false } });
  await db.auth.signInWithPassword({ email: `216${owner.digits}@phone.pointidi.app`, password: PASS });
  const hist = (await db.rpc("shop_history", { p_before: null })).data?.rows ?? [];
  const line = (who, kind, i = 0) => hist.filter((r) => r.who === who && r.kind === kind)[i];
  check("the history reads every tampon, gift and taking back", hist.length === 3 + 3 + 2 + 6 + 2 + 1 + 1 + 1, hist.length);
  check("…the newest first", hist.every((r, i) => i === 0 || hist[i - 1].at >= r.at));
  check("how each tampon came: the code, a link, the number", line("أمين", "stamp")?.via === "qr" && line("كريم", "stamp")?.via === "link" && line("ياسمين", "stamp")?.via === "number");
  check("a customer's newest tampon of the day can be taken back", line("أمين", "stamp")?.undo === true && line("كريم", "stamp")?.undo === true && line("ياسمين", "stamp")?.undo === true);
  check("…not the one before it", line("ياسمين", "stamp", 1)?.undo === false);
  check("…not once its gift was handed over", line("نور", "stamp")?.undo === false);
  check("…not past a day", line("مريم", "stamp")?.undo === false);
  check("the gift won and the gift handed over are two lines", !!line("نور", "won") && !!line("نور", "given"));
  check("a tampon taken back is there, with when it had been given", !!line("يوسف", "cancel")?.was);
  const late = async (who, i) => (await db.rpc("unstamp", { p_moment: ids[who].moments[i] })).data?.error;
  check("taking back the one before the newest: refused", (await late("ياسمين", 1)) === "not_last");
  check("taking back a tampon whose gift was handed over: refused", (await late("نور", 5)) === "too_late");
  check("taking back a tampon more than a day old: refused", (await late("مريم", 0)) === "too_late");
  const { data: who } = await admin.from("cards").select("stamps").eq("id", ids["ياسمين"].card).single();
  check("  → and nothing moved", who.stamps === 3, who);

  console.log("\nOn the owner's phone");
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ar-TN" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // (Chrome's word on a buzz before any tap — the counter buzzes at a scan, and a script never tapped — is not ours)
  page.on("console", (m) => m.type() === "error" && !/favicon|404|Failed to load resource|navigator\.vibrate/i.test(m.text()) && errors.push(m.text().slice(0, 200)));
  await page.goto(`${BASE}/login`, { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(1200);
  for (let i = 0; i < 6 && (await page.locator('input[name="phone"]').inputValue()) !== owner.digits; i++) {
    await page.locator('input[name="phone"]').fill(owner.digits);
    await page.waitForTimeout(700);
  }
  await page.locator('input[name="password"]').fill(PASS);
  await Promise.all([page.waitForURL((u) => u.pathname.startsWith("/shop"), { timeout: 90000 }), page.locator('button[type="submit"]').click()]);
  const center = async (loc) => {
    const b = await loc.boundingBox();
    return b && { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2), w: Math.round(b.width), h: Math.round(b.height) };
  };
  const shot = async (name) => {
    await page.waitForTimeout(700);
    // the dev server's own badge is not part of the app: out of the picture
    await page.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((e) => (e.style.display = "none")));
    await page.screenshot({ path: `${OUT}/${name}.png`, caret: "initial" });
  };
  const taps = {};

  await page.goto(`${BASE}/shop`, { waitUntil: "load" });
  const toHistory = page.getByRole("link", { name: "التاريخ", exact: false }).first();
  await toHistory.waitFor({ timeout: 30000 });
  taps.home = await center(toHistory);
  await shot("1-home");
  check("the home's «آخر حركة» opens «التاريخ»", !!taps.home);

  await toHistory.click();
  await page.waitForURL(/\/shop\/history/, { timeout: 30000 });
  const amine = page.locator("li", { hasText: "أمين خذا تامبون" }).first();
  await amine.waitFor({ timeout: 30000 });
  const undoAmine = amine.getByRole("button", { name: /تفسّخ التامبون/ });
  taps.undo = await center(undoAmine);
  await shot("2-history");
  check("the history: the day's lines, and «فسّخ» on the tampons that can be taken back", (await page.getByRole("button", { name: /تفسّخ التامبون/ }).count()) === 3, await page.getByRole("button", { name: /تفسّخ التامبون/ }).count());
  check("…and the one taken back yesterday", (await page.getByText("تامبون يوسف تفسّخ").count()) === 1);

  await undoAmine.click();
  const yes = page.getByRole("button", { name: "إيه، فسّخو" });
  await yes.waitFor({ timeout: 10000 });
  taps.yes = await center(yes);
  await shot("3-sheet");
  await yes.click();
  await page.getByText("تامبون أمين تفسّخ").first().waitFor({ timeout: 20000 });
  taps.done = await center(page.locator("li", { hasText: "تامبون أمين تفسّخ" }).first());
  await shot("4-done");
  const { data: a } = await admin.from("cards").select("stamps").eq("id", ids["أمين"].card).single();
  const { data: x } = await admin.from("cancels").select("via, stamped_at").eq("card_id", ids["أمين"].card);
  check("taken back from the history: the card one tampon less", a.stamps === 2, a);
  check("…and written down, with how it came", x?.length === 1 && x[0].via === "qr", x);

  // the other way: a customer's card, from «الحرفاء»
  await page.goto(`${BASE}/shop/customers`, { waitUntil: "load" });
  const row = page.getByRole("button", { name: /ياسمين/ }).first();
  await row.waitFor({ timeout: 30000 });
  taps.customer = await center(row);
  await shot("5-customers");
  await row.click();
  const undoCard = page.locator("[role=dialog]").getByRole("button", { name: /تفسّخ التامبون/ });
  await undoCard.waitFor({ timeout: 20000 });
  await undoCard.scrollIntoViewIfNeeded();
  taps.card = await center(undoCard);
  await shot("6-card");
  check("a customer's card: «فسّخ» on its newest tampon only", (await undoCard.count()) === 1);

  // the third way: the counter, right after the scan — a tampon for كريم lands while the code is up
  await page.goto(`${BASE}/shop/qr`, { waitUntil: "load" });
  await page.waitForTimeout(3000);
  const now = new Date().toISOString();
  await admin.from("moments").insert({ shop_id: shop.id, card_id: ids["كريم"].card, kind: "stamp", created_at: now });
  await admin.from("cards").update({ stamps: 3, last_at: now }).eq("id", ids["كريم"].card);
  const undoCounter = page.getByRole("button", { name: /تفسّخ التامبون متاع كريم/ });
  await undoCounter.waitFor({ timeout: 70000 });
  taps.counter = await center(undoCounter);
  await shot("7-counter");
  await undoCounter.click();
  await page.getByRole("button", { name: "إيه، فسّخو" }).click();
  await page.getByText("تامبون كريم تفسّخ").waitFor({ timeout: 20000 });
  await shot("8-counter-done");
  const { data: k } = await admin.from("cards").select("stamps").eq("id", ids["كريم"].card).single();
  check("the counter: «فسّخ» beside the last scan, and the card back", k.stamps === 2, k);

  check("no error on the way", errors.length === 0, errors);
  writeFileSync(`${OUT}/taps.json`, JSON.stringify(taps, null, 2));
  await ctx.close();
} catch (e) {
  failed.push(String(e?.message ?? e));
  console.log("  ✗", e);
} finally {
  await browser.close();
  if (shop) {
    await admin.from("codes").delete().eq("shop_id", shop.id);
    await admin.from("shops").delete().eq("id", shop.id);
  }
  for (const id of users) await admin.auth.admin.deleteUser(id).catch(() => {});
  await unrobot(admin, phones);
  console.log(`\n${passed} passed, ${failed.length} failed`);
  if (failed.length) process.exit(1);
}
