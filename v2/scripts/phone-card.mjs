/**
 * A tampon to a number with no account yet (since 17 Oct 2026), through the
 * real screens: the owner types a new number under «عطي تامبون → بالنومرو»,
 * the counter says it is a new number and gives the tampon; signing in with
 * that number says how to take it; signing up with it takes the account,
 * and the wallet holds the shop's card with its tampon. Throwaway accounts,
 * on the robots list first, removed at the end.
 *
 *   node scripts/phone-card.mjs          (from v2/, dev server on :3200)
 */
import { config } from "dotenv";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const BASE = process.env.BASE || "http://localhost:3200";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const rnd = () => `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
const owner = await robot(admin, rnd());
const fresh = await robot(admin, rnd());
let passed = 0;
const failed = [];
const check = (name, ok, detail) => {
  if (ok) passed++, console.log(`  ✓ ${name}`);
  else failed.push(name), console.log(`  ✗ ${name}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ""}`);
};
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const ctx = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
let shopId = null;
try {
  console.log("\nA tampon by a new number, then the number signs up");
  // the owner, a shop with a card (made by hand: the onboarding has its own checks)
  const { data: ou } = await admin.auth.admin.createUser({ email: `216${owner}@phone.pointidi.app`, password: "probe1234", email_confirm: true, app_metadata: { phone: `+216${owner}` } });
  await admin.from("people").upsert({ id: ou.user.id, name: "Owner", phone: `+216${owner}`, seen: ["coach", "logo_tip", "card_hello", "offer", "push", "install", "fix_tip", "first_scan", "first_gift", "mission"] });
  const { data: sh } = await admin.from("shops").insert({ owner_id: ou.user.id, name: "Phone Card Test", kind: "cafe", goal: 6, gift: "قهوة بلاش", color: "#B45309", paid_until: new Date(Date.now() + 30 * 864e5).toISOString() }).select("id").single();
  shopId = sh.id;

  const o = await (await browser.newContext(ctx)).newPage();
  await o.goto(BASE + "/login", { waitUntil: "load" });
  await o.locator('input[name="phone"]').fill(owner);
  await o.locator('input[name="password"]').fill("probe1234");
  await Promise.all([o.waitForURL((u) => u.pathname === "/shop", { timeout: 60000 }), o.locator('button[type="submit"]').click()]);
  // the home's second way: by the number
  await Promise.all([o.waitForURL((u) => u.pathname === "/shop/collect", { timeout: 30000 }), o.getByRole("link", { name: /بالنومرو/ }).click()]);
  await o.getByRole("textbox", { name: "اكتب نومرو الحريف" }).fill(fresh);
  await o.getByText("نومرو جديد").waitFor({ timeout: 20000 });
  check("a number with no account is a new number, not an error", true);
  await o.getByRole("button", { name: "زيد التامبون للنومرو هذا" }).click();
  await o.getByText(/\+1/).first().waitFor({ timeout: 30000 });
  const { data: made } = await admin.from("people").select("id, made_by_shop, password_set, name").eq("phone", `+216${fresh}`).single();
  check("the number's account is the shop's, with no password", made?.made_by_shop === shopId && made?.password_set === false, made);
  const { data: card } = await admin.from("cards").select("stamps").eq("shop_id", shopId).eq("user_id", made.id).single();
  check("…and its card holds the tampon", card?.stamps === 1, card);

  // the number signs in before signing up: told how to take it
  const c = await (await browser.newContext(ctx)).newPage();
  await c.goto(BASE + "/login", { waitUntil: "load" });
  await c.locator('input[name="phone"]').fill(fresh);
  await c.locator('input[name="password"]').fill("whatever123");
  await c.locator('button[type="submit"]').click();
  check("signing in first says the number has a card, and to sign up", await c.getByText("النومرو هذا عندو كارط").waitFor({ timeout: 20000 }).then(() => true).catch(() => false));

  // it signs up: the account is theirs, the card with it
  await c.goto(BASE + "/join", { waitUntil: "load" });
  await c.locator('input[name="name"]').fill("سامي");
  await c.locator('input[name="phone"]').fill(fresh);
  await c.locator('input[name="password"]').fill("sami12345");
  await Promise.all([c.waitForURL((u) => u.pathname === "/", { timeout: 60000 }), c.locator('button[type="submit"]').click()]);
  const { data: after } = await admin.from("people").select("id, name, password_set").eq("phone", `+216${fresh}`).single();
  check("signing up takes the account: the same one, their name, a password", after?.id === made.id && after?.name === "سامي" && after?.password_set === true, after);
  check("the wallet holds the shop's card", await c.getByText("Phone Card Test").first().waitFor({ timeout: 20000 }).then(() => true).catch(() => false));
} catch (e) {
  failed.push(String(e?.message ?? e).split("\n")[0]);
  console.log("  ✗", String(e?.message ?? e).split("\n").slice(0, 3).join(" | "));
} finally {
  await browser.close();
  if (shopId) await admin.from("shops").delete().eq("id", shopId);
  for (const ph of [owner, fresh]) {
    const { data } = await admin.from("people").select("id").eq("phone", `+216${ph}`).maybeSingle();
    if (data) await admin.auth.admin.deleteUser(data.id);
  }
  await unrobot(admin, [owner, fresh]);
  console.log(`\n${passed} passed, ${failed.length} failed`);
  if (failed.length) process.exit(1);
}
