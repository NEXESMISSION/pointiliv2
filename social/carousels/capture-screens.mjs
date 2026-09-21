/**
 * Real app screens for the carousels, in Tunisian, from the live site.
 *
 *   node social/carousels/capture-screens.mjs
 *
 * Uses a separate showcase shop so the test suite's demo data never leaks into
 * a post: owner شيراز, "Café Yasmine", 10 stamps → قهوة بلاش, and her regular
 * أمين. Every run resets أمين's card and walks the real flow:
 * 7 stamps → a real scan → full card → reward code.
 */
import "../../scripts/sql.mjs";
import { mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { runSql } from "../../scripts/sql.mjs";

const BASE = process.env.CAPTURE_BASE || "https://pointidi.vercel.app";
const OUT = "social/carousels/screens";
mkdirSync(OUT, { recursive: true });

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const OWNER = { digits: "20000002", name: "شيراز" };
const CUSTOMER = { digits: "20000003", name: "أمين" };
const authEmail = (d) => `216${d}@phone.pointidi.app`;

/** Create the account, or reset its password — either way we can sign in. */
async function ensureUser(who) {
  const password = randomBytes(12).toString("base64url");
  const phone = `+216${who.digits}`;
  const { data: found } = await admin.rpc("auth_lookup", { p_identifier: phone });
  if (found?.user_id) {
    await admin.auth.admin.updateUserById(found.user_id, { password });
  } else {
    const { error } = await admin.auth.admin.createUser({ email: authEmail(who.digits), password, email_confirm: true, app_metadata: { phone } });
    if (error) throw new Error(`create ${who.name}: ${error.message}`);
  }
  const client = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signInWithPassword({ email: authEmail(who.digits), password });
  if (error) throw new Error(`sign in ${who.name}: ${error.message}`);
  await client.rpc("update_my_profile", { p_full_name: who.name });
  return { ...who, password, client };
}

const call = async (who, fn, args = {}) => {
  const { data, error } = await who.client.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data;
};

console.log("showcase data");
const owner = await ensureUser(OWNER);
const customer = await ensureUser(CUSTOMER);

const ctx = await call(owner, "session_context");
if (!ctx.business) {
  const res = await call(owner, "create_business", { p_name: "Café Yasmine", p_category: "cafe", p_owner_name: OWNER.name, p_phone: null, p_email: null });
  if (!res.ok) throw new Error(`create_business: ${res.error}`);
}
const saved = await call(owner, "save_loyalty_card", {
  p_name: "Café Yasmine",
  p_description: "قهوة وحلويات",
  p_stamps_required: 10,
  p_reward_name: "قهوة بلاش",
  p_reward_description: "قهوة بلاش كي تكمّل 10 تامبونات.",
  p_color: "violet",
  p_icon: "coffee",
  p_cooldown_minutes: 0,
});
if (!saved.ok) throw new Error(`save_loyalty_card: ${saved.error}`);
await call(owner, "save_card_design", {
  p_description: "قهوة وحلويات",
  p_design: { template: "bold", bg: "#6535E0", bg2: "#4A24B5", accent: "#FFFFFF", text: "light", pattern: "waves", stamp: "icon", icon: "coffee", use_cover: false },
});
const biz = (await call(owner, "session_context")).business;
// a clean card for أمين on every run (and no stamp rate limit left over from the last run)
const { data: amine } = await admin.rpc("auth_lookup", { p_identifier: `+216${CUSTOMER.digits}` });
await runSql(`
  delete from public.rate_limits where key in ('stamp:${amine.user_id}', 'mint:${biz.id}');
  delete from public.reward_redemptions where business_id = '${biz.id}';
  delete from public.stamps where business_id = '${biz.id}';
  delete from public.activity_logs where business_id = '${biz.id}';
  delete from public.customers where business_id = '${biz.id}';
`);

const stamp = async () => {
  const t = await call(owner, "mint_qr_token");
  if (!t.ok) throw new Error(`mint: ${t.error}`);
  const r = await call(customer, "collect_stamp", { p_token: t.token, p_claim: null });
  if (!r.ok) throw new Error(`collect: ${r.error}`);
  return r;
};
// a few more regulars, so the owner's customer list looks like a real shop
const REGULARS = [
  { digits: "20000011", name: "سلمى", stamps: 9 },
  { digits: "20000012", name: "خليل", stamps: 12 },
  { digits: "20000013", name: "مريم", stamps: 11 },
  { digits: "20000014", name: "ياسين", stamps: 2 },
  { digits: "20000015", name: "نور", stamps: 10 },
  { digits: "20000016", name: "هادي", stamps: 3 },
];
for (const r of REGULARS) {
  const who = await ensureUser(r);
  for (let i = 0; i < r.stamps; i++) {
    const t = await call(owner, "mint_qr_token");
    const res = await call(who, "collect_stamp", { p_token: t.token, p_claim: null });
    if (!res.ok) throw new Error(`regular ${r.name}: ${res.error}`);
  }
}
console.log(`  ${REGULARS.length} more regulars`);

// a shop that has already given a few rewards: a dashboard full of zeros sells nothing
const rewardId = (await call(owner, "merchant_rewards")).items[0].id;
const ready = (await call(owner, "merchant_customers", { p_search: null, p_sort: "stamps" })).items.filter((c) => c.balance >= 10);
for (const c of ready.slice(0, 3)) {
  const res = await call(owner, "merchant_redeem_direct", { p_customer_id: c.id, p_reward_id: rewardId });
  if (!res.ok) throw new Error(`redeem ${c.name}: ${res.error}`);
}
console.log(`  ${Math.min(ready.length, 3)} rewards already given`);

let last;
for (let i = 0; i < 7; i++) last = await stamp();
const customerId = last.customer.id;
console.log("  أمين has 7/10");

// ── browser ───────────────────────────────────────────────────────────────
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: "ar-TN" };
const newCtx = async () => {
  const c = await browser.newContext(phone);
  await c.addCookies([{ name: "pl_lang2", value: "tn", url: BASE }]);
  return c;
};
const snap = async (page, name, { wait = 900 } = {}) => {
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`  ✓ ${name}`);
};
const login = async (page, path, who) => {
  await page.goto(BASE + path, { waitUntil: "load", timeout: 90000 });
  await page.locator('input[type="tel"]').fill(who.digits);
  await page.locator('input[name="password"]').fill(who.password);
  await Promise.all([page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 60000 }), page.locator('form button[type="submit"]').click()]);
};

try {
  console.log("signed out");
  const pub = await newCtx();
  const pp = await pub.newPage();
  await pp.goto(BASE + "/customer/register", { waitUntil: "load", timeout: 90000 });
  await snap(pp, "customer-register");
  await pp.goto(BASE + "/register", { waitUntil: "load", timeout: 90000 });
  await snap(pp, "business-register");
  await pub.close();

  console.log("owner");
  const oc = await newCtx();
  const op = await oc.newPage();
  await login(op, "/login", owner);
  await op.goto(BASE + "/loyalty", { waitUntil: "load", timeout: 90000 });
  await snap(op, "owner-loyalty");
  await op.goto(BASE + "/counter-qr", { waitUntil: "load", timeout: 90000 });
  await snap(op, "owner-counter-qr");
  await op.goto(BASE + "/qr", { waitUntil: "domcontentloaded" });
  await op.waitForSelector("[data-qr] svg", { timeout: 30000 });
  await snap(op, "owner-qr", { wait: 9000 }); // after any "+1" flash has faded

  console.log("customer");
  const cc = await newCtx();
  const cp = await cc.newPage();
  await login(cp, "/customer/login", customer);
  await cp.goto(BASE + "/customer", { waitUntil: "load", timeout: 90000 });
  await snap(cp, "customer-home");
  await cp.goto(`${BASE}/customer/cards/${customerId}`, { waitUntil: "load", timeout: 90000 });
  await snap(cp, "customer-card-7");

  // a real scan: the stamp-success screen, and the "+1" flash on the owner's QR screen
  const t = await call(owner, "mint_qr_token");
  await cp.goto(`${BASE}/scan/${t.token}`, { waitUntil: "domcontentloaded" });
  await cp.locator("h1").filter({ hasText: "!" }).first().waitFor({ timeout: 60000 });
  await snap(cp, "stamp-success", { wait: 1600 });
  await snap(op, "owner-qr-flash", { wait: 1800 });
  // the same card a moment later, with the stamp on it: a flow that ends on
  // "and it stays with him" cannot show the count going back down
  await cp.goto(BASE + "/customer", { waitUntil: "load", timeout: 90000 });
  await snap(cp, "customer-home-after");

  await stamp();
  await stamp();
  await cp.goto(`${BASE}/customer/cards/${customerId}`, { waitUntil: "load", timeout: 90000 });
  await snap(cp, "card-unlocked");

  // the real button on the full card creates the redemption and opens its code
  await cp.locator("button, a").filter({ hasText: "استعمل الكادو" }).first().click();
  await cp.waitForURL(/\/customer\/rewards\/use\//, { timeout: 60000 });
  await cp.locator("svg").first().waitFor({ timeout: 30000 });
  await snap(cp, "reward-code", { wait: 2000 });

  // what a scan looks like to someone with no account yet, and a code that expired
  const guest = await newCtx();
  const gp = await guest.newPage();
  const t2 = await call(owner, "mint_qr_token");
  await gp.goto(`${BASE}/scan/${t2.token}`, { waitUntil: "domcontentloaded" });
  await gp.waitForSelector("a[href*='/customer/register']", { timeout: 60000 });
  await snap(gp, "scan-needs-account", { wait: 1200 });
  await gp.goto(`${BASE}/scan/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`, { waitUntil: "domcontentloaded" });
  await gp.locator("h1").first().waitFor({ timeout: 60000 });
  await snap(gp, "scan-missed", { wait: 1200 });
  await guest.close();

  await op.goto(BASE + "/dashboard", { waitUntil: "load", timeout: 90000 });
  await snap(op, "owner-dashboard");
  await op.goto(BASE + "/billing", { waitUntil: "load", timeout: 90000 });
  await op.addStyleTag({ content: "nav[aria-label] { display: none !important; }" });
  await op.waitForTimeout(900);
  await op.screenshot({ path: `${OUT}/owner-billing.png`, fullPage: true });
  console.log("  ✓ owner-billing");
  await op.goto(BASE + "/activity?range=today", { waitUntil: "load", timeout: 90000 });
  await snap(op, "owner-activity");
  await op.goto(BASE + "/customers", { waitUntil: "load", timeout: 90000 });
  await snap(op, "owner-customers");
  await op.goto(`${BASE}/customers/${customerId}`, { waitUntil: "load", timeout: 90000 });
  await snap(op, "owner-customer-detail");
} finally {
  await browser.close();
}
console.log(`\nscreens in ${OUT}`);
