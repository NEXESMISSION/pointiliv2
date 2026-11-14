/**
 * Does the next version leave the shops already on Pointili exactly as they are? (14 Nov 2026, the founder:
 * «make sure this doesn't affect any of the old accounts and doesn't mess them up».) On this computer's database
 * only (localbase), never live:
 *
 *  1. the database as live has it today: the release's functions taken off (bell, choice);
 *  2. old accounts in every state live has — a plain card with vouchers waiting and given, a roulette with a turn
 *     to spin and a prize waiting, «شنوّة تبيع», the clock running, the founder's store, a trial, a paid year, the
 *     old price, the news the owners saw and did not see, a customer with cards in several shops;
 *  3. a fingerprint of every table → the release's SQL laid (as `scripts/db.mjs` will) → the fingerprint again:
 *     it must be the same, to the byte;
 *  4. every old owner and customer opens every page of the new app: no error, and their own numbers on it;
 *  5. the business tables after all those visits: unchanged (opening a page writes no data of theirs);
 *  6. the old states still work: a voucher from before handed over at the counter, a tampon given to an old
 *     customer, an old roulette turn spun, the bell opened.
 *
 * Every account is a robot (scripts/robots.mjs), removed at the end.
 *   BASE=http://localhost:3302 node scripts/legacy-check.mjs
 */
import { readFileSync } from "node:fs";
import { config } from "dotenv";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const BASE = process.env.BASE || "http://localhost:3302";
const LOCAL = process.env.LOCAL_SQL_URL;
if (!LOCAL || !/127\.0\.0\.1|localhost/.test(LOCAL) || !/localhost|127\.0\.0\.1/.test(BASE) || !/127\.0\.0\.1|localhost/.test(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")) {
  throw new Error("legacy-check runs on this computer's database only (localbase)");
}
const sql = async (query) => {
  const r = await fetch(LOCAL, { method: "POST", headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
  const text = await r.text();
  if (!r.ok) throw new Error(`SQL: HTTP ${r.status} — ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : null;
};
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const PASS = "legacy-check-2026";
const NOTES = ["card_hello", "coach", "logo_tip", "offer", "push", "install", "first_scan", "first_gift", "mission", "links_tip", "new_insights", "reset_tip"];
const HOUR = 3600_000;
const DAY = 24 * HOUR;
const ago = (ms) => new Date(Date.now() - ms).toISOString();
const RELEASE = ["supabase/bell-2026-11-13.sql", "supabase/choice-2026-11-13.sql"];
const RELEASE_FNS = [
  "public.bell_for(public.news, uuid, timestamptz)",
  "public.my_bell()",
  "public.my_inbox()",
  "public.bell_read()",
  "public.set_gift_choices(text[])",
  "public.choose_gift(bigint, text)",
  "public.card_choices(uuid)",
  "public.gift_options(text)",
];

let pass = 0;
let fail = 0;
const check = (label, ok, info) => {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "  ✓" : "  ✗"} ${label}${ok || info === undefined ? "" : ` — ${typeof info === "string" ? info : JSON.stringify(info)}`}`);
};

// ── the fingerprint: each table's rows, in order, hashed (people without what a visit writes on its own) ──
const TRACKING = ["visits", "views", "taps", "signals", "guard_log", "tries", "blocks", "codes", "news_views", "id_entries", "id_forms"];
const PEOPLE_COLS = "id, name, phone, is_admin, created_at, code, is_tester, password_set, made_by_shop";
async function fingerprint({ business = false } = {}) {
  const tables = (await sql("select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by 1")).map((r) => r.table_name);
  const out = {};
  for (const t of tables) {
    if (business && TRACKING.includes(t)) continue;
    // shops.offer_at: main's my_payment() starts the offer's clock the first time an unpaid owner's page asks for
    // it — live does the same today, the release changes nothing there (schema.sql is main's)
    const shopCols = t === "shops" && business ? (await sql("select string_agg(column_name, ', ' order by ordinal_position) as c from information_schema.columns where table_schema = 'public' and table_name = 'shops' and column_name <> 'offer_at'"))[0].c : null;
    const from = t === "people" && business ? `(select ${PEOPLE_COLS} from public.people) x` : shopCols ? `(select ${shopCols} from public.shops) x` : `public.${t} x`;
    const [r] = await sql(`select count(*)::int as n, md5(coalesce(string_agg(x::text, '|' order by x::text), '')) as h from ${from}`);
    out[t] = `${r.n}:${r.h}`;
  }
  return out;
}
const diff = (a, b) => Object.keys({ ...a, ...b }).filter((k) => a[k] !== b[k]);

// ── the people ──
const phones = [];
const users = [];
async function person(name, extra = {}) {
  const d = await robot(admin, `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`);
  phones.push(d);
  const { data, error } = await admin.auth.admin.createUser({ email: `216${d}@phone.pointidi.app`, password: PASS, email_confirm: true, app_metadata: { phone: `+216${d}` } });
  if (error) throw error;
  users.push(data.user.id);
  await admin.from("people").upsert({ id: data.user.id, name, phone: `+216${d}`, seen: NOTES, password_set: true, created_at: ago(60 * DAY), ...extra });
  const { data: row } = await admin.from("people").select("code").eq("id", data.user.id).single();
  return { id: data.user.id, digits: d, name, code: row.code };
}
async function shopOf(owner, fields) {
  const { data, error } = await admin
    .from("shops")
    .insert({ owner_id: owner.id, kind: "cafe", color: "#ff6b4a", created_at: ago(45 * DAY), trial_first: false, stamp_gap: 0, ...fields })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
/** an old card: its tampons over the weeks, the vouchers it won (waiting or given) */
async function oldCard(shop, who, stamps, { waiting = 0, given = 0, lastDays = 2, wheelTurn = false, wheelWon = null, item = null } = {}) {
  const { data: c, error } = await admin
    .from("cards")
    .insert({ shop_id: shop.id, user_id: who.id, stamps, goal: shop.goal, gift: shop.gift, gifts: waiting + given, last_at: ago(lastDays * DAY), created_at: ago(40 * DAY) })
    .select("id")
    .single();
  if (error) throw error;
  // every row with every column said (a bulk insert fills a missing one with null, not its default)
  const row = (o) => ({ shop_id: shop.id, card_id: c.id, kind: "stamp", gift: null, banked: false, wheel: false, spun_at: null, given_at: null, item_id: null, ...o });
  const rows = [];
  for (let i = 0; i < stamps + (waiting + given) * (shop.goal ?? 8); i++) rows.push(row({ item_id: item, created_at: ago((lastDays + i) * DAY + 3 * HOUR) }));
  for (let i = 0; i < given; i++) rows.push(row({ kind: "gift", gift: shop.gift, banked: true, given_at: ago((lastDays + 5 + i) * DAY), created_at: ago((lastDays + 6 + i) * DAY) }));
  for (let i = 0; i < waiting; i++) rows.push(row({ kind: "gift", gift: shop.gift, banked: true, created_at: ago((lastDays + 1 + i) * DAY) }));
  if (wheelTurn) rows.push(row({ kind: "gift", gift: "الروليت", wheel: true, banked: true, created_at: ago(lastDays * DAY) }));
  if (wheelWon) rows.push(row({ kind: "gift", gift: wheelWon, wheel: true, spun_at: ago(lastDays * DAY), banked: true, created_at: ago((lastDays + 1) * DAY) }));
  if (rows.length) {
    const { error: e2 } = await admin.from("moments").insert(rows);
    if (e2) throw e2;
  }
  return c.id;
}

let browser;
let clockWas = null;
const contexts = [];
// the shops' rows, to say which column a visit wrote (step 5)
const shopRows = async (ids) => (await admin.from("shops").select("*").in("id", ids)).data ?? [];
async function signIn(who) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "ar-TN" });
  contexts.push(ctx);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${BASE}/login`, { waitUntil: "load", timeout: 90000 });
  await page.locator('input[name="phone"]').fill(who.digits);
  await page.locator('input[name="password"]').fill(PASS);
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 90000 }), page.locator('button[type="submit"]').click()]);
  return { page, errors };
}
/** a page opened as it is: its status, no Next error, no crash in the browser, and what it says */
async function open(s, path, label) {
  s.errors.length = 0;
  const res = await s.page.goto(BASE + path, { waitUntil: "load", timeout: 90000 });
  await s.page.waitForTimeout(700);
  const status = res?.status() ?? 0;
  // the dev server's own portal is always there on next dev: an error IN it is what counts (as scripts/sizes.mjs)
  const overlay = await s.page.evaluate(() => {
    const said = [...document.querySelectorAll("nextjs-portal")].map((e) => e.shadowRoot?.textContent ?? "").join(" ");
    return said.match(/(Build Error|Runtime Error|Unhandled Runtime Error|Console Error|Module not found|Failed to compile)[^.]{0,120}/)?.[0] ?? null;
  });
  const text = await s.page.locator("body").innerText().catch(() => "");
  const broken = /Application error|Internal Server Error|This page could not be found|Unhandled Runtime Error/i.test(text) || !text.trim();
  check(`${label}: ${path} opens (${status})`, status > 0 && status < 400 && !overlay && !broken && s.errors.length === 0, { status, overlay, broken, errors: s.errors.slice(0, 2), at: s.page.url() });
  return text;
}

try {
  console.log("\n1. The database as live has it today (the release's functions off)");
  await sql(RELEASE_FNS.map((f) => `drop function if exists ${f};`).join("\n"));
  const left = await sql("select count(*)::int as n from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('bell_for','my_bell','my_inbox','bell_read','gift_options','set_gift_choices','choose_gift','card_choices')");
  check("none of the release's functions in the database", left[0].n === 0, left);

  console.log("\n2. Old accounts, in every state live has");
  // the founder's switch for the card's clock: on for every shop on live (13 Nov 2026)
  clockWas = (await admin.from("settings").select("value").eq("key", "clock_on").maybeSingle()).data?.value ?? null;
  await admin.from("settings").upsert({ key: "clock_on", value: "1" });
  for (const ip of ["local", "::1", "127.0.0.1"]) for (const k of [`join-ip:${ip}`, `login-ip:${ip}`]) await admin.rpc("forget_tries", { p_key: k });
  // a plain café, paid for the year, with regulars: vouchers waiting (one, two), given, a card half way
  const oCafe = await person("هشام");
  const cafe = await shopOf(oCafe, { name: "Café El Ancien", goal: 8, gift: "قهوة بلاش", paid_until: ago(-200 * DAY) });
  // a barber on the roulette: a turn to spin, a prize waiting
  const oBarber = await person("وليد");
  const barber = await shopOf(oBarber, { name: "Barber Ancien", kind: "barber", goal: 6, gift: "الروليت", wheel_on: true, wheel_allowed: true, color: "#1d5fa8", paid_until: ago(-30 * DAY) });
  await admin.from("wheel_prizes").insert([
    { shop_id: barber.id, name: "تحسينة بلاش", chance: 50, rank: 0 },
    { shop_id: barber.id, name: "جال", chance: 30, rank: 1, stock: 3 },
    { shop_id: barber.id, name: "ريميز 20%", chance: 20, rank: 2 },
  ]);
  // a perfume shop that says what it sells (its tampons each on a thing)
  const oPerfume = await person("سنية");
  const perfume = await shopOf(oPerfume, { name: "Parfums Ancien", kind: "perfume", goal: 5, gift: "عطر صغير بلاش", items_on: true, color: "#7c3aed", trial_days: 7 });
  const { data: things, error: eItems } = await admin.from("items").insert([{ shop_id: perfume.id, name: "عطر كبير", rank: 0 }, { shop_id: perfume.id, name: "عطر صغير", rank: 1 }]).select("id");
  if (eItems || !things?.length) throw new Error(`items: ${eItems?.message ?? "none back"}`);
  // a car wash with the clock: 15 days with no tampon and a card starts over (set 10 days ago)
  const oWash = await person("كريم");
  const wash = await shopOf(oWash, { name: "Lavage Ancien", kind: "carwash", goal: 5, gift: "لافاج بلاش", reset_days: 15, reset_since: ago(10 * DAY), color: "#0e9384", old_price: true, paid_until: ago(-100 * DAY) });
  // the founder's store (none on live, 13 Nov — but it exists): tampons spent on things
  const oStore = await person("منية");
  const store = await shopOf(oStore, { name: "Store Ancien", kind: "bakery", goal: 10, gift: "خبزة بلاش", store_on: true, color: "#b45309" });
  await admin.from("store_items").insert([{ shop_id: store.id, name: "كرواسون", cost: 4, rank: 0 }, { shop_id: store.id, name: "خبزة", cost: 3, rank: 1 }]);
  // a shop still on its trial, no customer yet
  const oNew = await person("آمنة");
  const fresh = await shopOf(oNew, { name: "Salon Ancien", kind: "hair", goal: 5, gift: "بروشينغ بلاش", created_at: ago(1 * DAY), trial_days: 3 });

  const nour = await person("نور");
  const amine = await person("أمين");
  const salma = await person("سلمى");
  const yassine = await person("ياسين");
  const cards = {
    nourCafe: await oldCard(cafe, nour, 3, { waiting: 1, given: 1 }),
    amineCafe: await oldCard(cafe, amine, 6, { waiting: 2, lastDays: 1 }),
    salmaCafe: await oldCard(cafe, salma, 0, { given: 2, lastDays: 4 }),
    nourBarber: await oldCard(barber, nour, 2, { wheelTurn: true }),
    amineBarber: await oldCard(barber, amine, 1, { wheelWon: "جال" }),
    salmaPerfume: await oldCard(perfume, salma, 3, { item: things[0].id }),
    yassineWash: await oldCard(wash, yassine, 4, { lastDays: 12 }),
    nourStore: await oldCard(store, nour, 9),
    // an owner is somebody's customer too
    hichemBarber: await oldCard(barber, oCafe, 4),
  };
  // the news: one for everyone after the shops opened (some saw it), one for one owner, one for testers
  const { data: news, error: eNews } = await admin
    .from("news")
    .insert(
      [
        { title: "جديد: تفسّخ تامبون غالط", body: "غلطت؟ تنجم تفسّخ آخر تامبون.", icon: "sparkles", cta_label: "شوف التاريخ", cta_href: "/shop/history", published_at: ago(3 * DAY) },
        { title: "الأبونمان متاعك تفعّل", body: "Merci pour votre confiance.", icon: "crown", cta_label: "شوف الأبونمان", cta_href: "/shop/pay", published_at: ago(5 * DAY), only_people: [oCafe.id] },
        { title: "للتسترز برك", body: "…", published_at: ago(2 * DAY), only_testers: true },
      ].map((n) => ({ icon: "sparkles", body: "", cta_label: null, cta_href: null, only_people: null, only_testers: false, active: true, pic: null, steps: null, ...n })),
    )
    .select("id");
  if (eNews || news?.length !== 3) throw new Error(`news: ${eNews?.message ?? JSON.stringify(news)}`);
  await admin.from("news_views").insert([{ news_id: news[0].id, person_id: oBarber.id }]);
  check("old accounts made: 6 shops, 4 customers, 9 cards, 3 news", Object.keys(cards).length === 9 && news.length === 3);

  console.log("\n3. The release's SQL on top of them: nothing of theirs moves");
  const before = await fingerprint();
  for (const f of RELEASE) await sql(readFileSync(f, "utf8"));
  await sql("select pg_notify('pgrst', 'reload schema')");
  const after = await fingerprint();
  const moved = diff(before, after);
  check(`every table the same after the release's SQL (${Object.keys(after).length} tables)`, moved.length === 0, moved);
  const fns = await sql("select count(*)::int as n from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('bell_for','my_bell','my_inbox','bell_read','gift_options','set_gift_choices','choose_gift','card_choices')");
  check("…and the release's 8 functions are there", fns[0].n === 8, fns);
  await new Promise((r) => setTimeout(r, 1500));

  console.log("\n4. Every old owner and customer, every page of the new version");
  const business0 = await fingerprint({ business: true });
  const allShops = [cafe, barber, perfume, wash, store, fresh].map((x) => x.id);
  const shops0 = await shopRows(allShops);
  browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const OWNER_PAGES = ["/shop", "/shop/settings", "/shop/options", "/shop/customers", "/shop/card", "/shop/stats", "/shop/insights", "/shop/history", "/shop/pay", "/shop/inbox", "/shop/links", "/shop/collect?by=phone", "/shop/choices", "/wallet"];
  for (const [o, shop, extra] of [
    [oCafe, cafe, []],
    [oBarber, barber, ["/shop/wheel"]],
    [oPerfume, perfume, ["/shop/items"]],
    [oWash, wash, ["/shop/clock"]],
    [oStore, store, ["/shop/store"]],
    [oNew, fresh, []],
  ]) {
    console.log(`  — ${shop.name}`);
    const s = await signIn(o);
    for (const p of [...OWNER_PAGES, ...extra]) {
      const text = await open(s, p, shop.name);
      if (p === "/shop") check(`${shop.name}: the home says its name`, text.includes(shop.name));
      if (p === "/shop/settings") check(`${shop.name}: «المحل» has «خيارات الكارط», the card's line as before`, text.includes("خيارات الكارط") && (shop.store_on || text.includes(String(shop.goal))));
      if (p === "/shop/options" && shop.wheel_on) check(`${shop.name}: «خيارات الكارط» says the roulette is on`, text.includes("مشعلة: الكادو هو دورة في الروليت"));
      if (p === "/shop/options" && shop.reset_days) check(`${shop.name}: …and the clock (15 days)`, /15 يوم/.test(text) || text.includes("15"));
      if (p === "/shop/options" && shop.items_on) check(`${shop.name}: …and «شنوّة تبيع» on`, text.includes("مشعلة: الكاسة تسأل"));
      if (p === "/shop/options") check(`${shop.name}: the gift is one thing, not a choice`, !shop.store_on ? text.includes("مطفي: الكادو واحد") : !text.includes("الحريف يختار الكادو"));
      if (p === "/shop/customers" && shop.id === cafe.id) check("Café El Ancien: its three regulars are listed", ["نور", "أمين", "سلمى"].every((n) => text.includes(n)));
      if (p === "/shop/inbox" && shop.id === cafe.id) check("the bell lists the news for everyone and the owner's own, not the testers'", text.includes("تفسّخ تامبون غالط") && text.includes("الأبونمان متاعك تفعّل") && !text.includes("للتسترز"));
      if (p === "/shop/inbox" && shop.id === fresh.id) check("a shop opened after the news: its bell has none of it", !text.includes("تفسّخ تامبون غالط"));
    }
  }
  for (const [who, mine] of [
    [nour, [["nourCafe", "Café El Ancien"], ["nourBarber", "Barber Ancien"], ["nourStore", "Store Ancien"]]],
    [amine, [["amineCafe", "Café El Ancien"], ["amineBarber", "Barber Ancien"]]],
    [salma, [["salmaCafe", "Café El Ancien"], ["salmaPerfume", "Parfums Ancien"]]],
    [yassine, [["yassineWash", "Lavage Ancien"]]],
  ]) {
    console.log(`  — ${who.name} (customer)`);
    const s = await signIn(who);
    const wallet = await open(s, "/", who.name);
    check(`${who.name}: the wallet shows every card`, mine.every(([, n]) => wallet.includes(n)));
    for (const [key, name] of mine) {
      const text = await open(s, `/c/${cards[key]}`, `${who.name} at ${name}`);
      if (key === "amineCafe") check("Amine's two vouchers from before still wait on his card", /2/.test(text) && text.includes("قهوة بلاش"));
      if (key === "nourCafe") check("Nour's voucher from before waits, nothing to choose", text.includes("قهوة بلاش") && !text.includes("اختار الكادو متاعك"));
    }
  }
  const business1 = await fingerprint({ business: true });
  const touched = diff(business0, business1);
  if (touched.includes("shops")) {
    const shops1 = await shopRows(allShops);
    for (const a of shops0) {
      const b = shops1.find((x) => x.id === a.id);
      const cols = Object.keys(a).filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b?.[k]));
      if (cols.length) console.log(`    · ${a.name}: ${cols.map((k) => `${k} ${JSON.stringify(a[k])} → ${JSON.stringify(b?.[k])}`).join(", ")}`);
    }
  }
  check("5. after all those visits, none of their data moved (shops, cards, tampons, vouchers, prizes, store, news…)", touched.length === 0, touched);

  console.log("\n6. The old states still work in the new version");
  {
    const s = await signIn(oCafe);
    // Amine's vouchers from before, handed over at the counter from his code
    await s.page.goto(BASE + "/shop/collect?by=code", { waitUntil: "load" });
    await s.page.getByRole("textbox").fill(amine.code);
    const giveAll = s.page.getByRole("button", { name: /عطيه الـ2 الكل|إيه، عطيه الكادو/ }).first();
    await giveAll.waitFor({ timeout: 20000 });
    await giveAll.click();
    await s.page.getByRole("heading", { name: /خذا/ }).waitFor({ timeout: 20000 });
    const { data: waitingNow } = await admin.from("moments").select("id").eq("card_id", cards.amineCafe).eq("kind", "gift").is("given_at", null);
    check("Amine's old vouchers handed over at the counter", (waitingNow ?? []).length === 0, waitingNow);
    // and a tampon on top, for an old customer
    const { data: c0 } = await admin.from("cards").select("stamps").eq("id", cards.amineCafe).single();
    await s.page.getByRole("button", { name: /زيد تامبون/ }).click();
    await s.page.getByRole("button", { name: "غلطت؟ فسّخ التامبون" }).waitFor({ timeout: 20000 });
    const { data: c1 } = await admin.from("cards").select("stamps").eq("id", cards.amineCafe).single();
    check("…and a new tampon lands on his old card", c1.stamps === c0.stamps + 1, { before: c0.stamps, after: c1.stamps });
    // the bell: opened, it is read (and its count goes)
    await s.page.goto(BASE + "/shop/inbox", { waitUntil: "load" });
    await s.page.waitForTimeout(1500);
    const unread = await sql(`select count(*)::int as n from public.news n where n.id in ('${news[0].id}','${news[1].id}') and not exists (select 1 from public.news_views w where w.news_id = n.id and w.person_id = '${oCafe.id}')`);
    check("the bell opened: its news read", unread[0].n === 0, unread);
  }
  {
    const s = await signIn(nour);
    await s.page.goto(BASE + `/c/${cards.nourBarber}`, { waitUntil: "load" });
    const spin = s.page.getByRole("button", { name: "دوّر" }).first();
    await spin.waitFor({ timeout: 20000 });
    await spin.click();
    await s.page.waitForTimeout(7000);
    const { data: turn } = await admin.from("moments").select("spun_at, gift").eq("card_id", cards.nourBarber).eq("wheel", true).single();
    check("Nour's old roulette turn spins in the new version", !!turn?.spun_at && turn.gift !== "الروليت", turn);
  }
} catch (e) {
  fail++;
  console.log("  ✗ stopped:", e.message);
} finally {
  for (const c of contexts) await c.close().catch(() => {});
  await (clockWas === null ? admin.from("settings").delete().eq("key", "clock_on") : admin.from("settings").upsert({ key: "clock_on", value: clockWas }));
  await browser?.close().catch(() => {});
  for (const id of users) await admin.from("shops").delete().eq("owner_id", id);
  await admin.from("news").delete().in("title", ["جديد: تفسّخ تامبون غالط", "الأبونمان متاعك تفعّل", "للتسترز برك"]);
  for (const id of users) await admin.auth.admin.deleteUser(id).catch(() => {});
  await unrobot(admin, phones);
  console.log(`\n${pass} ✓ · ${fail} ✗ (accounts removed)`);
  process.exit(fail ? 1 : 0);
}
