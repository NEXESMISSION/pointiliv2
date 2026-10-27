/**
 * The founder's console (the board and its tools), on a phone and on a screen.
 *
 * Fills the database with a believable handful of shops, owners, customers
 * and moments; signs a throwaway admin in; and walks the board: the filters,
 * the search, a note written and kept, a stage picked and the board narrowed
 * to it, a shop opened, days of trial and a
 * year turned on, a switch, a new password — and the tools page, with a line
 * written in the books and taken back. Every page is checked for anything
 * that spills sideways or a Latin run flipped inside the Arabic, and timed.
 * Everything it made is deleted at the end, even if a check fails.
 *
 * Its admin sees every account, the real ones too — names and phone numbers
 * on the shots. Keep them in shots/ (ignored by git); never point OUT at a
 * folder that gets committed: the repository is public. Every change it makes
 * is made on this run's own demo shop or account, found by its id or number —
 * never on the first line of a list, which may be a real one.
 *
 *   node scripts/console.mjs            (from v2/, with the dev server on :3200)
 *   SIZES=390x844 node scripts/console.mjs
 */
import { mkdirSync } from "node:fs";
import { config } from "dotenv";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const BASE = process.env.BASE || "http://localhost:3200";
const OUT = process.env.OUT || "shots/console";
mkdirSync(OUT, { recursive: true });
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
// a phone first (the console is made for it now), then a laptop
const SIZES = (process.env.SIZES || "390x844,1366x900").split(",").map((s) => s.split("x").map(Number));

const TAG = "zzdemo";
const made = { users: [], shops: [] };
const rnd = () => Math.random();
const phoneNo = () => `9${String(Math.floor(rnd() * 1e7)).padStart(7, "0")}`;
const ago = (h) => new Date(Date.now() - h * 3600_000).toISOString();

const phones = [];
async function person(name, { admin = false } = {}) {
  // a robot: on the list before it exists, so the founder's console never shows it (scripts/robots.mjs)
  const phone = await robot(db, phoneNo());
  phones.push(phone);
  const { data, error } = await db.auth.admin.createUser({ email: `216${phone}@phone.pointidi.app`, password: `${TAG}-123456`, email_confirm: true, app_metadata: { phone: `+216${phone}` } });
  if (error) throw error;
  await db.from("people").upsert({ id: data.user.id, name, phone: `+216${phone}`, is_admin: admin });
  made.users.push(data.user.id);
  return { id: data.user.id, phone };
}

/* ── 1 · a database worth looking at ────────────────────────────────── */
// [name, kind, goal, gift, colour, opened hours ago]
const SHOPS = [
  ["zz قهوة الصباح", "cafe", 10, "قهوة بلاش", "#6C47FF", 30],
  ["zz حلاقة باب بحر", "barber", 8, "حلاقة بلاش", "#C2410C", 2],
  ["zz مخبزة النور", "bakery", 10, "كرواسون بلاش", "#15803D", 200],
  ["zz عصير الحومة", "juice", 6, "عصير بلاش", "#0E7490", 90],
  ["zz بيتزا سيتا", "pizza", 10, "بيتزا صغيرة بلاش", "#9D174D", 400],
  ["zz صالون ياسمين", "beauty", null, null, "#8A6508", 5],
];
const NAMES = ["سامي", "أمين", "ياسمين", "كريم", "هاجر", "محمد علي", "نور", "أيوب", "سارة", "وليد"];

console.log("· building a demo world");
const customers = [];
for (const n of NAMES) customers.push(await person(`zz ${n}`));

const owners = [];
for (const [i, [name, kind, goal, gift, color, opened]] of SHOPS.entries()) {
  const owner = await person(`zz مولى ${name.slice(3)}`);
  owners.push(owner);
  const { data: shop, error } = await db.from("shops").insert({ owner_id: owner.id, name, kind, goal, gift, color, paused: i === 4, created_at: ago(opened) }).select("id").single();
  if (error) throw error;
  made.shops.push(shop.id);
  if (!goal) continue;
  // a handful of customers each, some near the gift, some who already got one, an hour or more after the opening
  for (const c of customers.slice(0, 3 + Math.floor(rnd() * 7))) {
    const stamps = 1 + Math.floor(rnd() * goal);
    const { data: card } = await db.from("cards").insert({ shop_id: shop.id, user_id: c.id, stamps, goal, gift, last_at: ago(rnd() * Math.min(opened - 1, 72)) }).select("id").single();
    if (!card) continue;
    const rows = Array.from({ length: Math.min(stamps, 5) }, () => ({ shop_id: shop.id, card_id: card.id, kind: "stamp", created_at: ago(rnd() * Math.max(0, opened - 1.2)) }));
    await db.from("moments").insert(rows);
  }
}
const mine = made.shops[0];

/* a visit for the first owner: seen on the board as «دخل من …» */
await db.from("visits").insert({
  id: crypto.randomUUID(), visitor: `zz-${crypto.randomUUID().slice(0, 12)}`, user_id: owners[0].id, started_at: ago(3), last_at: ago(2.9),
  landing: "/shop", source: "direct", device: "phone", os: "Android", browser: "Chrome", country: "TN", city: "Tunis",
});

const boss = await person("zz Saif", { admin: true });
for (const ip of ["local", "::1", "127.0.0.1"])
  for (const key of [`join-ip:${ip}`, `login-ip:${ip}`]) {
    try { await db.rpc("forget_tries", { p_key: key }); } catch { /* the counter may not be there */ }
  }

/* the board's one query, as an admin runs it (this run's admin sees the robots and the tests too): how long, how heavy */
{
  const as = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  await as.auth.signInWithPassword({ email: `216${boss.phone}@phone.pointidi.app`, password: `${TAG}-123456` });
  let ms = 0;
  let rows = [];
  for (let i = 0; i < 3; i++) {
    const t0 = Date.now();
    const { data, error } = await as.rpc("admin_board");
    if (error) throw error;
    ms = Date.now() - t0;
    rows = data;
  }
  console.log(`· admin_board: ${ms} ms for ${rows.length} shops, ${Math.round(JSON.stringify(rows).length / 1024)} kB of JSON`);
  await as.auth.signOut();
}

/* ── 2 · walk it ────────────────────────────────────────────────────── */
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const problems = [];
const ok = (what) => console.log(`  ✓ ${what}`);
const bad = (what) => {
  console.log(`  ✗ ${what}`);
  problems.push(what);
};

/** Nothing spills sideways and no Latin run sits unisolated in the Arabic; the shot goes to OUT. */
async function look(page, name) {
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((e) => (e.style.display = "none")));
  const r = await page.evaluate(() => {
    const doc = document.documentElement;
    const wide = [];
    for (const el of document.querySelectorAll("body *")) {
      const b = el.getBoundingClientRect();
      if (!b.width || el.closest("[data-list]")) continue; // a row that scrolls sideways on purpose (the filters)
      if (b.right > innerWidth + 1 || b.left < -1) wide.push(`${el.tagName.toLowerCase()}.${(el.className || "").toString().split(" ")[0]}`);
    }
    // a neutral at the edge of a line that mixes the two: «/wallet · …» where the slash jumps to the far end
    const loose = [];
    for (const el of document.querySelectorAll("main p, main span, main b, main dd, main li")) {
      if (el.children.length) continue;
      const txt = (el.textContent || "").trim();
      if (!/[؀-ۿ]/.test(txt) || !/^[/\.:#·+-]/.test(txt) || !/[A-Za-z]/.test(txt)) continue;
      if (el.closest("bdi, .num, [dir='ltr']")) continue;
      loose.push(txt.slice(0, 44));
    }
    // Arabic words sealed inside a left-to-right box: «4 أكتوبر 2026» comes out «أكتوبر 2026 4»
    const flipped = [];
    for (const el of document.querySelectorAll("main .num, main [dir='ltr'], main [dir='ltr'] *")) {
      if (el.children.length) continue;
      const txt = (el.textContent || "").trim();
      if (/[؀-ۿ]{2}/.test(txt) && getComputedStyle(el).direction === "ltr") flipped.push(txt.slice(0, 44));
    }
    return { scroll: doc.scrollWidth - doc.clientWidth, wide: [...new Set(wide)].slice(0, 5), loose: [...new Set(loose)].slice(0, 5), flipped: [...new Set(flipped)].slice(0, 5) };
  });
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  const wrong = r.scroll > 1 || r.wide.length || r.loose.length || r.flipped.length;
  if (wrong) bad(`${name}: ${r.scroll > 1 ? `spills ${r.scroll}px ` : ""}${r.wide.length ? `wide: ${r.wide.join(", ")} ` : ""}${r.loose.length ? `loose latin: ${r.loose.join(" | ")} ` : ""}${r.flipped.length ? `flipped: ${r.flipped.join(" | ")}` : ""}`);
  else ok(name);
}

/** The time from asking for a page to the board drawn, and how heavy the page was. */
async function timed(page, url, ready) {
  const t0 = Date.now();
  await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
  await ready.waitFor({ timeout: 60000 });
  const ms = Date.now() - t0;
  const kb = await page.evaluate(() => Math.round(performance.getEntriesByType("navigation")[0]?.transferSize / 1024 || 0));
  return { ms, kb };
}

let current = null;
try {
  for (const [W, H] of SIZES) {
    const phoneSize = W < 768;
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: phoneSize ? 2 : 1, isMobile: phoneSize, hasTouch: phoneSize, locale: "ar-TN" });
    const page = await ctx.newPage();
    current = page;
    page.on("pageerror", (e) => problems.push(`THROW ${e.message}`));
    page.on("console", (m) => {
      const s = m.text();
      if (m.type() === "error" && !/favicon|404|Failed to load resource/i.test(s)) problems.push(`ERR ${s.slice(0, 160)}`);
    });
    const at = `${W}x${H}`;
    console.log(`\n${at}`);

    await page.goto(`${BASE}/login?next=/admin`, { waitUntil: "load" });
    // typed before the page woke (a dev server under load), the number was wiped by React: typed again until it holds
    for (let i = 0; i < 5 && (await page.locator('input[name="phone"]').inputValue()) !== boss.phone; i++) {
      await page.locator('input[name="phone"]').fill(boss.phone);
      await page.waitForTimeout(600);
    }
    await page.locator('input[name="password"]').fill(`${TAG}-123456`);
    await page.locator('button[type="submit"]').click();
    await page.locator("article[data-shop]").first().waitFor({ timeout: 60000 });

    const line = (sel = "") => page.locator(`article[data-shop='${mine}'] ${sel}`.trim());
    // the board, and how fast it comes (a second time: the first one compiles the page in dev)
    const speed = await timed(page, "/admin", page.locator("article[data-shop]").first());
    console.log(`  · the board drawn in ${speed.ms} ms (${speed.kb} kB)`);
    await look(page, `${at}-01-board`);

    // the board opens on «آخر من دخل · ما خلّصوش»: whoever moved last on top, and not one paid shop
    const unpaid = page.getByRole("tab", { name: /^آخر من دخل · ما خلّصوش/ });
    if ((await unpaid.getAttribute("aria-selected")) !== "true") bad("the board does not open on «آخر من دخل · ما خلّصوش»");
    const moved = await page.locator("article[data-shop]").evaluateAll((els) => els.slice(0, 12).map((e) => e.getAttribute("data-moved") ?? ""));
    if (moved.some((m, i) => i > 0 && m > moved[i - 1])) bad(`«آخر من دخل · ما خلّصوش» is not in order: ${moved.join(" ")}`);
    else if (await page.locator("article[data-shop]", { hasText: "خالص حتى" }).count()) bad("a paid shop under «ما خلّصوش»");
    else ok("«آخر من دخل · ما خلّصوش» first: whoever moved last on top, no paid shop");
    // «آخر من دخل» itself: the same order, the paid ones too
    await page.getByRole("tab", { name: "آخر من دخل", exact: true }).click();
    await page.waitForTimeout(150);
    const movedAll = await page.locator("article[data-shop]").evaluateAll((els) => els.slice(0, 12).map((e) => e.getAttribute("data-moved") ?? ""));
    if (movedAll.some((m, i) => i > 0 && m > movedAll[i - 1])) bad(`«آخر من دخل» is not in order: ${movedAll.join(" ")}`);
    else ok("«آخر من دخل»: the same order, every shop");

    // the filters: each one shows its own count of lines (the whole list grows as it scrolls, 24 at a time)
    for (const name of ["آخر من دخل · ما خلّصوش", "جداد", "يخدمو", "التجربة وفات", "خالصين", "الكل"]) {
      const tab = page.getByRole("tab", { name: new RegExp(`^${name}`) });
      await tab.click();
      await page.waitForTimeout(150);
      const said = Number((await tab.locator(".num").textContent()) ?? "-1");
      const shown = await page.locator("article[data-shop]").count();
      if (shown !== Math.min(said, 24) && !(said === 0 && shown === 0)) bad(`filter «${name}»: says ${said}, shows ${shown}`);
    }
    ok("the filters: each shows what it counts");

    // the search: this run's shop by its name, and nothing else of the demo world
    await page.getByRole("searchbox", { name: "لوّج" }).fill(SHOPS[0][0]);
    await line().waitFor({ timeout: 10000 });
    const hits = await page.locator("article[data-shop]").count();
    if (hits < 1 || (await page.locator(`article[data-shop='${made.shops[2]}']`).count())) bad(`search: ${hits} lines for «${SHOPS[0][0]}»`);
    else ok(`search: «${SHOPS[0][0]}» found`);

    // the founder's note, on this run's own shop: written, saved, there after a reload
    const NOTE = `zz كلّمتو، يخلّص الاثنين ${at}`;
    await line("textarea").fill(NOTE);
    await line("textarea").press("Enter");
    await line("[aria-label='تسجّلت']").waitFor({ timeout: 20000 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("searchbox", { name: "لوّج" }).fill(SHOPS[0][0]);
    await line("textarea").waitFor({ timeout: 60000 });
    const back = await line("textarea").inputValue();
    if (back !== NOTE) bad(`note not kept: «${back}»`);
    else ok("the note: saved, and there after a reload");
    // and found by a word of it
    await page.getByRole("searchbox", { name: "لوّج" }).fill("يخلّص الاثنين");
    if (!(await line().count())) bad("search by a word of the note: not found");
    await page.getByRole("searchbox", { name: "لوّج" }).fill(SHOPS[0][0]);

    // where the founder is with it, next to the note: picked, said since when, there after a reload
    await line().getByRole("combobox", { name: "وين وصلت معاه" }).selectOption("waiting_pay");
    await line("[data-stage='waiting_pay']").getByText("توّا").waitFor({ timeout: 20000 });
    await page.waitForTimeout(1500);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("searchbox", { name: "لوّج" }).fill(SHOPS[0][0]);
    await line("textarea").waitFor({ timeout: 60000 });
    if ((await line().getByRole("combobox", { name: "وين وصلت معاه" }).inputValue()) !== "waiting_pay") bad("the stage was not kept");
    else ok("the stage: picked next to the note, kept, since when");
    await look(page, `${at}-01b-stage`);
    // the board narrowed to that stage: this run's shop in it, and every line at that stage
    await page.getByRole("searchbox", { name: "لوّج" }).fill("");
    // the stages' own row over the lists: a stage's chip by the start of its name
    const narrowTo = (label) => page.getByRole("tablist", { name: "المراحل" }).getByRole("tab", { name: new RegExp(`^${label}`) }).click();
    await narrowTo("نستنّى في الخلاص");
    await line().waitFor({ timeout: 10000 });
    const stages = await page.locator("article[data-shop] [data-stage]").evaluateAll((els) => els.map((e) => e.getAttribute("data-stage")));
    if (stages.some((x) => x !== "waiting_pay")) bad(`the stage filter shows other stages: ${stages.join(" ")}`);
    // a line picked away while the list is narrowed stays (a note may follow), and goes when a list is chosen again
    await line().getByRole("combobox", { name: "وين وصلت معاه" }).selectOption("called");
    await line("[data-stage='called']").waitFor({ timeout: 20000 });
    await page.waitForTimeout(600);
    if (!(await line().count())) bad("a line picked away vanished at once");
    await page.getByRole("tab", { name: /^الكل/ }).click();
    await page.waitForTimeout(300);
    if (await line().count()) bad("a line picked away is still under its old stage");
    await narrowTo("كلّمتو");
    await line().waitFor({ timeout: 10000 });
    ok(`the board narrowed to a stage (${stages.length} at it), a line picked away kept until a list is chosen again`);
    await narrowTo("كل المراحل");
    await unpaid.click();
    await page.getByRole("searchbox", { name: "لوّج" }).fill(SHOPS[0][0]);

    // its numbers, its last 14 days and the owner's signs are on the line itself, nothing to open
    for (const label of ["حرفاء", "تامبونات", "رجعو", "كادوات"]) if (!(await line().getByText(label, { exact: true }).count())) bad(`the line has no «${label}»`);
    if (!(await line("[role=img]").count())) bad("the line has no 14 days");
    else ok("the line itself: four numbers and its 14 days");
    // and what they say about the shop: what is going on, why, and what to do now
    const read = (await line("[data-reading]").textContent().catch(() => "")) ?? "";
    if (!read.includes("←")) bad(`the line has no reading: «${read}»`);
    else ok(`the line's reading: «${read.replace(/\s+/g, " ").slice(0, 90)}»`);
    // and its shape: five meters, the road, what stands out
    const meters = await line("[data-profile] [data-meter]").count();
    const said = ((await line("[data-profile] ul").textContent().catch(() => "")) ?? "").replace(/\s+/g, " ");
    if (meters !== 5) bad(`the line's analysis has ${meters} meters`);
    else ok(`the line's analysis: 5 meters, the road, «${said.slice(0, 80)}»`);

    // the shop opened: its card, what happened, and what is done to it
    await line("button[aria-expanded]").click();
    await line().getByRole("switch", { name: "موقوف" }).waitFor({ timeout: 20000 });
    await look(page, `${at}-02-shop-open`);

    // days of trial: the line says so in the shop's story
    await line().getByRole("button", { name: "+ أيّام تجربة" }).click();
    await line().getByRole("button", { name: "+3 أيّام" }).click();
    await line().getByText("زدنا في التجربة حتى").first().waitFor({ timeout: 20000 });
    ok("days of trial added: in the shop's story");

    // a switch that asks first: stopped, then back
    const stop = line().getByRole("switch", { name: "موقوف" });
    await stop.click();
    await line().getByRole("button", { name: "إيه" }).click();
    await page.waitForFunction((id) => document.querySelector(`article[data-shop='${id}'] [role=switch][aria-label='موقوف']`)?.getAttribute("aria-checked") === "true", mine, { timeout: 20000 });
    await line().getByText("موقوف", { exact: true }).first().waitFor({ timeout: 20000 });
    await stop.click();
    await page.waitForFunction((id) => document.querySelector(`article[data-shop='${id}'] [role=switch][aria-label='موقوف']`)?.getAttribute("aria-checked") === "false", mine, { timeout: 20000 });
    ok("stopped and started again (asked first)");
    // «شنوّة يبيع» with nothing written: refused, and it says why
    await line().getByRole("switch", { name: "شنوّة يبيع" }).click();
    await line().getByText("مولى المحل مازال ما كتب حتى حاجة يبيعها.").waitFor({ timeout: 20000 });
    ok("«شنوّة يبيع» with nothing to sell: refused, and why");

    // a new password for this run's owner: shown once, with its WhatsApp
    await line().getByRole("button", { name: "كلمة سر جديدة" }).click();
    await line().getByText("كلمة السر الجديدة").waitFor({ timeout: 20000 });
    const wa = await line().getByRole("link", { name: /ابعثها على الواتساب/ }).getAttribute("href");
    if (!wa?.includes(`216${owners[0].phone}`)) bad(`the password's WhatsApp goes to ${wa}`);
    await look(page, `${at}-04-shop-done`);
    // the owner's old password is gone: the new one is what signs in (set it back for the next size)
    await db.auth.admin.updateUserById(owners[0].id, { password: `${TAG}-123456` });

    // the shop's whole page, from its name on the board: every part there, nothing spilling
    await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
    await page.getByRole("searchbox", { name: "لوّج" }).fill(SHOPS[0][0]);
    await line().getByRole("link", { name: SHOPS[0][0], exact: true }).click();
    await page.waitForURL(`**/admin/shop/${mine}`, { timeout: 30000 });
    // the page arrives after the console's skeleton: its first part first, then the others
    await page.getByRole("heading", { name: "آخر 30 يوم" }).waitFor({ timeout: 30000 });
    for (const part of ["آخر 30 يوم", "الطريق متاعو", "شنوّة عمل في الأبليكاسيون", "كل مرّة دخل", "الحرفاء", "الكارط", "الأبونمان والخيارات", "التليفونات اللي داخل منهم"])
      if (!(await page.getByRole("heading", { name: part }).count())) bad(`the shop's page has no «${part}»`);
    if (!(await page.locator("[data-reading]").count())) bad("the shop's page has no reading");
    if (!(await page.getByRole("heading", { name: "التحليل" }).count()) || (await page.locator("[data-profile] [data-meter]").count()) !== 5) bad("the shop's page has no analysis");
    // its stage there too, and the stages it went through (picked on the board: waiting for payment, then called)
    if ((await page.getByRole("combobox", { name: "وين وصلت معاه" }).inputValue()) !== "called") bad("the shop's page does not have its stage");
    const went = page.getByRole("list", { name: "المراحل اللي فات بيها" });
    if (!(await went.getByText("نستنّى في الخلاص").count()) || !(await went.getByText("كلّمتو", { exact: true }).count())) bad("the shop's page does not have the stages it went through");
    // picked here: the page read again, the newest stage last in the line
    await page.getByRole("combobox", { name: "وين وصلت معاه" }).selectOption("promised");
    await page.waitForFunction(() => document.querySelector("[aria-label='المراحل اللي فات بيها'] li:last-child")?.textContent?.includes("وعد يخلّص"), null, { timeout: 30000 });
    ok("the shop's page: its stage, picked there too, and the stages it went through");
    await page.getByRole("switch", { name: "موقوف" }).waitFor({ timeout: 20000 });
    await look(page, `${at}-02b-study`);
    ok("the shop's whole page: opened from its name, every part there");

    // the subscriptions: this run's shop found, a year turned on from its own line (a robot's shop: never told
    // to Facebook, never in the founder's books), its picture opens; then stopped, asked first
    const subs = await timed(page, "/admin/subs", page.getByRole("heading", { name: "الأبونمان" }));
    console.log(`  · the subscriptions drawn in ${subs.ms} ms (${subs.kb} kB)`);
    await look(page, `${at}-03-subs`);
    const sub = (sel = "") => page.locator(`article[data-sub='${mine}'] ${sel}`.trim());
    await page.getByRole("tab", { name: /^الكل/ }).click();
    await page.getByRole("searchbox", { name: "لوّج" }).fill(SHOPS[0][0]);
    await sub().waitFor({ timeout: 20000 });
    await sub().getByRole("button", { name: "خدّم الأبونمان" }).click();
    await sub().getByRole("button", { name: "خدّم عام" }).click();
    const pic = page.getByRole("dialog", { name: "تصويرة الأبونمان" });
    await pic.waitFor({ timeout: 20000 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/${at}-03b-plan-picture.png` });
    await pic.getByRole("button", { name: "X" }).click();
    await sub().getByText(/^خالص حتى/).first().waitFor({ timeout: 20000 });
    ok("a year turned on from the subscriptions: its picture opened, the line says «خالص»");
    await page.getByRole("tab", { name: /^خالصين/ }).click();
    await sub().waitFor({ timeout: 10000 });
    await sub().getByRole("button", { name: "وقّف الأبونمان" }).first().click();
    await sub().getByRole("button", { name: "وقّف الأبونمان" }).last().click();
    await sub().waitFor({ state: "detached", timeout: 20000 });
    ok("…and stopped, after the question: out of «خالصين»");

    // the tools: closed parts, one open
    const tools = await timed(page, "/admin/tools", page.getByRole("heading", { name: "الأدوات" }));
    console.log(`  · the tools drawn in ${tools.ms} ms (${tools.kb} kB)`);
    await look(page, `${at}-05-tools`);
    // a forgotten password, found by this run's customer's number (typed with spaces)
    const c = customers[0];
    await page.getByRole("textbox", { name: "اسم ولا نومرو" }).fill(`${c.phone.slice(0, 2)} ${c.phone.slice(2, 5)} ${c.phone.slice(5)}`);
    await page.getByRole("button", { name: "لوّج" }).click();
    const give = page.getByRole("button", { name: "كلمة سر", exact: true });
    await give.first().waitFor({ timeout: 20000 });
    // one account for one number, and it is this run's customer — only then is its password changed
    if ((await give.count()) !== 1 || !(await page.getByText(`zz ${NAMES[0]}`, { exact: true }).count())) throw new Error("the number did not find exactly this run's customer");
    await give.click();
    await page.getByText("كلمة السر الجديدة").waitFor({ timeout: 20000 });
    ok("a customer found by a spaced number, and a new password");
    await db.auth.admin.updateUserById(c.id, { password: `${TAG}-123456` });
    await page.getByRole("button", { name: "سكّر" }).click();

    // the books: a line written and taken back (a script's line: never in the founder's own books)
    await page.getByText("الفلوس", { exact: true }).click();
    await page.getByRole("button", { name: "اكتب خط في الحسابات" }).click();
    const WHAT = `zz إشهار تجربة ${at}`;
    await page.getByRole("textbox", { name: "على شنوّة" }).fill(WHAT);
    await page.getByRole("textbox", { name: "قدّاش" }).fill("47,35");
    await page.getByRole("button", { name: "سجّل", exact: true }).click();
    const booked = page.locator("li", { hasText: WHAT });
    await booked.waitFor({ timeout: 20000 });
    const says = (await booked.textContent()).replace(/\s+/g, " ");
    if (!says.includes("47,35")) bad(`the books' line says: ${says}`);
    await look(page, `${at}-06-tools-money`);
    await booked.getByRole("button", { name: "امسح الخط" }).click();
    await booked.getByRole("button", { name: "امسح", exact: true }).click();
    await booked.waitFor({ state: "detached", timeout: 20000 });
    ok("a line in the books, written and taken back");

    // the settings and the test account open, and the way out is there
    await page.getByText("الإعدادات", { exact: true }).click();
    await page.locator('input[name="support_phone"]').waitFor({ timeout: 10000 });
    await page.getByText("حساب التجربة", { exact: true }).click();
    await look(page, `${at}-07-tools-open`);
    if (!(await page.getByRole("button", { name: "اخرج" }).count())) bad("no way out on the tools page");

    // the numbers: three periods, the road with its biggest fall, a day read by a tap
    const stats = await timed(page, "/admin/stats", page.getByRole("heading", { name: "الأرقام" }));
    console.log(`  · the numbers drawn in ${stats.ms} ms (${stats.kb} kB)`);
    await look(page, `${at}-08-stats`);
    await page.getByRole("tab", { name: "من الأول" }).click();
    await page.getByRole("tab", { name: "من الأول", selected: true }).waitFor({ timeout: 10000 });
    const signed = Number((await page.locator("main .grid b.num").first().textContent()).replace(/\D/g, ""));
    if (signed < made.shops.length) bad(`the numbers count ${signed} shops from the start, this run alone opened ${made.shops.length}`);
    const day = page.locator("button[aria-pressed]").first();
    await day.click();
    if ((await day.getAttribute("aria-pressed")) !== "true") bad("a tap on a day did not read it");
    await page.getByText("من التسجيل للخلاص").waitFor({ timeout: 10000 });
    await look(page, `${at}-09-stats-all`);
    ok(`the numbers: ${signed} shops from the start, a day read by a tap`);

    // a Telegram alert's link: the shop opened on the board, scrolled to
    await page.goto(`${BASE}/admin?shop=${made.shops[3]}`, { waitUntil: "domcontentloaded" });
    await page.locator(`article[data-shop='${made.shops[3]}'] [role=switch]`).first().waitFor({ timeout: 30000 });
    ok("?shop=<id>: that shop open on the board");
    await ctx.close();
  }
} catch (e) {
  problems.push(`STOPPED ${e.message.split("\n")[0]}`);
  // where it stopped, to see why
  await current?.screenshot({ path: `${OUT}/stopped.png` }).catch(() => {});
} finally {
  await browser.close();
  console.log("\n· cleaning up");
  await db.from("books").delete().eq("robot", true).like("what", "zz إشهار تجربة%");
  for (const id of made.shops) await db.from("shops").delete().eq("id", id);
  for (const id of made.users) await db.auth.admin.deleteUser(id).catch(() => {});
  await unrobot(db, phones);
}

console.log(problems.length ? `\n${problems.length} problem(s):\n` + problems.map((p) => "  · " + p).join("\n") : "\nno problems");
process.exit(problems.length ? 1 : 0);
