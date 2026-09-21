/**
 * Real-UI test of the reward QR: customer earns 10 stamps → taps "Use reward" →
 * the staff scans the reward QR on the Redeem page → confirms → both screens
 * show "Reward redeemed!". Headless Chrome has no camera, so the scanner is fed
 * a screenshot of the customer's QR through its "Scan from a photo" button —
 * the same decoder the camera uses.
 *
 *   node scripts/reward-flow.mjs [outDir]     (needs npm run dev + node scripts/demo.mjs once)
 *
 * The app is Tunisian by default; this run forces French (pl_lang2) so the
 * script can look for words instead of matching Arabic, which never survives
 * a copy-paste. Sign-in uses the field types, not the labels.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import "./sql.mjs";

const BASE = process.env.SHOTS_BASE || "http://localhost:3100";
const OUT = process.argv[2] || ".e2e/reward";
mkdirSync(OUT, { recursive: true });
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const failures = [];
const check = (name, ok, detail) => {
  console.log(`  ${ok ? "✓" : "✗"} ${name}${ok || detail === undefined ? "" : ` — ${JSON.stringify(detail)}`}`);
  if (!ok) failures.push(name);
};

async function login(page, path, digits, password) {
  await page.goto(BASE + path, { waitUntil: "load" });
  await page.locator('input[type="tel"]').fill(digits);
  await page.locator('input[name="password"]').fill(password);
  await Promise.all([page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 60000 }), page.locator('form button[type="submit"]').click()]);
}

/** A French-speaking phone, so the words below are the ones on screen. */
async function frenchPhone() {
  const ctx = await browser.newContext(phone);
  await ctx.addCookies([{ name: "pl_lang2", value: "fr", url: BASE }]);
  return ctx.newPage();
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
let customerId;

try {
  // customer account (created directly; registration UI is covered by shots.mjs)
  const digits = `5${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
  const password = randomBytes(8).toString("base64url");
  const { data: created, error } = await admin.auth.admin.createUser({ email: `216${digits}@phone.pointidi.app`, password, email_confirm: true, app_metadata: { phone: `+216${digits}` } });
  if (error) throw error;
  customerId = created.user.id;

  const m = await frenchPhone();
  await login(m, "/login", "20000001", process.env.DEMO_MERCHANT_PASSWORD);
  const c = await frenchPhone();
  await login(c, "/customer/login", digits, password);

  console.log("customer collects 10 stamps (demo card has no cooldown)");
  for (let i = 1; i <= 10; i++) {
    const minted = await m.evaluate(async () => (await fetch("/api/qr/mint", { method: "POST" })).json());
    await c.goto(BASE + new URL(minted.url).pathname, { waitUntil: "domcontentloaded" });
    await c.getByText("Tampon obtenu !").waitFor({ timeout: 60000 });
  }
  check("10th stamp unlocks the reward", (await c.getByText("Récompense débloquée !").count()) > 0);

  console.log("customer taps Use reward");
  await c.getByRole("link", { name: "Utiliser la récompense" }).or(c.getByRole("button", { name: "Utiliser la récompense" })).first().click();
  await c.waitForURL(/\/customer\/rewards\/use\//, { timeout: 60000 });
  const qr = c.getByRole("img", { name: "QR code de la récompense" });
  await qr.waitFor();
  await c.screenshot({ path: join(OUT, "1-customer-reward-qr.png") });
  const qrPng = join(OUT, "_reward-qr.png");
  await qr.screenshot({ path: qrPng });
  check("customer screen shows the reward QR", true);

  console.log("staff scans it on the Redeem page");
  await m.goto(BASE + "/redeem", { waitUntil: "load" });
  await m.screenshot({ path: join(OUT, "2-redeem-page.png") });
  await m.getByRole("button", { name: "Scanner le QR de la récompense" }).first().click();
  await m.getByRole("dialog").waitFor();
  await m.screenshot({ path: join(OUT, "3-scanner.png") });
  await m.locator('[role="dialog"] input[type="file"]').setInputFiles(qrPng);
  // The scanner closes itself on a valid reward QR and the scanned reward is shown highlighted.
  await m.getByRole("dialog").waitFor({ state: "detached", timeout: 60000 });
  await m.getByText(/Donnez la récompense, puis confirmez/).waitFor({ timeout: 60000 });
  check("scanning the QR closes the scanner and shows that reward", (await m.getByRole("button", { name: "Confirmer et donner" }).count()) === 1);
  await m.screenshot({ path: join(OUT, "4-found.png") });

  await m.getByRole("button", { name: "Confirmer et donner" }).first().click();
  await m.getByText("Récompense donnée !").waitFor({ timeout: 60000 });
  await m.screenshot({ path: join(OUT, "5-staff-done.png") });
  check("staff sees Récompense donnée !", true);

  await c.getByText("Récompense utilisée !").waitFor({ timeout: 20000 });
  await c.screenshot({ path: join(OUT, "6-customer-done.png") });
  check("customer screen switches to Récompense utilisée ! by itself", true);

  console.log("the same QR cannot be used twice");
  await m.goto(BASE + "/redeem", { waitUntil: "load" });
  await m.getByRole("button", { name: "Scanner le QR de la récompense" }).first().click();
  await m.locator('[role="dialog"] input[type="file"]').setInputFiles(qrPng);
  // the refusal lands either in the scanner or on the page behind it
  await m.getByText(/Aucune récompense active|plus actif|expir/i).first().waitFor({ timeout: 60000 });
  await m.screenshot({ path: join(OUT, "7-reused.png") });
  check("re-scanning a used reward QR is refused", (await m.getByRole("button", { name: "Confirmer et donner" }).count()) === 0);
} catch (e) {
  failures.push(`crashed: ${e.message.split("\n")[0]}`);
  console.error(e);
} finally {
  await browser.close();
  if (customerId) await admin.auth.admin.deleteUser(customerId);
  console.log(`\n${failures.length ? `FAILED:\n${failures.map((f) => ` - ${f}`).join("\n")}` : "all good"}\nscreenshots in ${OUT}`);
  if (failures.length) process.exit(1);
}
