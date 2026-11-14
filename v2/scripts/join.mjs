/**
 * «كود التسجيل» (10 Nov 2026): a shop's static code that only makes accounts. Off for every shop
 * until the founder turns it on; on, the owner has its poster, a stranger who scans it makes an
 * account and lands on the shop's card at zero — never a tampon — and turned off, the printed code
 * says it no longer works. Against the real database and the dev server, on throwaway accounts
 * (the robots list first), all removed at the end.
 *
 *   node scripts/join.mjs      (from v2/, dev server on :3200 — or BASE=)
 */
import { mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { config } from "dotenv";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const BASE = process.env.BASE || "http://localhost:3200";
const OUT = ".e2e/join";
mkdirSync(OUT, { recursive: true });
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
for (const ip of ["local", "::1", "127.0.0.1"]) await admin.rpc("forget_tries", { p_key: `login-ip:${ip}` });
const PASS = `join-${randomBytes(6).toString("hex")}`;
const NOTES = ["card_hello", "coach", "logo_tip", "offer", "push", "install", "fix_tip", "first_scan", "first_gift", "mission", "links_tip", "reset_tip", "new_insights"];

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
const newPhone = () => robot(admin, `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`).then((d) => (phones.push(d), d));
async function person(name, isAdmin = false) {
  const d = await newPhone();
  const email = `216${d}@phone.pointidi.app`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASS, email_confirm: true, app_metadata: { phone: `+216${d}` } });
  if (error) throw error;
  users.push(data.user.id);
  await admin.from("people").upsert({ id: data.user.id, name, phone: `+216${d}`, seen: NOTES, is_admin: isAdmin });
  const client = createClient(URL_, ANON, { auth: { persistSession: false } });
  await client.auth.signInWithPassword({ email, password: PASS });
  return { id: data.user.id, digits: d, client };
}

let shop = null;
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ar-TN" };
async function signedIn(who) {
  const ctx = await browser.newContext(phone);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(1200);
  for (let i = 0; i < 6 && (await page.locator('input[name="phone"]').inputValue()) !== who.digits; i++) {
    await page.locator('input[name="phone"]').fill(who.digits);
    await page.waitForTimeout(700);
  }
  await page.locator('input[name="password"]').fill(PASS);
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 90000 }), page.locator('button[type="submit"]').click()]);
  return page;
}
const shot = async (page, name) => {
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((e) => (e.style.display = "none")));
  await page.screenshot({ path: `${OUT}/${name}.png`, caret: "initial" });
};

try {
  const boss = await person("zz Boss", true);
  const owner = await person("سامي");
  ({ data: shop } = await admin
    .from("shops")
    .insert({ owner_id: owner.id, name: "Café Yasmine", kind: "cafe", goal: 6, gift: "قهوة بلاش", color: "#6C47FF", created_at: new Date(Date.now() - 30 * 86_400_000).toISOString(), paid_until: new Date(Date.now() + 300 * 86_400_000).toISOString() })
    .select("*")
    .single());
  const { data: live } = await admin.from("news").select("id").eq("active", true);
  if (live?.length) await admin.from("news_views").insert(live.map((n) => ({ news_id: n.id, person_id: owner.id })));

  console.log("\nOff, as every shop is");
  check("off by default", (await owner.client.rpc("my_join")).data?.on === false);
  check("the owner cannot turn it on himself", !!(await owner.client.rpc("admin_set_join", { p_id: shop.id, p_on: true })).error);
  const ownerPage = await signedIn(owner);
  await ownerPage.goto(`${BASE}/shop/join`, { waitUntil: "load" });
  check("off, its page sends the owner back to «المحل»", new URL(ownerPage.url()).pathname === "/shop/settings", ownerPage.url());
  check("…where there is no way to it", (await ownerPage.getByText("كود التسجيل").count()) === 0);

  console.log("\nThe founder turns it on");
  check("the founder turns it on", (await boss.client.rpc("admin_set_join", { p_id: shop.id, p_on: true })).data?.ok === true);
  const mine = (await owner.client.rpc("my_join")).data;
  check("the owner has a code of his own", mine?.on === true && /^[A-Za-z0-9_-]{12}$/.test(mine.token ?? ""), mine);
  const token = mine.token;
  const anon = createClient(URL_, ANON, { auth: { persistSession: false } });
  check("nobody signed in can call nothing with it", !!(await anon.rpc("join_take", { p_token: token })).error || (await anon.rpc("join_take", { p_token: token })).data?.ok !== true);
  await ownerPage.goto(`${BASE}/shop/settings`, { waitUntil: "load" });
  await ownerPage.getByText("كود التسجيل").first().click();
  await ownerPage.waitForURL(/\/shop\/join/, { timeout: 20000 });
  // the poster is drawn on a canvas since 13 Nov 2026 (components/PosterStudio): drawn, it says so
  await ownerPage.locator('canvas[role=img][data-drawn="1"]').first().waitFor({ timeout: 20000 });
  await shot(ownerPage, "1-poster");
  check("«المحل» leads to its poster, with the code drawn", (await ownerPage.locator('canvas[role=img][data-drawn="1"]').count()) === 1);
  check("…and the line that says it never gives a tampon", (await ownerPage.getByText("ما يعطيش تامبون").count()) === 1);

  console.log("\nA stranger scans it");
  const ctx = await browser.newContext(phone);
  const stranger = await ctx.newPage();
  await stranger.goto(`${BASE}/j/${token}`, { waitUntil: "load" });
  await stranger.getByRole("link", { name: "اعمل الكونت متاعي" }).waitFor({ timeout: 30000 });
  await shot(stranger, "2-public");
  check("the shop's card, and the door to make an account", (await stranger.getByText("Café Yasmine").count()) >= 1);
  await stranger.getByRole("link", { name: "اعمل الكونت متاعي" }).click();
  await stranger.waitForURL(/\/join/, { timeout: 20000 });
  const d = await newPhone();
  await stranger.waitForTimeout(1200);
  await stranger.locator('input[name="name"]').fill("zz ياسمين");
  for (let i = 0; i < 6 && (await stranger.locator('input[name="phone"]').inputValue()) !== d; i++) {
    await stranger.locator('input[name="phone"]').fill(d);
    await stranger.waitForTimeout(700);
  }
  await stranger.locator('input[name="password"]').fill(PASS);
  await Promise.all([stranger.waitForURL(/\/c\//, { timeout: 90000 }), stranger.locator('button[type="submit"]').click()]);
  await shot(stranger, "3-card");
  const { data: who } = await admin.from("people").select("id").eq("phone", `+216${d}`).single();
  if (who?.id) users.push(who.id);
  const { data: card } = await admin.from("cards").select("id, stamps, joined").eq("shop_id", shop.id).eq("user_id", who?.id).single();
  check("the account made, and the shop's card in its wallet", !!card && new URL(stranger.url()).pathname === `/c/${card.id}`, stranger.url());
  check("…at zero, made by the code", card?.stamps === 0 && card?.joined === true, card);
  const { count } = await admin.from("moments").select("id", { count: "exact", head: true }).eq("shop_id", shop.id);
  check("…and never a tampon", count === 0, count);
  await stranger.goto(`${BASE}/j/${token}`, { waitUntil: "load" });
  check("scanned again: the same card, no second one", new URL(stranger.url()).pathname === `/c/${card?.id}`, stranger.url());
  await ownerPage.goto(`${BASE}/shop/join`, { waitUntil: "load" });
  check("the owner sees who came by it", (await ownerPage.getByText("1 عملو الكونت بيه").count()) === 1);
  await ownerPage.goto(`${BASE}/j/${token}`, { waitUntil: "load" });
  check("the owner scanning his own code is told what it is for", (await ownerPage.getByText("هذا كود التسجيل متاع محلّك").count()) === 1);

  console.log("\nTurned off");
  check("the founder turns it off", (await boss.client.rpc("admin_set_join", { p_id: shop.id, p_on: false })).data?.ok === true);
  const late = await browser.newContext(phone);
  const other = await late.newPage();
  await other.goto(`${BASE}/j/${token}`, { waitUntil: "load" });
  check("the printed code says it no longer works", (await other.getByText("الكود هذا ما عادش يخدم").count()) === 1);
  check("…and takes nobody", (await owner.client.rpc("join_take", { p_token: token })).data?.error === "not_found");
  await ownerPage.goto(`${BASE}/shop/join`, { waitUntil: "load" });
  check("…and the owner's page is gone again", new URL(ownerPage.url()).pathname === "/shop/settings");
  check("turned on again, the same code works again", (await boss.client.rpc("admin_set_join", { p_id: shop.id, p_on: true })).data?.ok && (await owner.client.rpc("my_join")).data?.token === token);
} catch (e) {
  failed.push(String(e?.message ?? e));
  console.log("  ✗", e);
} finally {
  await browser.close();
  if (shop) await admin.from("shops").delete().eq("id", shop.id);
  for (const id of users) await admin.auth.admin.deleteUser(id).catch(() => {});
  await unrobot(admin, phones);
  console.log(`\n${passed} passed, ${failed.length} failed`);
  if (failed.length) process.exit(1);
}
