/**
 * Visual QA: phone-sized screenshots of every screen + a sideways-overflow check.
 * Drives the real UI against the dev server (npm run dev) with system Chrome.
 *
 *   node scripts/shots.mjs [outDir]
 *
 * Uses the demo merchant (scripts/demo.mjs), creates one throwaway customer and
 * one throwaway admin, and deletes both at the end.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import "./sql.mjs";

const BASE = process.env.SHOTS_BASE || "http://localhost:3100";
const OUT = process.argv[2] || ".e2e/shots";
mkdirSync(OUT, { recursive: true });
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const cleanup = [];
const problems = [];

async function shot(page, name, path, { wait = 800, full = true, noBack = false } = {}) {
  if (path) await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(wait);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const errorScreen = await page.getByText("Something went wrong").count();
  // Every screen except the home screens offers a way back.
  const isHome = ["/", "/customer", "/dashboard", "/admin"].includes(new URL(page.url()).pathname);
  const missingBack = !noBack && !isHome && (await page.locator('button[aria-label="Go back"]').count()) === 0;
  if (overflow > 1) problems.push(`${name}: horizontal overflow ${overflow}px`);
  if (errorScreen) problems.push(`${name}: error screen`);
  if (missingBack) problems.push(`${name}: no back button`);
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: full });
  const bad = overflow > 1 || errorScreen || missingBack;
  console.log(`  ${bad ? "✗" : "✓"} ${name}${overflow > 1 ? ` (overflow ${overflow}px)` : ""}${missingBack ? " (no back button)" : ""}`);
}

async function loginUi(page, digits, password, portal = "/login") {
  await page.goto(BASE + portal, { waitUntil: "networkidle" });
  await page.getByLabel("Phone number").fill(digits);
  await page.locator('input[name="password"]').fill(password);
  await Promise.all([page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 60000 }), page.getByRole("button", { name: "Log in" }).click()]);
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

try {
  // ── public ───────────────────────────────────────────────────────────────
  console.log("public");
  const pub = await browser.newContext(phone);
  const p = await pub.newPage();
  await shot(p, "01-landing", "/", { noBack: true });
  for (const [n, path] of [["02-how", "/how-it-works"], ["03-pricing", "/pricing"], ["04-customer-login", "/customer/login"], ["05-customer-register", "/customer/register"], ["06-forgot", "/customer/forgot-password"], ["07-business-login", "/login"], ["08-business-register", "/register"]]) {
    await shot(p, n, path);
  }

  // A failed sign-up or login must keep what was typed.
  await p.goto(BASE + "/customer/register", { waitUntil: "networkidle" });
  await p.getByLabel("Phone number").fill("20000001");
  await p.locator('input[name="password"]').fill("keepme-12345");
  await p.locator('input[name="confirm"]').fill("keepme-12345");
  await p.getByRole("button", { name: "Create account" }).click();
  await p.getByText(/already exists/i).waitFor({ timeout: 60000 });
  const keptPw = await p.locator('input[name="password"]').inputValue();
  const keptConfirm = await p.locator('input[name="confirm"]').inputValue();
  const keptPhone = await p.getByLabel("Phone number").inputValue();
  if (keptPw !== "keepme-12345" || keptConfirm !== "keepme-12345" || !keptPhone.replace(/\D/g, "").includes("20000001")) problems.push("register: typed values were cleared after an error");
  else console.log("  ✓ sign-up error keeps phone and both passwords");
  await p.screenshot({ path: join(OUT, "09-register-error.png") });

  await p.goto(BASE + "/customer/login", { waitUntil: "networkidle" });
  await p.getByLabel("Phone number").fill("20000001");
  await p.locator('input[name="password"]').fill("definitely-wrong-1");
  await p.getByRole("button", { name: "Log in" }).click();
  await p.getByText(/wrong phone number or password/i).waitFor({ timeout: 60000 });
  if ((await p.locator('input[name="password"]').inputValue()) !== "definitely-wrong-1") problems.push("login: password was cleared after an error");
  else console.log("  ✓ wrong password keeps what was typed");

  // ── merchant ─────────────────────────────────────────────────────────────
  console.log("merchant");
  const m = await browser.newContext(phone);
  const mp = await m.newPage();
  await loginUi(mp, "20000001", process.env.DEMO_MERCHANT_PASSWORD);

  // Branding through the real UI: the browser crops + compresses, the server stores.
  const sharp = (await import("sharp")).default;
  const coverPath = join(OUT, "_cover.png");
  const logoPath = join(OUT, "_logo.png");
  await sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b2418"/><stop offset="1" stop-color="#a0643a"/></linearGradient></defs><rect width="1600" height="900" fill="url(#g)"/><circle cx="1150" cy="470" r="260" fill="#f4e4d4"/><circle cx="1150" cy="470" r="200" fill="#6b3f22"/><circle cx="380" cy="220" r="120" fill="#fff" opacity=".08"/><circle cx="260" cy="700" r="180" fill="#fff" opacity=".06"/></svg>`,
    ),
  ).png().toFile(coverPath);
  await sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" rx="96" fill="#1f2937"/><text x="256" y="335" font-size="230" text-anchor="middle" fill="#fbbf24" font-family="Arial" font-weight="700">CB</text></svg>`,
    ),
  ).png().toFile(logoPath);
  await mp.goto(BASE + "/loyalty/design", { waitUntil: "networkidle" });
  await mp.locator('input[type="file"]').nth(0).setInputFiles(coverPath);
  await mp.getByText("Cover photo updated").waitFor({ timeout: 60000 });
  await mp.waitForTimeout(2000);
  await mp.locator('input[type="file"]').nth(1).setInputFiles(logoPath);
  await mp.getByText("Logo updated").waitFor({ timeout: 60000 });
  await mp.waitForTimeout(2500);
  console.log("  ✓ cover + logo uploaded in the card designer");
  await mp.getByRole("button", { name: /^Photo/ }).click();
  await mp.getByRole("button", { name: "Save design" }).click();
  await mp.getByText("Card design saved").waitFor({ timeout: 60000 });
  await mp.waitForTimeout(1500);
  console.log("  ✓ card design saved (Photo style)");
  await shot(mp, "11b-design", null);

  for (const [n, path] of [["10-dashboard", "/dashboard"], ["11-loyalty", "/loyalty"], ["12-rewards", "/rewards"], ["13-reward-new", "/rewards/new"], ["14-customers", "/customers"], ["15-activity", "/activity?range=month"], ["16-analytics", "/analytics"], ["17-billing", "/billing"], ["18-settings", "/settings"], ["19-more", "/more"], ["20-redeem", "/redeem"]]) {
    await shot(mp, n, path);
  }
  await mp.goto(BASE + "/qr", { waitUntil: "domcontentloaded" });
  await mp.waitForSelector('[aria-label="Pointidi stamp QR code"] svg', { timeout: 30000 });
  await shot(mp, "21-qr", null, { wait: 500, full: false });

  // the scan URL the merchant screen is showing right now
  const minted = await mp.evaluate(async () => (await fetch("/api/qr/mint", { method: "POST" })).json());
  const scanUrl = new URL(minted.url);

  // ── customer: scan signed out → register → stamp ─────────────────────────
  console.log("customer");
  const c = await browser.newContext(phone);
  const cp = await c.newPage();
  await cp.goto(BASE + scanUrl.pathname, { waitUntil: "domcontentloaded" });
  await cp.getByText("Almost there!").waitFor({ timeout: 30000 });
  await shot(cp, "30-scan-needs-account", null, { full: false });
  await cp.getByRole("link", { name: "Create account" }).click();
  await cp.waitForURL(/customer\/register/);
  const digits = `5${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
  const pw = randomBytes(8).toString("base64url");
  await cp.getByLabel("Phone number").fill(digits);
  await cp.locator('input[name="password"]').fill(pw);
  await cp.locator('input[name="confirm"]').fill(pw);
  await cp.getByRole("button", { name: "Create account" }).click();
  await cp.getByText("Stamp collected!").waitFor({ timeout: 60000 });
  const { data: who } = await admin.rpc("auth_lookup", { p_identifier: `+216${digits}` });
  if (who) cleanup.push(who.user_id);
  await cp.waitForTimeout(1200);
  await shot(cp, "31-stamp-success", null, { full: false });

  // merchant screen should have flashed and rotated
  const rotated = await mp.evaluate(async (id) => (await fetch(`/api/qr/state?id=${id}&since=${new Date(Date.now() - 120000).toISOString()}`)).json(), minted.id);
  if (!rotated.consumed) problems.push("merchant token not consumed after customer scan");

  for (const [n, path] of [["32-home", "/customer"], ["33-cards", "/customer/cards"], ["35-rewards", "/customer/rewards"], ["36-profile", "/customer/profile"], ["37-password", "/customer/profile/password"]]) {
    await shot(cp, n, path);
  }
  await cp.goto(BASE + "/customer", { waitUntil: "networkidle" });
  await cp.locator('a[href^="/customer/cards/"]').first().click();
  await cp.waitForURL(/customer\/cards\/.+/);
  await shot(cp, "34-card-detail", null);
  await shot(cp, "38-scanner", "/customer/scan", { full: false });

  // ── admin (temporary account) ────────────────────────────────────────────
  console.log("admin");
  const adminDigits = `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
  const adminPw = randomBytes(8).toString("base64url");
  const { data: au } = await admin.auth.admin.createUser({ email: `216${adminDigits}@phone.pointidi.app`, password: adminPw, email_confirm: true, app_metadata: { phone: `+216${adminDigits}` } });
  cleanup.push(au.user.id);
  await admin.from("profiles").update({ role: "admin" }).eq("id", au.user.id);
  const a = await browser.newContext(phone);
  const ap = await a.newPage();
  await loginUi(ap, adminDigits, adminPw);
  for (const [n, path] of [["40-admin", "/admin"], ["41-admin-businesses", "/admin/businesses"], ["42-admin-subscriptions", "/admin/subscriptions"], ["43-admin-payments", "/admin/payments?status=all"], ["44-admin-customers", "/admin/customers"], ["45-admin-activity", "/admin/activity"], ["46-admin-system", "/admin/system"]]) {
    await shot(ap, n, path);
  }
  await ap.goto(BASE + "/admin/businesses", { waitUntil: "networkidle" });
  const first = ap.locator('a[href^="/admin/businesses/"]').first();
  if (await first.count()) {
    await first.click();
    await ap.waitForURL(/admin\/businesses\/.+/);
    await shot(ap, "47-admin-business", null);
  }

  // desktop sanity
  console.log("desktop");
  const d = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const dp = await d.newPage();
  await shot(dp, "50-desktop-landing", "/", { full: false });
  await loginUi(dp, "20000001", process.env.DEMO_MERCHANT_PASSWORD);
  await shot(dp, "51-desktop-dashboard", "/dashboard", { full: false });
} catch (e) {
  problems.push(`crashed: ${e.message.split("\n")[0]}`);
  console.error(e);
} finally {
  await browser.close();
  for (const id of cleanup) await admin.auth.admin.deleteUser(id);
  console.log(`\n${problems.length ? problems.map((x) => ` - ${x}`).join("\n") : "no problems"}\nscreenshots in ${OUT}`);
}
