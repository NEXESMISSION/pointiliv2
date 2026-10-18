/**
 * The owner who is somebody else's customer: the door to their own cards.
 *
 * An owner with a card at another business should find it from their own home
 * in one tap, and a card's back should leave them among their cards — not at
 * their own counter. An owner with no card anywhere should see no door at all.
 * Pictures land in v2/.e2e/owner-cards.
 *
 *   node scripts/owner-cards.mjs        (from v2/, with the dev server on :3200)
 */
import { mkdirSync } from "node:fs";
import { config } from "dotenv";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const BASE = process.env.BASE || "http://localhost:3200";
const OUT = ".e2e/owner-cards";
mkdirSync(OUT, { recursive: true });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const PASS = "owner-cards-2026";
const ALL_NOTES = ["card_hello", "coach", "logo_tip", "offer", "push", "install", "first_scan", "first_gift", "mission"];
const made = [];
const phones = [];
const ago = (ms) => new Date(Date.now() - ms).toISOString();

for (const ip of ["local", "::1", "127.0.0.1"]) for (const key of [`join-ip:${ip}`, `login-ip:${ip}`]) await admin.rpc("forget_tries", { p_key: key });

const phoneNo = () => `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
async function person(name) {
  const d = await robot(admin, phoneNo());
  phones.push(d);
  const { data, error } = await admin.auth.admin.createUser({ email: `216${d}@phone.pointidi.app`, password: PASS, email_confirm: true, app_metadata: { phone: `+216${d}` } });
  if (error) throw error;
  made.push(data.user.id);
  await admin.from("people").upsert({ id: data.user.id, name, phone: `+216${d}`, seen: ALL_NOTES });
  return { id: data.user.id, digits: d, name };
}
async function shopOf(owner, fields) {
  const { data, error } = await admin.from("shops").insert({ owner_id: owner.id, kind: "cafe", color: "#6C47FF", created_at: ago(9 * 86_400_000), trial_days: 7, ...fields }).select("*").single();
  if (error) throw error;
  return data;
}

console.log("setting up…");
// A owns a café and takes a tampon at the barber across the road
const a = await person("منير");
const aShop = await shopOf(a, { name: "Café Chneb", goal: 8, gift: "قهوة بلاش" });
const b = await person("جهاد");
const bShop = await shopOf(b, { name: "Barber Hamza", kind: "barber", goal: 6, gift: "تحسينة بلاش", color: "#1D5FA8" });
// C owns a shop and is nobody's customer
const c = await person("أنيس");
await shopOf(c, { name: "Pizza Nour", kind: "pizza", goal: 10, gift: "بيتزا بلاش", color: "#B45309" });

const { data: card, error: cardErr } = await admin
  .from("cards")
  .insert({ shop_id: bShop.id, user_id: a.id, stamps: 3, goal: bShop.goal, gift: bShop.gift, last_at: ago(2 * 3600_000), created_at: ago(5 * 86_400_000) })
  .select("id")
  .single();
if (cardErr) throw cardErr;

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const fails = [];
const ok = (cond, what) => (cond ? console.log(`  ✓ ${what}`) : (fails.push(what), console.log(`  ✗ ${what}`)));

async function signIn(who) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "ar-TN" });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "load", timeout: 90000 });
  await page.locator('input[name="phone"]').fill(who.digits);
  await page.locator('input[name="password"]').fill(PASS);
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 90000 }), page.locator('button[type="submit"]').click()]);
  return { ctx, page };
}

try {
  // ── the owner who holds a card elsewhere ────────────────────────────────
  console.log("\nan owner with a card at another shop");
  const { ctx, page } = await signIn(a);
  // the dev server's own badge sits in the top corner, exactly where the back
  // chevron is in an Arabic page, and swallows the click: out of the way
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {});
  await page.goto(`${BASE}/shop`, { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/owner-home.png` });
  const door = page.getByRole("link", { name: "الكارطات متاعي" });
  ok((await door.count()) === 1, "the door to their own cards is on the home");

  await door.first().click();
  await page.waitForURL(/\/wallet/, { timeout: 30000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/owner-wallet.png` });
  // innerText, not textContent: textContent also reads the <script> tags, and the
  // page the server sent carries the whole account — the shop's name included
  const text = await page.locator("body").innerText();
  ok(text.includes("Barber Hamza"), "the wallet holds the card from the other shop");
  ok(!text.includes("Café Chneb"), "their own shop is not among their cards");

  await page.goto(`${BASE}/c/${card.id}`, { waitUntil: "load", timeout: 90000 });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {});
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/owner-card.png` });
  await page.getByRole("link", { name: "ارجع" }).first().click({ timeout: 20000 });
  await page.waitForTimeout(1500);
  ok(new URL(page.url()).pathname === "/wallet", `back from a card lands among their cards (landed on ${new URL(page.url()).pathname})`);
  await ctx.close();

  // ── the owner who is nobody's customer ──────────────────────────────────
  console.log("\nan owner with no card anywhere");
  const { ctx: ctx2, page: page2 } = await signIn(c);
  await page2.goto(`${BASE}/shop`, { waitUntil: "load", timeout: 90000 });
  await page2.waitForTimeout(1200);
  await page2.screenshot({ path: `${OUT}/owner-home-none.png` });
  ok((await page2.getByRole("link", { name: "الكارطات متاعي" }).count()) === 0, "no door where there is nothing behind it");
  await ctx2.close();
} catch (e) {
  fails.push(`it broke: ${e.message}`);
  console.log(`  ✗ ${e.message}`);
} finally {
  await browser.close();
  for (const id of made) await admin.auth.admin.deleteUser(id).catch(() => {});
  await unrobot(admin, phones);
  console.log(`\n${fails.length ? `${fails.length} wrong: ${fails.join(" · ")}` : "all good"} — pictures in ${OUT} (accounts removed)`);
  process.exit(fails.length ? 1 : 0);
}
