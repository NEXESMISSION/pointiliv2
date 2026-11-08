/**
 * The owner's customers file and the founder's typed subscription (8 Nov 2026, the founder: «in the
 * export of the client db for the owner add the phone number of the client, more structured … how many
 * tampons he had … he can only export once every week» and «add the option of typing the number of
 * months I want and an option to type the payment method manually»).
 *
 * A throwaway shop with three customers (one close to its gift with a gift already taken, one away for
 * forty days, one who never got a tampon) and the owner's own card, which the file leaves out. The owner
 * downloads the file from «المحل» like a person (the phone's download), and the script opens it: three
 * sheets, the whole numbers, the counts. Then the week: the same file again within its half hour, the
 * row locked an hour later with the date of the next one (and the link answering 429), open again after
 * eight days. Then a throwaway founder turns a subscription on with months and a way typed by hand.
 * Accounts deleted at the end; pictures and the file in .e2e/export-week/.
 *
 *   node scripts/export-week.mjs   (from v2/, dev server on :3200 — or BASE=)
 */
import { mkdirSync, readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import { config } from "dotenv";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const BASE = process.env.BASE || "http://localhost:3200";
const OUT = ".e2e/export-week";
mkdirSync(OUT, { recursive: true });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
for (const ip of ["local", "::1", "127.0.0.1"]) await admin.rpc("forget_tries", { p_key: `login-ip:${ip}` });
const PASS = "export-week-e2e-2026";
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

async function person(name, { isAdmin = false } = {}) {
  const d = await robot(admin, `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`);
  phones.push(d);
  const { data, error } = await admin.auth.admin.createUser({ email: `216${d}@phone.pointidi.app`, password: PASS, email_confirm: true, app_metadata: { phone: `+216${d}` } });
  if (error) throw error;
  made.push(data.user.id);
  await admin.from("people").upsert({ id: data.user.id, name, phone: `+216${d}`, seen: NOTES, is_admin: isAdmin });
  const { data: live } = await admin.from("news").select("id").eq("active", true);
  if (live?.length) await admin.from("news_views").insert(live.map((n) => ({ news_id: n.id, person_id: data.user.id })));
  return { id: data.user.id, digits: d };
}
const must = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};
/** a card with its tampons: `stamps` moments, `daysAgo` apart from the oldest; a gift taken when `gift` */
async function card(shop, who, { created, stamps, onCard, last, gift = false }) {
  const c = must(await admin.from("cards").insert({ shop_id: shop.id, user_id: who.id, stamps: onCard, goal: shop.goal, gift: shop.gift, created_at: at(-created * DAY), last_at: last === null ? null : at(-last * DAY) }).select("id").single());
  const moments = stamps.map((d) => ({ shop_id: shop.id, card_id: c.id, kind: "stamp", created_at: at(-d * DAY) }));
  if (gift) moments.push({ shop_id: shop.id, card_id: c.id, kind: "gift", gift: shop.gift, created_at: at(-50 * DAY), given_at: at(-49 * DAY) });
  if (moments.length) must(await admin.from("moments").insert(moments));
  return c.id;
}

/* ---------- reading the file back: our own zip (deflated, no data descriptors) ---------- */
function unzip(buf) {
  const files = {};
  let o = 0;
  while (buf.readUInt32LE(o) === 0x04034b50) {
    const method = buf.readUInt16LE(o + 8);
    const size = buf.readUInt32LE(o + 18);
    const nameLen = buf.readUInt16LE(o + 26);
    const extra = buf.readUInt16LE(o + 28);
    const name = buf.toString("utf8", o + 30, o + 30 + nameLen);
    const data = buf.subarray(o + 30 + nameLen + extra, o + 30 + nameLen + extra + size);
    files[name] = (method === 8 ? inflateRawSync(data) : data).toString("utf8");
    o += 30 + nameLen + extra + size;
  }
  return files;
}
const texts = (xml) => [...xml.matchAll(/<t xml:space="preserve">([^<]*)<\/t>/g)].map((m) => m[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
const rowsOf = (xml) => [...xml.matchAll(/<row r="(\d+)">(.*?)<\/row>/g)].map((m) => m[2]);
/** a cell's number by its column letter in one row's XML */
const num = (row, col) => {
  const m = row.match(new RegExp(`<c r="${col}\\d+"[^>]*><v>([^<]*)</v>`));
  return m ? Number(m[1]) : null;
};

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ar-TN", acceptDownloads: true };
const desk = { viewport: { width: 1280, height: 900 }, locale: "ar-TN" };
async function signIn(who, ctxOpts) {
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
const go = async (page, path) => {
  await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 90000 });
  await page.locator("main, h1").first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(1500);
};
const exportRow = (page) => page.locator("a[href='/api/export'], div[aria-disabled='true']").filter({ hasText: "تحميل البيانات" });

try {
  // the shop, its customers, and the owner's own card
  const owner = await person("رياض");
  const shop = must(
    await admin
      .from("shops")
      .insert({ owner_id: owner.id, name: "Café Export", kind: "cafe", goal: 6, gift: "قهوة بلاش", color: "#6C47FF", trial_first: false, trial_days: 3, created_at: at(-70 * DAY), paid_until: at(30 * DAY), export_allowed: true })
      .select("*")
      .single(),
  );
  const near = await person("سنية");
  const away = await person("كريم");
  const never = await person("ليلى");
  // سنية: 11 tampons — a full card (its gift taken) and 5 on the new one, the last two days ago
  await card(shop, near, { created: 65, stamps: [64, 60, 58, 55, 52, 50, 20, 10, 6, 4, 2], onCard: 5, last: 2, gift: true });
  // كريم: 2 tampons, the last 40 days ago
  await card(shop, away, { created: 45, stamps: [44, 40], onCard: 2, last: 40 });
  // ليلى: joined yesterday, no tampon yet
  await card(shop, never, { created: 1, stamps: [], onCard: 0, last: null });
  // the owner's own card (a try): never in the file
  await card(shop, owner, { created: 69, stamps: [69], onCard: 1, last: 69 });

  console.log("\n① The owner downloads the customers file from «المحل»");
  const o = await signIn(owner, phone);
  await go(o.page, "/shop/settings");
  const row = exportRow(o.page);
  check("the row is there, a link, saying «مرّة في الجمعة»", (await o.page.locator("a[href='/api/export']").count()) === 1 && (await row.innerText()).includes("مرّة في الجمعة"), await row.innerText().catch(() => ""));
  await shot(o.page, "1-settings-open");
  const [download] = await Promise.all([o.page.waitForEvent("download", { timeout: 30000 }), o.page.locator("a[href='/api/export']").click()]);
  const file = `${OUT}/${download.suggestedFilename()}`;
  await download.saveAs(file);
  check("a file comes: pointili-clients-<day>.xlsx", /^pointili-clients-\d{4}-\d{2}-\d{2}\.xlsx$/.test(download.suggestedFilename()), download.suggestedFilename());

  const x = unzip(readFileSync(file));
  const sheetNames = [...(x["xl/workbook.xml"] ?? "").matchAll(/<sheet name="([^"]+)"/g)].map((m) => m[1]);
  check("three sheets: ملخّص, الحرفاء, كل شهر", sheetNames.join("|") === "ملخّص|الحرفاء|كل شهر", sheetNames);
  const sum = x["xl/worksheets/sheet1.xml"] ?? "";
  const list = x["xl/worksheets/sheet2.xml"] ?? "";
  const months = x["xl/worksheets/sheet3.xml"] ?? "";
  const listRows = rowsOf(list);
  check("«الحرفاء»: a head and three customers — never the owner's own card", listRows.length === 4 && !texts(list).includes("رياض"), listRows.length);
  const words = texts(list);
  check("…the whole numbers, +216 XX XXX XXX", [near, away, never].every((p) => words.includes(`+216 ${p.digits.slice(0, 2)} ${p.digits.slice(2, 5)} ${p.digits.slice(5)}`)), words.filter((w) => w.startsWith("+216")));
  check("…the owner's number nowhere", !words.some((w) => w.replace(/\D/g, "").endsWith(owner.digits)));
  check("…its head: name, phone, the card now, left to the gift, every tampon, gifts, dates, days, state", ["الاسم", "التليفون", "في الكارط توّا", "باقيلو للكادو", "كل التامبونات", "كادوات خذاهم", "كادوات تستنّى", "أوّل مرّة", "آخر تامبون", "أيّام من آخر تامبون", "الحالة"].every((h) => words.includes(h)), words.slice(0, 12));
  // the latest first: سنية (2 days), كريم (40 days), ليلى (none)
  const [, r1, r2, r3] = listRows;
  check("…سنية first: 5 on the card, 1 left, 11 tampons, 1 gift taken, 2 days, «نشيط»", texts(r1)[0] === "سنية" && num(r1, "C") === 5 && num(r1, "D") === 1 && num(r1, "E") === 11 && num(r1, "F") === 1 && num(r1, "G") === 0 && num(r1, "J") === 2 && texts(r1).includes("نشيط"), { t: texts(r1), C: num(r1, "C"), E: num(r1, "E"), J: num(r1, "J") });
  check("…كريم: 2 tampons, 40 days, «غايب»", texts(r2)[0] === "كريم" && num(r2, "E") === 2 && num(r2, "J") === 40 && texts(r2).includes("غايب"), texts(r2));
  check("…ليلى: no tampon, «ما خذا حتى تامبون», no days", texts(r3)[0] === "ليلى" && num(r3, "E") === 0 && num(r3, "J") === null && texts(r3).includes("ما خذا حتى تامبون"), texts(r3));
  check("…dates are real dates (sortable), the head frozen, a filter on every column", /<c r="H2" s="3"><v>\d+<\/v>/.test(list) && /<c r="I2" s="2"><v>[\d.]+<\/v>/.test(list) && list.includes('state="frozen"') && list.includes('<autoFilter ref="A1:K4"/>'), list.slice(0, 200));
  check("…no clock on this shop: no «الكارط ترجع للصفر» column", !words.includes("الكارط ترجع للصفر"));
  const sumWords = texts(sum);
  const sumRows = rowsOf(sum);
  const valueOf = (label) => {
    const r = sumRows.find((x) => texts(x)[0] === label);
    return r ? num(r, "B") : undefined;
  };
  check("«ملخّص»: the shop's name, 3 customers, 1 came in 30 days, 1 new, none away over 60 days", sumWords[0] === "Café Export" && valueOf("الحرفاء الكل") === 3 && valueOf("جاو في آخر 30 يوم") === 1 && valueOf("حرفاء جدد في آخر 30 يوم") === 1 && valueOf("ما جاوش أكثر من 60 يوم") === 0, { first: sumWords[0], n: valueOf("الحرفاء الكل") });
  check("…13 tampons, 1 gift taken, 0 waiting, 1 a tampon from the gift", valueOf("التامبونات الكل") === 13 && valueOf("كادوات خذاوهم") === 1 && valueOf("كادوات تستنّى") === 0 && valueOf("باقيلهم تامبون واحد للكادو") === 1);
  check("…the best customer: سنية · 11 تامبون", sumWords.includes("سنية · 11 تامبون"), sumWords);
  check("…the card: «6 تامبونات · قهوة بلاش», and when the next file can be taken", sumWords.includes("6 تامبونات · قهوة بلاش") && sumWords.includes("الفيشي الجاي"), sumWords);
  const monthRows = rowsOf(months).slice(1);
  const monthTotal = monthRows.reduce((n, r) => n + (num(r, "C") ?? 0), 0);
  const monthNew = monthRows.reduce((n, r) => n + (num(r, "B") ?? 0), 0);
  check("«كل شهر»: its tampons add up to 13, its new customers to 3, the latest month first", monthTotal === 13 && monthNew === 3 && texts(monthRows[0] ?? "")[0] >= texts(monthRows.at(-1) ?? "")[0], { monthTotal, monthNew });

  console.log("\n② Once a week");
  await o.page.waitForTimeout(3000);
  check("right after: the row says it is taken, and when the next one comes", (await row.innerText()).includes("حمّلتو · الفيشي الجاي"), await row.innerText());
  await shot(o.page, "2-settings-taken");
  const again = await o.page.evaluate(async () => (await fetch("/api/export")).status);
  check("…the same file again within the half hour: 200", again === 200, again);
  const { data: after1 } = await admin.from("shops").select("export_at").eq("id", shop.id).single();
  check("…and the week still starts from the first one", !!after1?.export_at && Date.now() - Date.parse(after1.export_at) < 5 * 60_000, after1);
  await admin.from("shops").update({ export_at: at(-60 * 60_000) }).eq("id", shop.id);
  await go(o.page, "/shop/settings");
  check("an hour later: no link any more, the row says when the next file comes", (await o.page.locator("a[href='/api/export']").count()) === 0 && (await exportRow(o.page).innerText()).includes("الفيشي الجاي"), await exportRow(o.page).innerText().catch(() => ""));
  const locked = await o.page.evaluate(async () => {
    const r = await fetch("/api/export");
    return { status: r.status, body: await r.json().catch(() => null) };
  });
  check("…the link itself answers 429, «too_soon», with the date", locked.status === 429 && locked.body?.error === "too_soon" && !!locked.body?.next, locked);
  await shot(o.page, "3-settings-locked");
  await admin.from("shops").update({ export_at: at(-8 * DAY) }).eq("id", shop.id);
  await go(o.page, "/shop/settings");
  check("eight days later: the link is back", (await o.page.locator("a[href='/api/export']").count()) === 1 && (await exportRow(o.page).innerText()).includes("مرّة في الجمعة"));
  await o.ctx.close();

  console.log("\n③ The founder: months and the way it came, typed");
  const boss = await person("Boss", { isAdmin: true });
  const b = await signIn(boss, desk);
  await go(b.page, `/admin/shop/${shop.id}`);
  check("the console says the owner took the file, numbers whole, once a week", (await b.page.getByText("مرّة في الجمعة").first().innerText().catch(() => "")).includes("آخر تحميل"));
  await b.page.getByRole("button", { name: "خدّم الأبونمان" }).click();
  const monthsBox = b.page.getByRole("textbox", { name: "ولا اكتب عدد الشهور" });
  await monthsBox.fill("150");
  check("150 months: «من 1 لـ 120», nothing to turn on", (await b.page.getByText("من 1 لـ 120").count()) === 1 && (await b.page.getByRole("button", { name: /^خدّم/ }).last().isDisabled()));
  await monthsBox.fill("4");
  const goBtn = b.page.getByRole("button", { name: /^خدّم 4/ });
  check("4 months typed: the amount must be said first", (await goBtn.isDisabled()) && (await b.page.getByText("اكتب المبلغ اللي خلّصو").count()) === 1);
  await b.page.getByRole("textbox", { name: "ولا مبلغ آخر" }).fill("100");
  await b.page.getByRole("textbox", { name: "ولا اكتب كيفاش" }).fill("  بريد تونسي ");
  await shot(b.page, "4-admin-typed");
  check("…then it can be turned on", !(await goBtn.isDisabled()));
  await goBtn.click();
  const pic = await b.page.getByText("تصويرة الأبونمان").first().waitFor({ timeout: 20000 }).then(() => true, () => false);
  check("…turned on: its picture opens", pic);
  await shot(b.page, "5-admin-picture");
  const { data: log1 } = await admin.from("plan_log").select("kind, months, amount, method").eq("shop_id", shop.id).order("id", { ascending: false }).limit(1).single();
  check("…written: 4 months, 100 د, «بريد تونسي»", log1?.kind === "paid" && log1.months === 4 && log1.amount === 100 && log1.method === "بريد تونسي", log1);
  const { data: s1 } = await admin.from("shops").select("paid_until").eq("id", shop.id).single();
  const addedDays = (Date.parse(s1.paid_until) - Date.parse(shop.paid_until)) / DAY;
  check("…the subscription runs 4 months longer (from its end, not from today)", addedDays >= 118 && addedDays <= 124, addedDays);

  // a usual way typed by hand is that way; the price list's month still a tap
  await go(b.page, `/admin/shop/${shop.id}`);
  await b.page.getByRole("button", { name: "خدّم الأبونمان" }).click();
  await b.page.getByRole("button", { name: /· 35/ }).click();
  await b.page.getByRole("textbox", { name: "ولا اكتب كيفاش" }).fill("D17");
  await b.page.getByRole("button", { name: /^خدّم/ }).last().click();
  await b.page.getByText("تصويرة الأبونمان").first().waitFor({ timeout: 20000 }).catch(() => {});
  const { data: log2 } = await admin.from("plan_log").select("months, amount, method").eq("shop_id", shop.id).order("id", { ascending: false }).limit(1).single();
  check("«D17» typed is D17 itself; the month's chip writes 1 month, 35 د", log2?.months === 1 && log2.amount === 35 && log2.method === "d17", log2);
  await b.ctx.close();
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
