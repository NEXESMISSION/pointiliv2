/**
 * The bell, end to end on this computer's database (localbase): the founder writes from the console
 * («الإشعارات», to every shop and then to one owner from the shop's page), the owner sees the count on
 * 🔔, opens it, the count goes; a piece read in the bell never pops up on the home after. Shoots the
 * screens into OUT. Throwaway accounts and the news written here, removed at the end.
 *
 *   BASE=http://localhost:3302 OUT=.e2e/bell node scripts/bell.mjs   (from v2/)
 */
import { mkdirSync } from "node:fs";
import { config } from "dotenv";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const BASE = process.env.BASE || "http://localhost:3302";
const OUT = process.env.OUT || ".e2e/bell";
if (!/localhost|127\.0\.0\.1/.test(BASE)) throw new Error("bell.mjs runs on this computer only (BASE=http://localhost:…)");
mkdirSync(OUT, { recursive: true });
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
for (const ip of ["local", "::1", "127.0.0.1"]) for (const k of [`join-ip:${ip}`, `login-ip:${ip}`]) await admin.rpc("forget_tries", { p_key: k });

const users = [], phones = [], news = [];
const phoneNo = () => `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
async function person(name, pass = "demo-1234") {
  const d = await robot(admin, phoneNo()); phones.push(d);
  const email = `216${d}@phone.pointidi.app`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: pass, email_confirm: true, app_metadata: { phone: `+216${d}` } });
  if (error) throw error; users.push(data.user.id);
  const client = createClient(URL_, ANON, { auth: { persistSession: false } });
  await client.auth.signInWithPassword({ email, password: pass });
  await client.rpc("me"); if (name) await client.rpc("set_name", { p_name: name });
  return { id: data.user.id, client, digits: d, pass };
}
const rpc = async (who, fn, args = {}) => { const { data, error } = await who.client.rpc(fn, args); if (error) console.log(`  ! ${fn}: ${error.message}`); return error ? { error: error.message } : data; };

const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ar-TN" };
let browser, failed = 0;
const ok = (what, cond) => { console.log(`  ${cond ? "✓" : "✗"} ${what}`); if (!cond) failed++; };
const shot = async (p, n, w = 700) => { await p.waitForTimeout(w); await p.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((e) => (e.style.display = "none"))).catch(() => {}); await p.screenshot({ path: `${OUT}/${n}.png` }); console.log("  ·", n); };
async function login(who, next, view = phone) {
  const ctx = await browser.newContext(view); const p = await ctx.newPage();
  await p.goto(BASE + "/login", { waitUntil: "load" });
  await p.locator('input[name="phone"]').fill(who.digits); await p.locator('input[name="password"]').fill(who.pass);
  await Promise.all([p.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60000 }).catch(() => {}), p.locator('button[type="submit"]').click()]);
  if (next) await p.goto(BASE + next, { waitUntil: "load" });
  return p;
}
const badge = (p) => p.locator('a[href="/shop/inbox"] span').first().textContent({ timeout: 1500 }).catch(() => null);
// a piece of news shows on the home a moment after it (its dialog is named by its title; the home's other notes are not news)
const popup = async (p, title, wait = 6000) => p.locator(`[role="dialog"][aria-label="${title}"]`).waitFor({ timeout: wait }).then(() => true).catch(() => false);

try {
  browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  console.log("\nA shop and the founder");
  const owner = await person("جيهان");
  await rpc(owner, "open_shop", { p_name: "Salon Jihen", p_kind: "beauty" });
  await rpc(owner, "save_card", { p_goal: 8, p_gift: "سشوار", p_color: "#c2417a", p_gap: 0 });
  const boss = await person("Founder", "boss-1234");
  await admin.from("people").update({ is_admin: true }).eq("id", boss.id);

  // ── the founder writes to every shop, from the console ──
  console.log("\nThe console: to every shop");
  const f = await login(boss, "/admin/news", { ...phone, viewport: { width: 430, height: 932 } });
  await f.getByPlaceholder("مثلا: زدنا حاجة جديدة").fill("الإشعارات وصلت 🔔");
  await f.getByPlaceholder("جملة ولا زوز، بالتونسي").fill("من توّا، كل جديد من Pointili تلقاه هوني، فوق الصفحة متاعك.");
  await f.getByPlaceholder("مثلا: شوف").fill("شوف الأرقام");
  await f.getByPlaceholder("/shop/stats").fill("/shop/stats");
  await shot(f, "bell-01-console", 500);
  await f.getByRole("button", { name: "ابعث" }).click();
  await f.getByText("تبعث ✓").waitFor({ timeout: 15000 }).catch(() => {});
  await shot(f, "bell-02-console-sent", 600);
  const first = (await admin.from("news").select("id").eq("title", "الإشعارات وصلت 🔔")).data ?? [];
  news.push(...first.map((r) => r.id));
  ok("the news is written (one row)", first.length === 1);

  // ── the owner: the count on the bell, the popup once, the bell's page ──
  console.log("\nThe owner");
  // signed in, an owner lands on the home by itself: one render of it (a second load could race the popup's own «seen»)
  const o = await login(owner);
  await o.waitForURL((u) => u.pathname === "/shop", { timeout: 30000 }).catch(() => {});
  await o.waitForTimeout(300);
  ok("the bell says 1", (await badge(o)) === "1");
  await shot(o, "bell-03-home-badge", 200);
  ok("…and the news pops up once on the home", await popup(o, "الإشعارات وصلت 🔔"));
  await shot(o, "bell-04-home-popup", 500);
  await o.goto(BASE + "/shop/inbox", { waitUntil: "load" });
  await shot(o, "bell-05-inbox", 900);
  ok("the bell's page lists it", (await o.getByText("الإشعارات وصلت 🔔").count()) > 0);

  // ── the founder writes to this owner alone, from the shop's page ──
  console.log("\nThe console: to one owner");
  const shopId = (await rpc(owner, "me")).shop.id;
  await f.goto(BASE + `/admin/shop/${shopId}`, { waitUntil: "load" });
  await f.getByRole("link", { name: "ابعثلو إشعار" }).first().click();
  await f.waitForURL("**/admin/news?to=**", { timeout: 15000 });
  await f.getByText("Salon Jihen برك").waitFor({ timeout: 15000 }).catch(() => {});
  ok("the composer says who it is for", (await f.getByText("Salon Jihen برك").count()) > 0);
  await f.getByPlaceholder("مثلا: زدنا حاجة جديدة").fill("الأبونمان متاعك تفعّل");
  await f.getByPlaceholder("جملة ولا زوز، بالتونسي").fill("يعيشك جيهان. الأبونمان متاعك يخدم حتى 13 ديسمبر 2026.");
  await shot(f, "bell-06-console-one", 400);
  await f.getByRole("button", { name: "ابعث" }).click();
  await f.getByText("تبعث ✓").waitFor({ timeout: 15000 }).catch(() => {});
  const second = (await admin.from("news").select("id, only_people").eq("title", "الأبونمان متاعك تفعّل")).data ?? [];
  news.push(...second.map((r) => r.id));
  ok("written for this owner alone", second.length === 1 && JSON.stringify(second[0].only_people) === JSON.stringify([owner.id]));

  // a second shop must never see the first owner's note
  const other = await person("كريم");
  await rpc(other, "open_shop", { p_name: "Café Karim", p_kind: "cafe" });
  await rpc(other, "save_card", { p_goal: 10, p_gift: "قهوة", p_color: "#6c47ff", p_gap: 0 });
  const otherBox = await rpc(other, "my_inbox");
  ok("another shop does not get it (nor the news from before it opened)", Array.isArray(otherBox) && otherBox.length === 0);

  await o.goto(BASE + "/shop", { waitUntil: "load" });
  await o.waitForTimeout(300);
  ok("the bell says 1 again", (await badge(o)) === "1");
  await o.goto(BASE + "/shop/inbox", { waitUntil: "load" });
  await shot(o, "bell-07-inbox-two", 900);
  ok("two pieces, the new one marked", (await o.getByText("جديد", { exact: true }).count()) === 1);
  await o.goto(BASE + "/shop", { waitUntil: "load" });
  await o.waitForTimeout(400);
  ok("read in the bell: the count is gone", (await badge(o)) === null);
  ok("…and it never pops up after", !(await popup(o, "الأبونمان متاعك تفعّل")));
  await o.goto(BASE + "/shop/settings", { waitUntil: "load" });
  await shot(o, "bell-08-settings", 700);
  ok("the bell is on «المحل» too", (await o.locator('a[href="/shop/inbox"]').count()) === 1);

  // stopped in the console: it leaves the bell
  await admin.from("news").update({ active: false }).eq("id", second[0].id);
  const after = await rpc(owner, "my_inbox");
  ok("a piece stopped leaves the bell", Array.isArray(after) && after.length === 1);

  // nobody signed in: nothing
  const anon = createClient(URL_, ANON, { auth: { persistSession: false } });
  const nobody = await anon.rpc("my_inbox");
  ok("nobody signed in gets nothing", !!nobody.error || (Array.isArray(nobody.data) && nobody.data.length === 0));

  console.log(failed ? `\n${failed} FAILED` : "\nAll good. Screens in " + OUT);
} finally {
  if (browser) await browser.close();
  if (news.length) await admin.from("news").delete().in("id", news);
  for (const id of users) await admin.from("shops").delete().eq("owner_id", id);
  for (const id of users) await admin.auth.admin.deleteUser(id).catch(() => {});
  await unrobot(admin, phones);
  console.log("cleaned up", users.length, "accounts,", news.length, "news");
  process.exitCode = failed ? 1 : 0;
}
