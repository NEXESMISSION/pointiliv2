/**
 * Sets up the "Kasper" coffee shop on the live site: an owner account, the
 * business, a 10-tampon card, and a dark-espresso look with its own logo.
 * Safe to run again — it updates what exists instead of duplicating it.
 *
 *   node --env-file=.env.local scripts/kasper.mjs [cover.png]
 *
 * The logo (and the cover, when given) go through the real card designer, so
 * they are cropped, compressed and stored exactly like an owner's upload.
 */
import { mkdirSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const BASE = process.env.KASPER_BASE || "https://pointidi.vercel.app";
const DIGITS = process.env.KASPER_PHONE || "20000020";
const COVER = process.argv[2] || null;
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// espresso, mocha, latte foam
const INK = "#1B1411";
const MOCHA = "#3A2618";
const FOAM = "#F2D6A2";

// ── the owner ──────────────────────────────────────────────────────────────
const phone = `+216${DIGITS}`;
const email = `216${DIGITS}@phone.pointidi.app`;
const password = process.env.KASPER_PASSWORD || randomBytes(9).toString("base64url");
const { data: found } = await admin.rpc("auth_lookup", { p_identifier: phone });
if (found?.user_id) {
  await admin.auth.admin.updateUserById(found.user_id, { password });
  console.log("  owner exists — password reset");
} else {
  const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { phone } });
  if (error) throw new Error(`create owner: ${error.message}`);
  console.log("  owner created");
}

const owner = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const signedIn = await owner.auth.signInWithPassword({ email, password });
if (signedIn.error) throw new Error(`sign in: ${signedIn.error.message}`);
const call = async (fn, args = {}) => {
  const { data, error } = await owner.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  if (data && data.ok === false) throw new Error(`${fn}: ${data.error}`);
  return data;
};
await call("update_my_profile", { p_full_name: "Kasper" });

// ── the shop and its card ──────────────────────────────────────────────────
const ctx = await call("session_context");
if (!ctx.business) {
  await call("create_business", { p_name: "Kasper", p_category: "cafe", p_owner_name: "Kasper", p_phone: null, p_email: null });
  console.log("  business created");
}
await call("save_loyalty_card", {
  p_name: "Kasper",
  p_description: "Coffee shop",
  p_stamps_required: 10,
  p_reward_name: "قهوة بلاش",
  p_reward_description: "قهوة بلاش كي تكمّل 10 تامبونات.",
  p_color: "amber",
  p_icon: "coffee",
  p_cooldown_minutes: 0,
});
await call("save_card_design", {
  p_description: "Coffee shop",
  p_design: { template: "bold", bg: INK, bg2: MOCHA, accent: FOAM, text: "light", pattern: "waves", stamp: "icon", icon: "coffee", use_cover: false },
});
console.log("  card: 10 tampons → قهوة بلاش, espresso + latte-foam");

// ── the logo: a K with steam rising off it ─────────────────────────────────
mkdirSync(".e2e/kasper", { recursive: true });
const logoPath = ".e2e/kasper/logo.png";
await sharp(
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 512 512">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${MOCHA}"/><stop offset="1" stop-color="${INK}"/></linearGradient></defs>
    <rect width="512" height="512" fill="url(#g)"/>
    <path d="M214 84c-22 24 20 40 0 66M262 70c-22 24 20 40 0 66M310 84c-22 24 20 40 0 66" stroke="${FOAM}" stroke-width="13" fill="none" stroke-linecap="round" opacity="0.9"/>
    <text x="256" y="410" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="300" text-anchor="middle" fill="#F7EBD8">K</text>
    <rect x="156" y="438" width="200" height="10" rx="5" fill="${FOAM}" opacity="0.85"/>
  </svg>`),
).png().toFile(logoPath);

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
try {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await c.addCookies([{ name: "pl_lang2", value: "fr", url: BASE }]);
  const p = await c.newPage();
  await p.goto(BASE + "/login", { waitUntil: "load" });
  await p.locator('input[type="tel"]').fill(DIGITS);
  await p.locator('input[name="password"]').fill(password);
  await Promise.all([p.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 60000 }), p.locator('form button[type="submit"]').click()]);
  await p.goto(BASE + "/loyalty/design", { waitUntil: "load" });
  if (COVER) {
    await p.locator('input[type="file"]').nth(0).setInputFiles(COVER);
    await p.getByText("Photo de couverture mise à jour").waitFor({ timeout: 90000 });
    await p.waitForTimeout(2000);
    console.log("  cover uploaded");
  }
  await p.locator('input[type="file"]').nth(1).setInputFiles(logoPath);
  await p.getByText("Logo mis à jour").waitFor({ timeout: 90000 });
  await p.waitForTimeout(2500);
  console.log("  logo uploaded");
  await p.goto(BASE + "/loyalty", { waitUntil: "load" });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: ".e2e/kasper/owner-card.png" });
  await p.goto(BASE + "/qr", { waitUntil: "domcontentloaded" });
  await p.waitForSelector("[data-qr] svg", { timeout: 30000 });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: ".e2e/kasper/owner-qr.png" });
} finally {
  await browser.close();
}

console.log(`\n  Kasper is live on ${BASE}`);
console.log(`  login: ${DIGITS}  ·  password: ${password}`);
