/**
 * The card's options, each in a short film (13 Nov 2026, v2: the founder found v1 «too slow», ugly, with bugs and
 * weak words): «شنوّة تبيع؟» and «الحريف يختار الكادو», ~16 s each, on real screens of one café. Fast beats
 * (2.4–3 s), the words arriving one by one, the phone zooming onto what matters, a tap where the owner taps, the
 * scan's light over the code, confetti on the gift. (The two systems' films went with the points, 14 Nov 2026 —
 * they are in the history of branch systems/split.)
 *
 *   node scripts/option-films.mjs capture-items    the screens, from this computer's app (BASE, localbase) → .e2e/films
 *   node scripts/option-films.mjs capture-choice
 *   node scripts/option-films.mjs items            one film → public/clips/shop-items-v2.mp4 (+ social/explainers)
 *   node scripts/option-films.mjs choice           → public/clips/gift-choice-v2.mp4
 *   node scripts/option-films.mjs capture-name     «إسم الحريف» (14 Nov 2026): the screens, then
 *   node scripts/option-films.mjs name             → public/clips/customer-name-v2.mp4
 *   node scripts/option-films.mjs all              capture both, then both films
 *   PREVIEW=1000,5000 node scripts/option-films.mjs items   stills at those moments instead of a film
 *
 * Needs Chrome, ffmpeg (FFMPEG=path, else on the PATH) and, for capture, the app on BASE with localbase.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { config } from "dotenv";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const FF = process.env.FFMPEG || "ffmpeg";
const BASE = process.env.BASE || "http://localhost:3302";
const SHOTS = resolve(".e2e/films");
const TMP = join(tmpdir(), "pointili-option-films");
// drawn at 720×1280, filmed at 24 images a second and 540×960 (the app's other clips' size) — FPS=… OUT_W=… to change
const FPS = Number(process.env.FPS) || 24;
const W = 720;
const H = 1280;
const OUT_W = Number(process.env.OUT_W) || 540;
const what = process.argv[2] || "all";

/* ───────────────────────────── the screens ───────────────────────────── */

/**
 * «شنوّة تبيع؟» (13 Nov 2026): a café writes what it sells (the trade's usual ones, one tap each), turns on «اسألني
 * في الكاسة», the counter asks «على شنوّة التامبون؟» before the code, the customer scans a code «على كابوسة», and
 * the numbers say what sells and what each customer likes. → .e2e/films/i-*.png + boxes-items.json
 */
async function captureItems() {
  if (!/localhost|127\.0\.0\.1/.test(BASE)) throw new Error("capture runs on this computer only (BASE=http://localhost:…)");
  mkdirSync(SHOTS, { recursive: true });
  const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  for (const ip of ["local", "::1", "127.0.0.1"]) for (const k of [`join-ip:${ip}`, `login-ip:${ip}`]) await admin.rpc("forget_tries", { p_key: k });
  const users = [], phones = [], boxes = {};
  const person = async (name) => {
    const d = await robot(admin, `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`); phones.push(d);
    const { data, error } = await admin.auth.admin.createUser({ email: `216${d}@phone.pointidi.app`, password: "demo-1234", email_confirm: true, app_metadata: { phone: `+216${d}` } });
    if (error) throw error; users.push(data.user.id);
    const client = createClient(URL_, ANON, { auth: { persistSession: false } });
    await client.auth.signInWithPassword({ email: `216${d}@phone.pointidi.app`, password: "demo-1234" });
    await client.rpc("me"); if (name) await client.rpc("set_name", { p_name: name });
    await admin.from("people").update({ seen: ["card_hello", "coach", "logo_tip", "offer", "install", "links_tip", "new_insights", "reset_tip", "first_gift"] }).eq("id", data.user.id);
    return { id: data.user.id, client, digits: d };
  };
  const rpc = async (who, fn, args = {}) => { const { data, error } = await who.client.rpc(fn, args); if (error) console.log(`  ! ${fn}: ${error.message}`); return data; };
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const view = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ar-TN" };
  const shot = async (p, name, wait = 900) => {
    await p.waitForTimeout(wait);
    await p.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((e) => (e.style.display = "none"))).catch(() => {});
    await p.screenshot({ path: join(SHOTS, `${name}.png`) });
    console.log("  ·", name);
  };
  const box = async (name, loc) => {
    const b = await loc.first().boundingBox().catch(() => null);
    if (b) boxes[name] = { x: b.x, y: b.y, w: b.width, h: b.height };
    else console.log("  ! no box:", name);
  };
  try {
    console.log("\n«شنوّة تبيع؟»");
    const o = await person("ياسمين");
    await rpc(o, "open_shop", { p_name: "Café El Medina", p_kind: "cafe" });
    await rpc(o, "save_card", { p_goal: 8, p_gift: "قهوة", p_color: "#b5541c", p_gap: 0 });
    const p = await (await browser.newContext(view)).newPage();
    await p.goto(BASE + "/login", { waitUntil: "load" });
    await p.locator('input[name="phone"]').fill(o.digits); await p.locator('input[name="password"]').fill("demo-1234");
    await Promise.all([p.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60000 }).catch(() => {}), p.locator('button[type="submit"]').click()]);
    await p.goto(BASE + "/shop/items", { waitUntil: "load" });
    await shot(p, "i-items", 1200);
    await box("chip", p.getByRole("button", { name: "اكسبراس" }));
    for (const n of ["اكسبراس", "كابوسة", "شاي"]) await p.getByRole("button", { name: n, exact: true }).click();
    await shot(p, "i-items-picked", 500);
    await box("switch", p.getByRole("switch", { name: "اسألني في الكاسة" }));
    await p.getByRole("switch", { name: "اسألني في الكاسة" }).click();
    await shot(p, "i-items-on", 500);
    await box("save", p.getByRole("button", { name: "سجّل" }));
    await p.getByRole("button", { name: "سجّل" }).click();
    await p.waitForTimeout(1500);
    await p.goto(BASE + "/shop/qr", { waitUntil: "load" });
    await p.getByText("على شنوّة التامبون؟").waitFor({ timeout: 20000 });
    await shot(p, "i-pick", 900);
    await box("pick", p.getByRole("button", { name: "كابوسة", exact: true }));
    await p.getByRole("button", { name: "كابوسة", exact: true }).click();
    await p.locator("[data-qr]").first().waitFor({ timeout: 20000 });
    await shot(p, "i-code", 1100);
    await box("qr", p.locator("[data-qr]"));
    // a few customers, a few things each: what sells, and what each one likes
    const items = await rpc(o, "my_items");
    const id = (n) => items.find((x) => x.name === n)?.id ?? null;
    for (const [name, list] of [["سامي", ["كابوسة", "كابوسة", "اكسبراس", "كابوسة"]], ["ريم", ["اكسبراس", "اكسبراس", "اكسبراس"]], ["نور", ["شاي", "اكسبراس", "شاي"]]]) {
      const c = await person(name);
      for (const n of list) await rpc(o, "give_stamp", { p_who: c.digits, p_item: id(n) });
    }
    await p.goto(BASE + "/shop/stats", { waitUntil: "load" });
    await shot(p, "i-stats", 1200);
    await box("selling", p.getByText("شنوّة يمشي أكثر"));
    await p.goto(BASE + "/shop/customers", { waitUntil: "load" });
    await p.getByText("سامي").first().click();
    await shot(p, "i-customer", 1200);
    await box("tally", p.getByText("كابوسة").last());
    writeFileSync(join(SHOTS, "boxes-items.json"), JSON.stringify(boxes, null, 1));
    console.log("\nScreens in", SHOTS);
  } finally {
    await browser.close();
    for (const uid of users) await admin.from("shops").delete().eq("owner_id", uid);
    for (const uid of users) await admin.auth.admin.deleteUser(uid).catch(() => {});
    await unrobot(admin, phones);
    console.log("cleaned up", users.length, "accounts");
  }
}

/**
 * «الحريف يختار الكادو» (13 Nov 2026): the owner turns it on and lists the gifts, a customer who fills the card picks
 * one on their phone, another picks at the counter. → .e2e/films/c-*.png + boxes-choice.json
 */
async function captureChoice() {
  if (!/localhost|127\.0\.0\.1/.test(BASE)) throw new Error("capture runs on this computer only (BASE=http://localhost:…)");
  mkdirSync(SHOTS, { recursive: true });
  const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  for (const ip of ["local", "::1", "127.0.0.1"]) for (const k of [`join-ip:${ip}`, `login-ip:${ip}`]) await admin.rpc("forget_tries", { p_key: k });
  const users = [], phones = [], boxes = {};
  const person = async (name) => {
    const d = await robot(admin, `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`); phones.push(d);
    const { data, error } = await admin.auth.admin.createUser({ email: `216${d}@phone.pointidi.app`, password: "demo-1234", email_confirm: true, app_metadata: { phone: `+216${d}` } });
    if (error) throw error; users.push(data.user.id);
    const client = createClient(URL_, ANON, { auth: { persistSession: false } });
    await client.auth.signInWithPassword({ email: `216${d}@phone.pointidi.app`, password: "demo-1234" });
    const me = (await client.rpc("me")).data; if (name) await client.rpc("set_name", { p_name: name });
    await admin.from("people").update({ seen: ["card_hello", "coach", "logo_tip", "offer", "install", "links_tip", "new_insights", "reset_tip", "first_gift"] }).eq("id", data.user.id);
    return { id: data.user.id, client, digits: d, code: me?.code };
  };
  const rpc = async (who, fn, args = {}) => { const { data, error } = await who.client.rpc(fn, args); if (error) console.log(`  ! ${fn}: ${error.message}`); return data; };
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const view = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ar-TN" };
  const page = async (who, next) => {
    const p = await (await browser.newContext(view)).newPage();
    await p.goto(BASE + "/login", { waitUntil: "load" });
    await p.locator('input[name="phone"]').fill(who.digits); await p.locator('input[name="password"]').fill("demo-1234");
    await Promise.all([p.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60000 }).catch(() => {}), p.locator('button[type="submit"]').click()]);
    if (next) await p.goto(BASE + next, { waitUntil: "load" });
    return p;
  };
  const shot = async (p, name, wait = 900) => {
    await p.waitForTimeout(wait);
    await p.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((e) => (e.style.display = "none"))).catch(() => {});
    await p.screenshot({ path: join(SHOTS, `${name}.png`) });
    console.log("  ·", name);
  };
  const box = async (name, loc) => {
    const b = await loc.first().boundingBox().catch(() => null);
    if (b) boxes[name] = { x: b.x, y: b.y, w: b.width, h: b.height };
    else console.log("  ! no box:", name);
  };
  try {
    console.log("\n«الحريف يختار الكادو»");
    const o = await person("ياسمين");
    await rpc(o, "open_shop", { p_name: "Café El Medina", p_kind: "cafe" });
    await rpc(o, "save_card", { p_goal: 8, p_gift: "قهوة", p_color: "#b5541c", p_gap: 0 });
    const po = await page(o, "/shop/choices");
    await shot(po, "c-off", 1200);
    await box("switch", po.getByRole("switch", { name: "الحريف يختار" }));
    await po.getByRole("switch", { name: "الحريف يختار" }).click();
    for (const n of ["كابوسان", "كرواسون"]) await po.getByRole("button", { name: n, exact: true }).click();
    await shot(po, "c-on", 500);
    await box("chips", po.getByRole("button", { name: "قهوة ✕" }));
    await box("cardline", po.getByText("8 تامبونات ="));
    await po.getByRole("button", { name: "سجّل" }).click();
    await po.waitForTimeout(1500);
    // a customer fills the card, and chooses on the phone
    const sami = await person("سامي");
    for (let i = 0; i < 8; i++) await rpc(o, "give_stamp", { p_who: sami.digits });
    const card = (await rpc(sami, "wallet"))[0]?.id;
    const ps = await page(sami, `/c/${card}`);
    await ps.getByText("اختار الكادو متاعك").waitFor({ timeout: 20000 });
    await shot(ps, "c-card", 900);
    await box("pickCard", ps.getByRole("button", { name: "كرواسون" }));
    await ps.getByRole("button", { name: "كرواسون" }).click();
    await ps.getByText("اخترت كرواسون").waitFor({ timeout: 15000 });
    await shot(ps, "c-chosen", 700);
    await box("chosen", ps.getByText("اخترت كرواسون"));
    // another one chooses at the counter
    const rim = await person("ريم");
    for (let i = 0; i < 8; i++) await rpc(o, "give_stamp", { p_who: rim.digits });
    await po.goto(BASE + "/shop/collect?by=code", { waitUntil: "load" });
    await po.getByRole("textbox").first().fill(rim.code);
    await po.getByText("شنوّة يختار؟", { exact: false }).waitFor({ timeout: 20000 });
    await shot(po, "c-counter", 900);
    await box("pickCounter", po.getByRole("button", { name: "كابوسان" }));
    await po.getByRole("button", { name: "كابوسان" }).click();
    await po.waitForTimeout(2600);
    await shot(po, "c-given", 300);
    writeFileSync(join(SHOTS, "boxes-choice.json"), JSON.stringify(boxes, null, 1));
    console.log("\nScreens in", SHOTS);
  } finally {
    await browser.close();
    for (const uid of users) await admin.from("shops").delete().eq("owner_id", uid);
    for (const uid of users) await admin.auth.admin.deleteUser(uid).catch(() => {});
    await unrobot(admin, phones);
    console.log("cleaned up", users.length, "accounts");
  }
}

/**
 * «إسم الحريف» (14 Nov 2026, a client asked for it): a new number at the counter, its name written before the
 * tampon; and in «الحرفاء», a customer with no account named from the sheet. → .e2e/films/n-*.png + boxes-name.json
 */
async function captureName() {
  if (!/localhost|127\.0\.0\.1/.test(BASE)) throw new Error("capture runs on this computer only (BASE=http://localhost:…)");
  mkdirSync(SHOTS, { recursive: true });
  const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  for (const ip of ["local", "::1", "127.0.0.1"]) for (const k of [`join-ip:${ip}`, `login-ip:${ip}`, `phone_card:${ip}`]) await admin.rpc("forget_tries", { p_key: k });
  const users = [], phones = [], boxes = {};
  const num = async () => { const d = await robot(admin, `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`); phones.push(d); return d; };
  const person = async (name) => {
    const d = await num();
    const { data, error } = await admin.auth.admin.createUser({ email: `216${d}@phone.pointidi.app`, password: "demo-1234", email_confirm: true, app_metadata: { phone: `+216${d}` } });
    if (error) throw error; users.push(data.user.id);
    const client = createClient(URL_, ANON, { auth: { persistSession: false } });
    await client.auth.signInWithPassword({ email: `216${d}@phone.pointidi.app`, password: "demo-1234" });
    await client.rpc("me"); if (name) await client.rpc("set_name", { p_name: name });
    await admin.from("people").update({ seen: ["card_hello", "coach", "logo_tip", "offer", "install", "links_tip", "new_insights", "reset_tip", "first_gift", "first_scan", "mission", "push"] }).eq("id", data.user.id);
    return { id: data.user.id, client, digits: d };
  };
  const rpc = async (who, fn, args = {}) => { const { data, error } = await who.client.rpc(fn, args); if (error) console.log(`  ! ${fn}: ${error.message}`); return data; };
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const view = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ar-TN" };
  const shot = async (p, name, wait = 900) => {
    await p.waitForTimeout(wait);
    await p.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((e) => (e.style.display = "none"))).catch(() => {});
    await p.screenshot({ path: join(SHOTS, `${name}.png`) });
    console.log("  ·", name);
  };
  const box = async (name, loc) => {
    const b = await loc.first().boundingBox().catch(() => null);
    if (b) boxes[name] = { x: b.x, y: b.y, w: b.width, h: b.height };
    else console.log("  ! no box:", name);
  };
  try {
    console.log("\n«إسم الحريف»");
    const o = await person("هشام");
    await rpc(o, "open_shop", { p_name: "Café El Medina", p_kind: "cafe" });
    await rpc(o, "save_card", { p_goal: 8, p_gift: "قهوة", p_color: "#b5541c", p_gap: 0 });
    const { data: shop } = await admin.from("shops").select("id").eq("owner_id", o.id).single();
    await admin.from("shops").update({ paid_until: new Date(Date.now() + 30 * 864e5).toISOString(), trial_first: false }).eq("id", shop.id);
    // two customers with accounts, and one number given tampons before it had one (nameless, «حريف»)
    for (const n of ["نور", "ياسين"]) {
      const c = await person(n);
      await rpc(o, "give_stamp", { p_who: c.digits });
    }
    const blank = await num();
    const { data: u } = await admin.auth.admin.createUser({ email: `216${blank}@phone.pointidi.app`, password: "x-" + Math.random(), email_confirm: true, app_metadata: { phone: `+216${blank}` } });
    users.push(u.user.id);
    await admin.from("people").upsert({ id: u.user.id, name: "", phone: `+216${blank}`, password_set: false, made_by_shop: shop.id });
    await rpc(o, "give_stamp", { p_who: blank });
    const p = await (await browser.newContext(view)).newPage();
    await p.goto(BASE + "/login", { waitUntil: "load" });
    await p.locator('input[name="phone"]').fill(o.digits); await p.locator('input[name="password"]').fill("demo-1234");
    await Promise.all([p.waitForURL((x) => !x.pathname.startsWith("/login"), { timeout: 60000 }).catch(() => {}), p.locator('button[type="submit"]').click()]);
    // at the counter: a new number, its name, the tampon
    await p.goto(BASE + "/shop/collect?by=phone", { waitUntil: "load" });
    await p.getByRole("textbox").first().fill(await num());
    const field = p.getByRole("textbox", { name: "إسمو، كان تحب" });
    await field.waitFor({ timeout: 20000 });
    await shot(p, "n-counter", 900);
    await box("field", field);
    await field.fill("أحمد");
    await shot(p, "n-counter-typed", 400);
    await box("give", p.getByRole("button", { name: /زيد التامبون للنومرو هذا/ }));
    await p.getByRole("button", { name: /زيد التامبون للنومرو هذا/ }).click();
    await p.getByRole("button", { name: "غلطت؟ فسّخ التامبون" }).waitFor({ timeout: 20000 });
    await shot(p, "n-counter-done", 900);
    // in «الحرفاء»: the nameless one, named from the sheet
    await p.goto(BASE + "/shop/customers", { waitUntil: "load" });
    await shot(p, "n-list", 1000);
    await box("row", p.getByRole("button", { name: /حريف/ }));
    await p.getByRole("button", { name: /حريف/ }).first().click();
    await p.getByRole("button", { name: /اكتب إسمو/ }).waitFor({ timeout: 15000 });
    await shot(p, "n-sheet", 900);
    await box("write", p.getByRole("button", { name: /اكتب إسمو/ }));
    await p.getByRole("button", { name: /اكتب إسمو/ }).click();
    await p.getByRole("textbox", { name: "اكتب إسمو" }).fill("سامي");
    await shot(p, "n-sheet-edit", 500);
    await box("save", p.getByRole("button", { name: "سجّل" }));
    await p.getByRole("button", { name: "سجّل" }).click();
    await p.waitForTimeout(1800);
    await shot(p, "n-sheet-named", 300);
    await box("named", p.getByText("سامي").first());
    writeFileSync(join(SHOTS, "boxes-name.json"), JSON.stringify(boxes, null, 1));
    console.log("\nScreens in", SHOTS);
  } finally {
    await browser.close();
    for (const uid of users) await admin.from("shops").delete().eq("owner_id", uid);
    const { data: made } = await admin.from("people").select("id").in("phone", phones.map((d) => `+216${d}`));
    for (const x of made ?? []) await admin.auth.admin.deleteUser(x.id).catch(() => {});
    await unrobot(admin, phones);
    console.log("cleaned up", (made ?? []).length, "accounts");
  }
}

/* ───────────────────────────── the films ───────────────────────────── */

/** Readex Pro as the app itself serves it (next/font's files in .next): no network while filming */
function fontFaces() {
  try {
    const dir = ".next/dev/static/chunks";
    const css = readdirSync(dir).filter((f) => f.includes("readex_pro") && f.endsWith(".css")).map((f) => readFileSync(join(dir, f), "utf8")).join(" ");
    const faces = [...css.matchAll(/src: url\("\.\.\/media\/([^"]+\.woff2)"\) format\("woff2"\);\s*unicode-range: ([^;]+);/g)].map(
      ([, file, range]) => `@font-face{font-family:"Readex Pro";font-weight:160 700;font-display:block;src:url(data:font/woff2;base64,${readFileSync(join(".next/dev/static/media", file)).toString("base64")}) format("woff2");unicode-range:${range}}`,
    );
    if (faces.length) return `<style>${faces.join("")}</style>`;
  } catch {}
  return '<link href="https://fonts.googleapis.com/css2?family=Readex+Pro:wght@400;500;600;700&display=block" rel="stylesheet">';
}

const data = (p, type = "image/png") => `data:${type};base64,${readFileSync(p).toString("base64")}`;
const shotOf = (n) => data(join(SHOTS, `${n}.png`));
const pic = (n) => data(`public/3d/${n}.webp`, "image/webp");

// each beat: its screen, its words (*word*: in a pill), and what moves on it. `at` in ms from its start.
const FILMS = {
  choice: {
    name: "gift-choice",
    boxes: "boxes-choice.json",
    colors: ["#ff9ec0", "#f0508a", "#c22d68"],
    accent: "#e23d7a",
    title: { word: "يختار الكادو", icon: "gift", sub: "الحريف يكمّل الكارط، وياخو الكادو اللي يحب." },
    beats: [
      { dur: 2600, shot: "c-off", next: "c-on", swap: 1300, say: "اشعل *الحريف يختار*", focus: { box: "switch", s: 1.18 }, tap: { box: "switch", at: 1000 } },
      { dur: 2600, shot: "c-on", say: "اكتب *الكادوات* متاعك", focus: { box: "chips", s: 1.15 }, badge: { text: "🎁 3 كادوات", at: 1000, box: "cardline", below: true } },
      { dur: 3000, shot: "c-card", next: "c-chosen", swap: 1800, say: "كمّل الكارط؟ *يختار*", focus: { box: "pickCard", s: 1.12 }, tap: { box: "pickCard", at: 1500 }, confetti: 1900 },
      { dur: 2800, shot: "c-counter", next: "c-given", swap: 1700, say: "ولا *في الكاسة*", focus: { box: "pickCounter", s: 1.12 }, tap: { box: "pickCounter", at: 1400 }, confetti: 1800 },
    ],
    end: { line: "كل حريف ياخو الكادو اللي يحب", tag: "يختار الكادو" },
  },
  name: {
    name: "customer-name",
    boxes: "boxes-name.json",
    colors: ["#5eead4", "#14b8a6", "#0f766e"],
    accent: "#0d9488",
    title: { word: "إسم الحريف", icon: "phone", sub: "حريف ما عندوش كونت؟ اكتب إسمو إنت." },
    beats: [
      { dur: 2600, shot: "n-counter", next: "n-counter-typed", swap: 1400, say: "نومرو جديد؟ *اكتب إسمو*", focus: { box: "field", s: 1.2 }, tap: { box: "field", at: 900 } },
      { dur: 2400, shot: "n-counter-typed", next: "n-counter-done", swap: 1500, say: "وزيد *التامبون*", focus: { box: "give", s: 1.12 }, tap: { box: "give", at: 1100 } },
      { dur: 2400, shot: "n-list", say: "ولا من *الحرفاء*", focus: { box: "row", s: 1.15 }, tap: { box: "row", at: 1400 } },
      { dur: 2600, shot: "n-sheet", next: "n-sheet-edit", swap: 1500, say: "انزل على *اكتب إسمو*", focus: { box: "write", s: 1.18 }, tap: { box: "write", at: 1000 } },
      { dur: 2700, shot: "n-sheet-edit", next: "n-sheet-named", swap: 1400, say: "*سجّل*، ويبان بإسمو", focus: { box: "save", s: 1.15 }, tap: { box: "save", at: 1100 }, confetti: 1500 },
    ],
    end: { line: "وكي يعمل كونت، يكتب إسمو هو", tag: "إسم الحريف" },
  },
  items: {
    name: "shop-items",
    boxes: "boxes-items.json",
    colors: ["#9b80ff", "#6c47ff", "#4220cc"],
    accent: "#6c47ff",
    title: { word: "شنوّة تبيع؟", icon: "basket", sub: "اعرف شنوّة يتباع أكثر، وكل حريف شنوّة يحب." },
    beats: [
      { dur: 2600, shot: "i-items", next: "i-items-picked", swap: 1500, say: "اختار *شنوّة تبيع*", focus: { box: "chip", s: 1.12, y: 60 }, tap: { box: "chip", at: 1200 } },
      { dur: 2600, shot: "i-items-picked", next: "i-items-on", swap: 1300, say: "واشعل *اسألني في الكاسة*", focus: { box: "switch", s: 1.2 }, tap: { box: "switch", at: 1100 } },
      { dur: 2700, shot: "i-pick", say: "الكاسة تسألك: *على شنوّة*؟", focus: { box: "pick", s: 1.15 }, tap: { box: "pick", at: 1500 } },
      { dur: 2600, shot: "i-code", say: "الحريف يسكاني: *+1 كابوسة*", focus: { box: "qr", s: 1.22 }, beam: { box: "qr" }, badge: { text: "+1 · كابوسة", at: 1300, box: "qr", below: true } },
      { dur: 2600, shot: "i-stats", say: "تعرف شنوّة *يتباع أكثر*", focus: { box: "selling", s: 1.1, y: -60 } },
      { dur: 2600, shot: "i-customer", say: "وكل حريف *شنوّة يحب*", focus: { box: "tally", s: 1.15 } },
    ],
    end: { line: "تعرف حرفاءك، وتعرف شنوّة يمشي", tag: "شنوّة تبيع؟" },
  },
};

function page(spec, boxes) {
  const shots = {};
  for (const b of spec.beats) for (const n of [b.shot, b.next, b.wheel?.bare].filter(Boolean)) shots[n] = shotOf(n);
  const cfg = { ...spec, boxes, W, H, mark: data("public/brand-mark.svg", "image/svg+xml"), titleIcon: pic(spec.title.icon) };
  return `<!doctype html><html dir="rtl"><head><meta charset="utf-8">
${fontFaces()}
<style>
*{box-sizing:border-box;margin:0}
html,body{width:${W}px;height:${H}px;overflow:hidden;font-family:"Readex Pro",sans-serif;background:#000}
#stage{position:relative;width:${W}px;height:${H}px;overflow:hidden;background:linear-gradient(160deg,${spec.colors[0]},${spec.colors[1]} 45%,${spec.colors[2]})}
.blob{position:absolute;border-radius:50%;filter:blur(60px);opacity:.55}
#prog{position:absolute;top:34px;left:48px;right:48px;display:flex;gap:8px;z-index:9}
#prog i{flex:1;height:6px;border-radius:9px;background:rgba(255,255,255,.28);overflow:hidden}
#prog i b{display:block;height:100%;width:0;background:#fff;border-radius:9px}
#cap{position:absolute;top:84px;left:36px;right:36px;height:220px;display:flex;flex-wrap:wrap;align-content:center;justify-content:center;gap:4px 16px;z-index:8;text-align:center}
#cap span{font-size:62px;font-weight:700;color:#fff;line-height:1.18;text-shadow:0 6px 24px rgba(0,0,0,.18);display:inline-block}
#cap span.hi{background:#fff;color:${spec.accent};padding:0 18px;border-radius:22px;text-shadow:none}
#phone{position:absolute;transform-origin:0 0;left:${(W - 448) / 2}px;top:318px;width:448px;height:${Math.round((448 - 16) * (844 / 390)) + 16}px;border-radius:58px;background:#0f0e17;padding:8px;box-shadow:0 40px 80px -30px rgba(0,0,0,.6),0 0 0 2px rgba(255,255,255,.12) inset;z-index:5;will-change:transform}
#screen{position:relative;width:100%;height:100%;border-radius:50px;overflow:hidden;background:#f4f3f9}
#screen img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top}
#wheel{position:absolute;border-radius:50%;z-index:2;opacity:0;background-repeat:no-repeat;will-change:transform}
#hub{position:absolute;border-radius:50%;z-index:2;opacity:0;background:#fff;box-shadow:0 6px 18px rgba(20,16,40,.3),0 0 0 4px rgba(255,255,255,.6);display:grid;place-items:center;font-weight:700;color:#0f0e17}
#ptr{position:absolute;z-index:2;opacity:0;filter:drop-shadow(0 4px 6px rgba(0,0,0,.3))}
#notch{position:absolute;top:14px;left:50%;width:22px;height:22px;margin-left:-11px;border-radius:50%;background:#0f0e17;z-index:3}
.ring{position:absolute;border:5px solid ${spec.accent};border-radius:22px;box-shadow:0 0 0 6px rgba(255,255,255,.7);z-index:4;opacity:0}
.ripple{position:absolute;border-radius:50%;background:rgba(15,14,23,.25);border:3px solid rgba(255,255,255,.9);z-index:4;opacity:0}
.finger{position:absolute;width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,.92);box-shadow:0 10px 30px rgba(0,0,0,.35);z-index:6;opacity:0}
#beam{position:absolute;height:10px;border-radius:9px;background:linear-gradient(90deg,transparent,${spec.accent},#fff,${spec.accent},transparent);box-shadow:0 0 30px 8px ${spec.accent};z-index:4;opacity:0}
#badge{position:absolute;z-index:9;padding:16px 30px;border-radius:999px;background:#fff;color:${spec.accent};font-size:46px;font-weight:700;box-shadow:0 22px 50px -16px rgba(0,0,0,.45);opacity:0;white-space:nowrap}
#count{position:absolute;z-index:9;left:50%;top:1135px;transform:translateX(-50%);padding:14px 34px;border-radius:999px;background:#0f0e17;color:#fff;font-size:50px;font-weight:700;opacity:0;white-space:nowrap;box-shadow:0 20px 40px -16px rgba(0,0,0,.5)}
#count b{color:${spec.colors[0]}}
#confetti i{position:absolute;width:16px;height:24px;border-radius:4px;z-index:9;opacity:0}
#title,#end{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;z-index:10;opacity:0;padding:0 50px}
#title img{width:220px;height:220px;filter:drop-shadow(0 30px 40px rgba(0,0,0,.3))}
#title h1{font-size:${[...spec.title.word].length > 8 ? 112 : 150}px;font-weight:700;color:#fff;line-height:1.05;margin-top:16px;text-shadow:0 10px 40px rgba(0,0,0,.2)}
#title p{font-size:44px;font-weight:500;color:rgba(255,255,255,.92);margin-top:22px;line-height:1.35;text-wrap:balance}
#end .brand{display:flex;align-items:center;gap:18px;direction:ltr;background:#fff;border-radius:999px;padding:18px 40px 18px 28px;box-shadow:0 30px 60px -24px rgba(0,0,0,.5)}
#end .brand img{width:80px;height:58px}
#end .brand b{font-size:64px;font-weight:700;color:#0f0e17}
#end h2{font-size:92px;font-weight:700;color:#fff;margin-top:56px}
#end p{font-size:44px;font-weight:500;color:rgba(255,255,255,.94);margin-top:18px;line-height:1.35;text-wrap:balance}
#end small{font-size:34px;color:rgba(255,255,255,.8);margin-top:44px;direction:ltr}
</style></head><body><div id="stage">
<div class="blob" id="b1" style="width:520px;height:520px;background:rgba(255,255,255,.55)"></div>
<div class="blob" id="b2" style="width:460px;height:460px;background:rgba(15,14,23,.35)"></div>
<div id="prog"></div><div id="cap"></div>
<div id="phone"><div id="screen"><img id="sp"><img id="s0"><img id="s1"><div id="wheel"></div><div id="hub"></div><svg id="ptr" viewBox="0 0 40 40"><path d="M20 38 L6 8 Q20 0 34 8 Z" fill="#0F0E17"/><circle cx="20" cy="12" r="4" fill="#fff"/></svg><div id="notch"></div></div></div>
<div id="fx"></div><div id="badge"></div><div id="count"></div><div id="confetti"></div>
<div id="title"><img id="ticon"><h1></h1><p></p></div>
<div id="end"><div class="brand"><img id="emark"><b>Pointili</b></div><h2></h2><p></p><small>www.pointili.online</small></div>
</div>
<script>
const C = ${JSON.stringify(cfg)};
const SH = ${JSON.stringify(shots)};
const $ = (s) => document.querySelector(s);
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const prog = (t, a, d) => clamp((t - a) / d);
const eo = (x) => 1 - Math.pow(1 - x, 3);            // ease out
const eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const back = (x) => { const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const TITLE = 1900, END = 2600;
const starts = []; let acc = TITLE;
for (const b of C.beats) { starts.push(acc); acc += b.dur; }
window.TOTAL = acc + END;
const K = 432 / 390; // screen px per app px
// the phone's place, and an app box's centre in the stage
const PX = ${(W - 448) / 2} + 8, PY = 318 + 8;
const centre = (name) => { const b = C.boxes[name]; return b ? { x: PX + (b.x + b.w / 2) * K, y: PY + (b.y + b.h / 2) * K, w: b.w * K, h: b.h * K } : { x: ${W / 2}, y: 760, w: 0, h: 0 }; };
$("#ticon").src = C.titleIcon; $("#title h1").textContent = C.title.word; $("#title p").textContent = C.title.sub;
$("#emark").src = C.mark; $("#end h2").textContent = C.end.tag; $("#end p").textContent = C.end.line;
$("#prog").innerHTML = C.beats.map(() => "<i><b></b></i>").join("");
// words, one span each (a *word* in its pill)
const capFor = C.beats.map((b) => b.say.split(/\\s+/).reduce((out, w) => { out.push({ w: w.replace(/\\*/g, ""), hi: /^\\*.*\\*$/.test(w) || /^\\*/.test(w) || /\\*$/.test(w) }); return out; }, []));
let capBeat = -1;
// confetti: the same throw every time
const rnd = (s) => { let x = Math.sin(s * 9301 + 49297) * 233280; return x - Math.floor(x); };
const COLORS = ["#ffffff", "#ffd166", "#6c47ff", "#ff6b4a", "#12b76a", "#0ea5e9"];
$("#confetti").innerHTML = Array.from({ length: 90 }, (_, i) => '<i style="background:' + COLORS[i % 6] + '"></i>').join("");
const bits = [...document.querySelectorAll("#confetti i")].map((el, i) => ({ el, vx: (rnd(i) - 0.5) * 900, vy: -700 - rnd(i + 7) * 700, r: rnd(i + 3) * 720, x: ${W / 2} + (rnd(i + 11) - 0.5) * 200, y: 760 }));
const ring = document.createElement("div"); ring.className = "ring"; $("#fx").appendChild(ring);
const rip = document.createElement("div"); rip.className = "ripple"; $("#fx").appendChild(rip);
const fing = document.createElement("div"); fing.className = "finger"; $("#fx").appendChild(fing);
const beam = document.createElement("div"); beam.id = "beam"; $("#fx").appendChild(beam);
let sp = undefined, s0 = null, s1 = null;
const OX = ${(W - 448) / 2}, OY = 318;

window.setTime = (t) => {
  // the ground moves gently all along
  // the two soft lights stay put (14 Nov 2026): drifting, they changed every pixel of every frame — bits for nothing
  $("#b1").style.transform = "translate(-120px,-10px)";
  $("#b2").style.transform = "translate(460px,900px)";
  // the title, then the end
  const tIn = prog(t, 0, 380), tOut = prog(t, TITLE - 300, 300);
  $("#title").style.opacity = String(tIn * (1 - tOut));
  $("#ticon").style.transform = "scale(" + (0.3 + 0.7 * back(prog(t, 60, 520))) + ") rotate(" + (-14 + 14 * eo(prog(t, 60, 700))) + "deg)";
  $("#title h1").style.transform = "translateY(" + (60 * (1 - eo(prog(t, 180, 520)))) + "px)";
  $("#title p").style.opacity = String(prog(t, 520, 420));
  const endAt = window.TOTAL - END;
  const eIn = prog(t, endAt, 420);
  $("#end").style.opacity = String(eIn);
  $("#end .brand").style.transform = "scale(" + (0.5 + 0.5 * back(prog(t, endAt + 80, 520))) + ")";
  $("#end h2").style.transform = "translateY(" + (50 * (1 - eo(prog(t, endAt + 260, 480)))) + "px)";
  $("#end h2").style.opacity = String(prog(t, endAt + 260, 300));
  $("#end p").style.opacity = String(prog(t, endAt + 520, 360));
  // which beat
  let i = -1;
  for (let k = 0; k < starts.length; k++) if (t >= starts[k]) i = k;
  const live = i >= 0 && t < endAt;
  const phoneIn = prog(t, TITLE - 320, 520), phoneOut = prog(t, endAt - 260, 300);
  $("#phone").style.opacity = String(live || t < TITLE ? phoneIn * (1 - phoneOut) : 0);
  $("#cap").style.opacity = String(live ? 1 - phoneOut : 0);
  $("#prog").style.opacity = String(live ? 1 - phoneOut : 0);
  document.querySelectorAll("#prog i b").forEach((el, k) => (el.style.width = (k < i ? 100 : k === i ? prog(t, starts[k], C.beats[k].dur) * 100 : 0) + "%"));
  if (i < 0) i = 0;
  const b = C.beats[i], st = starts[i], lt = t - st;
  // the screens: the last beat's under, this beat's fading in over it, and its second after its swap
  const prev = i > 0 ? C.beats[i - 1].next || C.beats[i - 1].shot : null;
  if (sp !== prev) { $("#sp").src = prev ? SH[prev] : ""; sp = prev; }
  if (s0 !== b.shot) { $("#s0").src = SH[b.shot]; s0 = b.shot; }
  if (b.next && s1 !== b.next) { $("#s1").src = SH[b.next]; s1 = b.next; }
  $("#sp").style.opacity = prev ? "1" : "0";
  $("#s0").style.opacity = String(i === 0 ? 1 : eo(prog(lt, 0, 300)));
  $("#s1").style.opacity = b.next ? String(eo(prog(lt, b.swap ?? 1000, 280))) : "0";
  // the camera: from where the last beat left it to this beat's, smoothly — never a jump
  const cam = (bt) => {
    const f = bt.focus || { s: 1 };
    const cc = f.box && C.boxes[f.box] ? centre(f.box) : { x: ${W / 2}, y: 793 };
    const gx = cc.x + (${W / 2} - cc.x) * (f.box ? 0.55 : 1);
    const gy = cc.y + (775 - cc.y) * (f.box ? 0.45 : 0) + (f.y || 0);
    // the phone's top never climbs over the words (the camera stops at 300 px), and the whole phone stays in the frame sideways
    const pw = 448 * f.s;
    const x0 = gx - OX - (cc.x - OX) * f.s;
    const x = pw <= ${W} - 20 ? Math.min(Math.max(x0, 10 - OX), ${W} - 10 - OX - pw) : x0;
    return { s: f.s, x, y: Math.max(-18, gy - OY - (cc.y - OY) * f.s) };
  };
  const from = i > 0 ? cam(C.beats[i - 1]) : { s: 1, x: 0, y: 0 };
  const to = cam(b);
  const k = eio(prog(lt, 120, 760));
  const sc = from.s + (to.s - from.s) * k, tx = from.x + (to.x - from.x) * k, ty0 = from.y + (to.y - from.y) * k;
  const enterY = 300 * (1 - eo(phoneIn));
  const slide = i === 0 ? 0 : (1 - eo(prog(lt, 0, 320))) * -40;
  const ty = ty0 + enterY;
  $("#phone").style.transform = "translate(" + (tx + slide) + "px," + ty + "px) scale(" + sc + ")";
  const f = b.focus || { s: 1 };
  // a wheel on the screen turns: its circle of the screen, spun round its hub, then the prize
  const wh = $("#wheel");
  if (b.wheel && C.boxes[b.wheel.box]) {
    const hb = C.boxes[b.wheel.box], R = hb.w / 0.3 / 2, cx = hb.x + hb.w / 2, cy = hb.y + hb.h / 2;
    const L = (cx - R) * K, T = (cy - R) * K;
    if (wh.dataset.for !== b.shot) {
      wh.dataset.for = b.shot;
      wh.style.backgroundImage = "url(" + SH[b.wheel.bare || b.shot] + ")";
      wh.style.backgroundSize = "432px " + Math.round(432 * 844 / 390) + "px";
    }
    wh.style.left = L + "px"; wh.style.top = T + "px"; wh.style.width = 2 * R * K + "px"; wh.style.height = 2 * R * K + "px";
    wh.style.backgroundPosition = -L + "px " + -T + "px";
    const q = prog(lt, b.wheel.from, b.wheel.to - b.wheel.from);
    wh.style.opacity = lt >= b.wheel.from && lt < (b.swap ?? b.wheel.to) + 120 ? "1" : "0";
    wh.style.transform = "rotate(" + 1440 * (1 - Math.pow(1 - q, 3)) + "deg)";
    // the hub and the pointer stay still over it
    const on = wh.style.opacity;
    const hu = $("#hub"), pt = $("#ptr"), pb = C.boxes.pointer;
    hu.style.opacity = on; hu.style.left = hb.x * K + "px"; hu.style.top = hb.y * K + "px"; hu.style.width = hb.w * K + "px"; hu.style.height = hb.h * K + "px";
    hu.style.fontSize = hb.w * K * 0.22 + "px"; hu.textContent = "…";
    if (pb) { pt.style.opacity = on; pt.style.left = pb.x * K + "px"; pt.style.top = pb.y * K + "px"; pt.style.width = pb.w * K + "px"; pt.style.height = pb.h * K + "px"; }
  } else { wh.style.opacity = "0"; $("#hub").style.opacity = "0"; $("#ptr").style.opacity = "0"; }
  // the words, one by one
  if (capBeat !== i) {
    capBeat = i;
    // a number keeps its sign where it is read («+1», never «1+»): left to right, inside the right-to-left line
    $("#cap").innerHTML = capFor[i].map((x) => '<span class="' + (x.hi ? "hi" : "") + '"' + (/^[+\\-]?\\d/.test(x.w) ? ' dir="ltr"' : "") + ">" + x.w + "</span>").join("");
  }
  [...$("#cap").children].forEach((el, k) => {
    const q = prog(lt, 60 + k * 90, 380);
    const out = prog(lt, b.dur - 260, 240);
    el.style.opacity = String(q * (1 - out));
    el.style.transform = "translateY(" + (36 * (1 - back(q)) - 30 * out) + "px) scale(" + (0.7 + 0.3 * back(q)) + ")";
  });
  // where the eye goes (in the phone's own frame: follows its zoom)
  const tr = (x, y) => ({ x: OX + (x - OX) * sc + tx + slide, y: OY + (y - OY) * sc + ty });
  ring.style.opacity = "0"; rip.style.opacity = "0"; fing.style.opacity = "0"; beam.style.opacity = "0";
  if (f.box && C.boxes[f.box] && f.s > 1.05 && k > 0.95) {
    const bb = centre(f.box), a = tr(bb.x - bb.w / 2, bb.y - bb.h / 2);
    const rq = prog(lt, 700, 300) * (1 - prog(lt, b.dur - 300, 250));
    ring.style.opacity = String(rq * 0.95);
    ring.style.left = a.x - 10 + "px"; ring.style.top = a.y - 10 + "px";
    ring.style.width = bb.w * sc + 20 + "px"; ring.style.height = bb.h * sc + 20 + "px";
  }
  if (b.tap && C.boxes[b.tap.box]) {
    const bb = centre(b.tap.box), a = tr(bb.x, bb.y);
    const fin = prog(lt, b.tap.at - 450, 380) * (1 - prog(lt, b.tap.at + 380, 240));
    const press = prog(lt, b.tap.at - 80, 160) * (1 - prog(lt, b.tap.at + 120, 160));
    fing.style.opacity = String(fin);
    fing.style.left = a.x - 32 + (1 - eo(prog(lt, b.tap.at - 450, 380))) * 120 + "px";
    fing.style.top = a.y - 32 + (1 - eo(prog(lt, b.tap.at - 450, 380))) * 160 + "px";
    fing.style.transform = "scale(" + (1 - 0.18 * press) + ")";
    const rq = prog(lt, b.tap.at, 520);
    rip.style.opacity = String(rq > 0 && rq < 1 ? (1 - rq) * 0.9 : 0);
    const rs = 30 + 140 * eo(rq);
    rip.style.left = a.x - rs / 2 + "px"; rip.style.top = a.y - rs / 2 + "px"; rip.style.width = rs + "px"; rip.style.height = rs + "px";
  }
  if (b.beam && C.boxes[b.beam.box]) {
    const bb = centre(b.beam.box), a = tr(bb.x - bb.w / 2, bb.y - bb.h / 2);
    const cyc = ((lt - 700) % 1100) / 1100;
    beam.style.opacity = lt > 700 && lt < b.dur - 200 ? "1" : "0";
    beam.style.left = a.x - 16 + "px"; beam.style.width = bb.w * sc + 32 + "px";
    beam.style.top = a.y + bb.h * sc * eio(clamp(cyc)) + "px";
  }
  // the badge
  const bg = $("#badge");
  if (b.badge) {
    // over the box, or under it (a code: the words above it stay readable)
    const bb = centre(b.badge.box), a = tr(bb.x, b.badge.below ? bb.y + bb.h / 2 + 70 : bb.y - bb.h / 2);
    const q = prog(lt, b.badge.at, 420), out = prog(lt, b.dur - 300, 260);
    bg.innerHTML = b.badge.text.replace(/([+\\-]?\\d+)/g, '<bdi dir="ltr">$1</bdi>');
    bg.style.opacity = String(q * (1 - out));
    bg.style.left = a.x + "px"; bg.style.top = a.y - 40 - 50 * eo(prog(lt, b.badge.at, 1200)) + "px";
    bg.style.transform = "translate(-50%,-50%) scale(" + (0.4 + 0.6 * back(q)) + ") rotate(" + (-6 + 6 * eo(q)) + "deg)";
  } else bg.style.opacity = "0";
  // the number ticking
  const ct = $("#count");
  if (b.count) {
    const q = prog(lt, b.count.at - 300, 300), out = prog(lt, b.dur - 260, 240), run = eio(prog(lt, b.count.at, 650));
    const n = Math.round(b.count.from + (b.count.to - b.count.from) * run);
    ct.innerHTML = "<b>" + n + "</b>" + b.count.unit;
    ct.style.opacity = String(q * (1 - out));
    ct.style.transform = "translateX(-50%) scale(" + (0.7 + 0.3 * back(q)) * (1 + 0.08 * Math.sin(Math.PI * prog(lt, b.count.at + 600, 300))) + ")";
  } else ct.style.opacity = "0";
  // confetti
  const k0 = b.confetti != null ? lt - b.confetti : -1;
  bits.forEach((x) => {
    if (k0 < 0 || k0 > 2200) { x.el.style.opacity = "0"; return; }
    const s = k0 / 1000;
    x.el.style.opacity = String(1 - prog(k0, 1500, 700));
    x.el.style.transform = "translate(" + (x.x + x.vx * s) + "px," + (x.y + x.vy * s + 1300 * s * s) + "px) rotate(" + x.r * s + "deg)";
  });
};
setTime(0);
</script></body></html>`;
}

async function render(browser, spec) {
  const boxes = JSON.parse(readFileSync(join(SHOTS, spec.boxes), "utf8"));
  const dir = join(TMP, spec.name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.setContent(page(spec, boxes), { waitUntil: "load" });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(500);
  const total = await p.evaluate(() => window.TOTAL);
  if (process.env.PREVIEW) {
    for (const t of process.env.PREVIEW.split(",").map(Number)) {
      await p.evaluate((v) => window.setTime(v), t);
      await p.waitForTimeout(60);
      if (process.env.DUMP) console.log(await p.evaluate(() => document.querySelector("#cap").innerHTML + " || " + document.querySelector("#badge").innerHTML));
      await p.screenshot({ path: join(SHOTS, `${spec.name}-${t}.png`) });
    }
    await ctx.close();
    console.log(`stills in ${SHOTS} (film ${(total / 1000).toFixed(1)} s)`);
    return;
  }
  // lossless frames (PNG): no JPEG noise for the encoder to spend bits on — cleaner and lighter both
  const frames = Math.ceil((total / 1000) * FPS);
  for (let i = 0; i < frames; i++) {
    await p.evaluate((t) => window.setTime(t), (i * 1000) / FPS);
    await p.screenshot({ path: join(dir, `f${String(i).padStart(5, "0")}.png`) });
  }
  await ctx.close();
  const out = resolve(`public/clips/${spec.name}-v2.mp4`);
  // H.264 (every phone plays it), tuned for flat screens and type (14 Nov 2026: «super clean, super optimized»):
  // 540×960 (lanczos from the 720 drawing), the slowest preset, the animation tune, CRF 30 (CRF=…), no sound track,
  // the index first so it starts at once
  const outH = Math.round((OUT_W * H) / W / 2) * 2;
  execFileSync(FF, ["-v", "error", "-y", "-framerate", String(FPS), "-i", join(dir, "f%05d.png"), "-c:v", "libx264", "-preset", "veryslow", "-tune", "animation",
    "-crf", process.env.CRF || "30", "-profile:v", "high", "-level:v", "4.0", "-vf", `scale=${OUT_W}:${outH}:flags=lanczos:in_range=pc:out_range=tv,format=yuv420p`, "-color_range", "tv",
    "-an", "-movflags", "+faststart", out]);
  // its poster (the title card, 1.2 s in): what the film's frame shows before the first frame arrives
  const sharp = (await import("sharp")).default;
  await sharp(join(dir, `f${String(Math.round(1.2 * FPS)).padStart(5, "0")}.png`)).resize(360).webp({ quality: 74 }).toFile(out.replace(/\.mp4$/, ".webp"));
  // KEEP=1: the frames stay (in the system's temp folder), to try other encodings without filming again
  if (process.env.KEEP) console.log(`frames kept in ${dir}`);
  else rmSync(dir, { recursive: true, force: true });
  mkdirSync(resolve("../social/explainers"), { recursive: true });
  copyFileSync(out, resolve(`../social/explainers/${spec.name}.mp4`));
  console.log(`✓ ${out}  (${(total / 1000).toFixed(1)} s, ${frames} frames)`);
}

if (what === "capture-items" || what === "all") await captureItems();
if (what === "capture-choice" || what === "all") await captureChoice();
if (what === "capture-name" || what === "all") await captureName();
if (!what.startsWith("capture-")) {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  try {
    for (const k of what === "all" ? ["items", "choice", "name"] : [what]) {
      if (!FILMS[k]) throw new Error(`no film «${k}» (items, choice, name)`);
      if (!existsSync(join(SHOTS, FILMS[k].boxes))) throw new Error(`no screens yet: node scripts/option-films.mjs capture-${k}`);
      await render(browser, FILMS[k]);
    }
  } finally {
    await browser.close();
  }
}
