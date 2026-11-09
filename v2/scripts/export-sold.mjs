/**
 * What was sold, and how each tampon came — in the links and in the customers file (9 Nov 2026, the
 * founder: «the links: I want to be able to select what I sold, if "what I sell" is on … the export should
 * track what I sold, so I can filter the Excel … the tampons with the QR and the links and what I sold»).
 *
 * A throwaway shop that says what it sells (three things, a tampon allowed right after another), three
 * customers and the owner's own card:
 *   · سامي scans the counter's code for «كابوسة»;
 *   · the owner makes a link on «تامبون برابط», like a person on a phone: the page asks what the tampon
 *     is for (a tap with nothing picked says so), «قهوة» picked, «منى · كوموند 7» written; the sheet says
 *     what it is for, and the next link asks again; منى takes it;
 *   · هادي gets one by number, for «كرواسون»;
 *   · سامي takes a second link, for «كابوسة», with no name written on it.
 * Then the owner downloads the file from «المحل» and the script opens it: «كل تامبون» has the four, the
 * latest first, each with how it came (كود QR, رابط, بالنومرو), what it was for, and who the link was for;
 * the summary counts the ways and what sold; «الحرفاء» says what each one takes most. Accounts deleted at
 * the end; pictures and the file in .e2e/export-sold/.
 *
 *   node scripts/export-sold.mjs   (from v2/, dev server on :3200 — or BASE=)
 */
import { mkdirSync, readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import { config } from "dotenv";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const BASE = process.env.BASE || "http://localhost:3200";
const OUT = ".e2e/export-sold";
mkdirSync(OUT, { recursive: true });
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
for (const ip of ["local", "::1", "127.0.0.1"]) await admin.rpc("forget_tries", { p_key: `login-ip:${ip}` });
const PASS = "export-sold-e2e-2026";
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
const must = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

/** a throwaway person, and their own session (to call the database as them, as their phone would) */
async function person(name) {
  const d = await robot(admin, `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`);
  phones.push(d);
  const email = `216${d}@phone.pointidi.app`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASS, email_confirm: true, app_metadata: { phone: `+216${d}` } });
  if (error) throw error;
  made.push(data.user.id);
  await admin.from("people").upsert({ id: data.user.id, name, phone: `+216${d}`, seen: NOTES });
  const { data: live } = await admin.from("news").select("id").eq("active", true);
  if (live?.length) await admin.from("news_views").insert(live.map((n) => ({ news_id: n.id, person_id: data.user.id })));
  const db = createClient(URL_, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const signed = await db.auth.signInWithPassword({ email, password: PASS });
  if (signed.error) throw signed.error;
  return { id: data.user.id, digits: d, name, db };
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
/** a cell's text by its column letter in one row's XML ("" when empty) */
const textAt = (row, col) => {
  const m = row.match(new RegExp(`<c r="${col}\\d+"[^>]*t="inlineStr"[^>]*><is><t xml:space="preserve">([^<]*)</t>`));
  return m ? m[1].replace(/&amp;/g, "&") : "";
};
const num = (row, col) => {
  const m = row.match(new RegExp(`<c r="${col}\\d+"[^>]*><v>([^<]*)</v>`));
  return m ? Number(m[1]) : null;
};

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ar-TN", acceptDownloads: true };
async function signIn(who) {
  const ctx = await browser.newContext(phone);
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

try {
  const owner = await person("نزار");
  const shop = must(
    await admin
      .from("shops")
      .insert({ owner_id: owner.id, name: "Café Sold", kind: "cafe", goal: 6, gift: "قهوة بلاش", color: "#6C47FF", trial_first: false, trial_days: 3, created_at: at(-20 * DAY), paid_until: at(30 * DAY), export_allowed: true, stamp_gap: 0 })
      .select("*")
      .single(),
  );
  // what it sells, written and switched on by the owner, as on «شنوّة تبيع»
  const setItems = must(await owner.db.rpc("set_items", { p_names: ["قهوة", "كابوسة", "كرواسون"] }));
  const on = must(await owner.db.rpc("set_items_on", { p_on: true }));
  const items = Object.fromEntries((setItems.items ?? []).map((i) => [i.name, i.id]));
  check("the shop says what it sells: قهوة, كابوسة, كرواسون, on", on.ok && Object.keys(items).length === 3, { setItems, on });
  const sami = await person("سامي");
  const mona = await person("منى");
  const hadi = await person("هادي");
  // the owner's own card: never in the file
  const oc = must(await admin.from("cards").insert({ shop_id: shop.id, user_id: owner.id, stamps: 1, goal: 6, gift: "قهوة بلاش", last_at: at(-DAY) }).select("id").single());
  must(await admin.from("moments").insert({ shop_id: shop.id, card_id: oc.id, kind: "stamp", created_at: at(-DAY) }));

  console.log("\n① سامي scans the counter's code, for «كابوسة»");
  const code = must(await owner.db.rpc("new_code", { p_item: items["كابوسة"] }));
  const s1 = must(await sami.db.rpc("stamp", { p_token: code.token }));
  check("…the tampon is his, for «كابوسة»", s1.ok && s1.item === "كابوسة", s1);

  console.log("\n② The owner makes a link on a phone, for «قهوة», for منى");
  const o = await signIn(owner);
  await go(o.page, "/shop/links");
  const chips = o.page.locator("button[aria-pressed]");
  check("«تامبون برابط» asks «التامبون على شنوّة؟», with the three things", (await o.page.getByText("التامبون على شنوّة؟").count()) === 1 && (await chips.count()) === 3, await chips.allInnerTexts());
  const makeBtn = o.page.getByRole("button", { name: "اعمل رابط جديد" });
  await makeBtn.click();
  check("a tap with nothing picked says why, and makes nothing", (await o.page.getByText("اختار التامبون على شنوّة.").count()) === 1 && (await o.page.getByText("الرابط حاضر").count()) === 0);
  await shot(o.page, "1-links-pick-first");
  await chips.filter({ hasText: "قهوة" }).click();
  check("…picking one takes the words away", (await o.page.getByText("اختار التامبون على شنوّة.").count()) === 0);
  await o.page.getByLabel("لشكون؟").fill("منى · كوموند 7");
  await makeBtn.click();
  await o.page.getByText("الرابط حاضر").first().waitFor({ timeout: 20000 });
  check("the sheet: who it is for, and «التامبون على: قهوة»", (await o.page.getByText("منى · كوموند 7").count()) >= 1 && (await o.page.getByText("التامبون على: قهوة").count()) === 1);
  await shot(o.page, "2-link-ready");
  const shown = (await o.page.locator('button[dir="ltr"]').first().innerText()).trim();
  const token = shown.split("/s/")[1];
  check("…the link, /s/<token>", /^[A-Za-z0-9_-]{20,64}$/.test(token ?? ""), shown);
  await o.page.getByRole("button", { name: "رابط آخر لحريف آخر" }).click();
  await o.page.waitForTimeout(600);
  check("«رابط آخر»: the next link asks again — nothing picked", (await o.page.locator('button[aria-pressed="true"]').count()) === 0, await o.page.locator('button[aria-pressed="true"]').allInnerTexts());
  await shot(o.page, "3-links-next");
  const s2 = must(await mona.db.rpc("stamp", { p_token: token }));
  check("منى opens it: her tampon, for «قهوة»", s2.ok && s2.item === "قهوة", s2);
  await go(o.page, "/shop/links");
  check("the owner's list: «خذاه منى», the link for «قهوة»", (await o.page.getByText("خذاه منى").count()) === 1 && (await o.page.locator("li").filter({ hasText: "منى · كوموند 7" }).filter({ hasText: "قهوة" }).count()) === 1);
  await shot(o.page, "4-links-taken");

  console.log("\n③ هادي by number, for «كرواسون»; سامي a second link, for «كابوسة», no name on it");
  const g = must(await owner.db.rpc("give_stamp", { p_who: hadi.digits, p_item: items["كرواسون"] }));
  check("…هادي's tampon given", g.ok, g);
  const l2 = must(await owner.db.rpc("link_new", { p_label: "", p_item: items["كابوسة"] }));
  const s3 = must(await sami.db.rpc("stamp", { p_token: l2.token }));
  check("…سامي's second, for «كابوسة»", s3.ok && s3.item === "كابوسة", s3);

  console.log("\n④ The file");
  await go(o.page, "/shop/settings");
  const [download] = await Promise.all([o.page.waitForEvent("download", { timeout: 30000 }), o.page.locator("a[href='/api/export']").click()]);
  const file = `${OUT}/${download.suggestedFilename()}`;
  await download.saveAs(file);
  const x = unzip(readFileSync(file));
  const sheetNames = [...(x["xl/workbook.xml"] ?? "").matchAll(/<sheet name="([^"]+)"/g)].map((m) => m[1]);
  check("four sheets: ملخّص, الحرفاء, كل تامبون, كل شهر", sheetNames.join("|") === "ملخّص|الحرفاء|كل تامبون|كل شهر", sheetNames);
  const sum = x["xl/worksheets/sheet1.xml"] ?? "";
  const list = x["xl/worksheets/sheet2.xml"] ?? "";
  const tampons = x["xl/worksheets/sheet3.xml"] ?? "";

  const tRows = rowsOf(tampons);
  check("«كل تامبون»: when, name, phone, how, what, the link for whom", texts(tRows[0] ?? "").join("|") === "النهار والوقت|الاسم|التليفون|كيفاش خذاه|شنوّة خذا|الرابط لشكون", texts(tRows[0] ?? ""));
  const line = (r) => [textAt(r, "B"), textAt(r, "D"), textAt(r, "E"), textAt(r, "F")].join(" · ");
  const lines = tRows.slice(1).map(line);
  check(
    "…the four, the latest first, each with how it came and what for — never the owner's own",
    lines.join(" | ") === ["سامي · رابط · كابوسة · ", "هادي · بالنومرو · كرواسون · ", "منى · رابط · قهوة · منى · كوموند 7", "سامي · كود QR · كابوسة · "].join(" | ") && !texts(tampons).includes("نزار"),
    lines,
  );
  check(
    "…the whole numbers, read left to right in the right-to-left sheet (never «… 216+»)",
    textAt(tRows[2] ?? "", "C") === `+216 ${hadi.digits.slice(0, 2)} ${hadi.digits.slice(2, 5)} ${hadi.digits.slice(5)}` && tRows.slice(1).every((r) => /<c r="C\d+" t="inlineStr" s="6">/.test(r)) && (x["xl/styles.xml"] ?? "").includes('<alignment readingOrder="1"/>'),
    textAt(tRows[2] ?? "", "C"),
  );
  check("…real dates with their hour, a filter on every column", tRows.slice(1).every((r) => /<c r="A\d+" s="2"><v>[\d.]+<\/v>/.test(r)) && tampons.includes('<autoFilter ref="A1:F5"/>') && tampons.includes('state="frozen"'));

  const sumRows = rowsOf(sum);
  const valueOf = (label) => {
    const r = sumRows.find((row) => texts(row)[0] === label);
    return r ? num(r, "B") : undefined;
  };
  const words = texts(sum);
  check("«ملخّص»: how they came — كود QR 1, رابط 2, بالنومرو 1", words.includes("كيفاش جات التامبونات") && valueOf("كود QR") === 1 && valueOf("رابط") === 2 && valueOf("بالنومرو") === 1, words);
  const soldAt = words.indexOf("شنوّة تباع");
  check("…what sold, the most first — كابوسة 2, قهوة 1, كرواسون 1", soldAt > 0 && words.slice(soldAt + 1, soldAt + 4).join("|") === "كابوسة|قهوة|كرواسون" && valueOf("كابوسة") === 2 && valueOf("قهوة") === 1 && valueOf("كرواسون") === 1, words.slice(soldAt));
  check("…4 tampons in all (the owner's own left out)", valueOf("التامبونات الكل") === 4, valueOf("التامبونات الكل"));

  const cRows = rowsOf(list);
  const head = texts(cRows[0] ?? "");
  const favCol = String.fromCharCode(65 + head.indexOf("أكثر حاجة يشريها"));
  const fav = Object.fromEntries(cRows.slice(1).map((r) => [textAt(r, "A"), textAt(r, favCol)]));
  check("«الحرفاء»: what each one takes most — سامي كابوسة, منى قهوة, هادي كرواسون", head.includes("أكثر حاجة يشريها") && fav["سامي"] === "كابوسة" && fav["منى"] === "قهوة" && fav["هادي"] === "كرواسون", { head, fav });
  await o.ctx.close();

  console.log("\n⑤ The card says it too");
  const card = must(await mona.db.rpc("card", { p_id: s2.card?.id }));
  check("منى's card: her tampon, for «قهوة»", (card.history ?? []).some((h) => h.kind === "stamp" && h.item === "قهوة"), card.history);
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
