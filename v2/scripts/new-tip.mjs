/**
 * The owners told what is new (components/NewTip), for real on a phone: an owner with customers sees it once
 * on the home, its rows open «شكون رجع؟» and the customers, it never comes back (here or after a reload),
 * and an owner with no customer yet never gets it. Throwaway robot accounts (scripts/robots.mjs), deleted at
 * the end; pictures in .e2e/new-tip/.
 *
 *   node scripts/new-tip.mjs      (from v2/, dev server on :3200 — or BASE=)
 */
import { mkdirSync } from "node:fs";
import { config } from "dotenv";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const BASE = process.env.BASE || "http://localhost:3200";
const OUT = ".e2e/new-tip";
mkdirSync(OUT, { recursive: true });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
for (const ip of ["local", "::1", "127.0.0.1"]) await admin.rpc("forget_tries", { p_key: `login-ip:${ip}` });
const PASS = "newtip-e2e-2026";
// every one-time note but this one: the home shows it and nothing else
const NOTES = ["card_hello", "coach", "logo_tip", "offer", "push", "install", "fix_tip", "first_scan", "first_gift", "mission", "links_tip", "reset_tip"];
const DAY = 86_400_000;
const ago = (ms) => new Date(Date.now() - ms).toISOString();
const TITLE = "زدنالك حاجتين جداد";
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
  const { data: news } = await admin.from("news").select("id").eq("active", true);
  if (news?.length) await admin.from("news_views").insert(news.map((x) => ({ news_id: x.id, person_id: data.user.id })));
  return { id: data.user.id, digits: d, name };
}
const shopOf = async (owner, name) => {
  const { data, error } = await admin
    .from("shops")
    .insert({ owner_id: owner.id, name, kind: "coffee", color: "#6C47FF", goal: 8, gift: "قهوة بلاش", created_at: ago(60 * DAY), paid_until: new Date(Date.now() + 300 * DAY).toISOString() })
    .select("*")
    .single();
  if (error) throw error;
  return data;
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
    await page.locator('button[type="submit"]').click();
    if (await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 45000 }).then(() => true, () => false)) return { ctx, page };
    if (attempt >= 2) throw new Error(`could not sign in ${who.digits}`);
  }
}
const shot = async (page, name) => {
  await page.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((e) => (e.style.display = "none")));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}.png` });
};
const seen = async (id) => (await admin.from("people").select("seen").eq("id", id).single()).data?.seen ?? [];

try {
  console.log(`\nAn owner with customers, on ${BASE}`);
  const owner = await person("سنية");
  const shop = await shopOf(owner, "Café Nouveau");
  const cust = await person("رانية");
  const { data: card } = await admin.from("cards").insert({ shop_id: shop.id, user_id: cust.id, stamps: 3, last_at: ago(2 * DAY), created_at: ago(20 * DAY) }).select("*").single();
  await admin.from("moments").insert([20, 9, 2].map((d) => ({ shop_id: shop.id, card_id: card.id, kind: "stamp", created_at: ago(d * DAY) })));
  const o = await signIn(owner);
  const tip = o.page.getByRole("dialog", { name: TITLE });
  check("the note shows on the home", await tip.waitFor({ timeout: 30000 }).then(() => true, () => false));
  const tt = await text(o.page);
  check("…with «شكون رجع؟» and removing a customer", tt.includes("شكون رجع؟") && tt.includes("تنجم تنحّي حريف") && tt.includes("نحّي الحريف"), tt.slice(0, 300));
  check("…and is written down as seen at once", (await seen(owner.id)).includes("new_insights"));
  await shot(o.page, "1-home-note");
  await tip.getByRole("link", { name: /شكون رجع؟/ }).click();
  await o.page.waitForURL(/\/shop\/insights/, { timeout: 60000 }).catch(() => {});
  await o.page.waitForTimeout(1500);
  check("its row opens «شكون رجع؟»", new URL(o.page.url()).pathname === "/shop/insights" && (await text(o.page)).includes("من الحرفاء رجعولك"), o.page.url());
  await o.page.goto(`${BASE}/shop`, { waitUntil: "load", timeout: 120000 });
  check("back on the home: never again", !(await o.page.getByRole("dialog", { name: TITLE }).waitFor({ timeout: 6000 }).then(() => true, () => false)));
  await o.ctx.close();

  console.log("\nAn owner with no customer yet");
  const fresh = await person("نادية");
  await shopOf(fresh, "Salon Neuf");
  const n = await signIn(fresh);
  check("no note: nobody to look back on yet", !(await n.page.getByRole("dialog", { name: TITLE }).waitFor({ timeout: 6000 }).then(() => true, () => false)));
  check("…and nothing written down", !(await seen(fresh.id)).includes("new_insights"));
  await n.ctx.close();
} catch (e) {
  failed.push(`crashed: ${e.message}`);
  console.log(`  ✗ crashed: ${e.message}`);
} finally {
  await browser.close();
  for (const id of made) await admin.auth.admin.deleteUser(id);
  await unrobot(admin, phones);
  console.log(`\n${passed} passed, ${failed.length} failed${failed.length ? `: ${failed.join(" · ")}` : ""} — robots deleted`);
  process.exit(failed.length ? 1 : 0);
}

function text(page) {
  return page.evaluate(() => document.body.innerText);
}
