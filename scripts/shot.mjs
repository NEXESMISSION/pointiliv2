/**
 * One phone-sized screenshot of a single screen, for iterating on a design
 * without running the whole visual suite. It says whether the screen fits.
 *
 *   node scripts/shot.mjs pricing                → a public page
 *   node scripts/shot.mjs merchant loyalty       → signed in as the demo shop
 *   node scripts/shot.mjs customer customer      → signed in as a test customer
 *   node scripts/shot.mjs admin admin/businesses → signed in as a test admin
 *   node scripts/shot.mjs scan                   → the signed-out scan screen
 *
 * Sessions are cached in .e2e/auth-*.json, so repeated runs do not sign in
 * again (and do not trip the login rate limit). Delete them to start over.
 *
 * SHOTS_BASE picks the server (default http://localhost:3100), PL_LANG the
 * language (default tn), OUT the file (default .e2e/design/<name>.png).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.SHOTS_BASE || "http://localhost:3100";
const LANG = process.env.PL_LANG || "tn";
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const [a, b] = process.argv.slice(2);
const mode = ["scan", "merchant", "customer", "admin"].includes(a) ? a : "public";
// a leading slash is eaten by Git Bash, so "loyalty" and "/loyalty" both work
const raw = (mode === "public" ? a : b) || "/";
const path = raw.startsWith("/") ? raw : `/${raw}`;
mkdirSync(".e2e/design", { recursive: true });
const out = process.env.OUT || join(".e2e/design", `${(mode === "public" ? path : `${mode}${path}`).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home"}.png`);

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
try {
  const context = await browser.newContext({ ...phone, locale: LANG === "fr" ? "fr-FR" : "ar-TN", storageState: await session() });
  await context.addCookies([{ name: "pl_lang2", value: LANG, url: BASE }]);
  const page = await context.newPage();

  if (mode === "scan") {
    // a fresh code, opened by a browser that is not signed in
    await page.goto(BASE + "/dashboard", { waitUntil: "load" });
    const minted = await page.evaluate(async () => (await fetch("/api/qr/mint", { method: "POST" })).json());
    const guest = await browser.newContext({ ...phone, locale: "ar-TN" });
    await guest.addCookies([{ name: "pl_lang2", value: LANG, url: BASE }]);
    const gp = await guest.newPage();
    await gp.goto(BASE + new URL(minted.url).pathname, { waitUntil: "load" });
    await gp.waitForSelector("a[href*='/customer/register']", { timeout: 30000 });
    await shoot(gp);
  } else {
    await page.goto(BASE + path, { waitUntil: "load" });
    await shoot(page);
  }
} finally {
  await browser.close();
}

/** A cached signed-in session per role, created once and reused. */
async function session() {
  if (mode === "public") return undefined;
  const role = mode === "scan" ? "merchant" : mode;
  // one cache per server: a session from production is useless on localhost
  const file = `.e2e/auth-${role}-${new URL(BASE).host.replace(/[^a-z0-9]+/gi, "-")}.json`;
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));

  const ctx = await browser.newContext(phone);
  const p = await ctx.newPage();
  let digits = "20000001";
  let password = process.env.DEMO_MERCHANT_PASSWORD;
  let portal = "/login";

  if (role !== "merchant") {
    // a throwaway account of the right kind, kept for later runs
    digits = `${role === "admin" ? 9 : 5}${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
    password = randomBytes(9).toString("base64url");
    const { data, error } = await admin.auth.admin.createUser({ email: `216${digits}@phone.pointidi.app`, password, email_confirm: true, app_metadata: { phone: `+216${digits}` } });
    if (error) throw new Error(`create ${role}: ${error.message}`);
    if (role === "admin") await admin.from("profiles").update({ role: "admin" }).eq("id", data.user.id);
    portal = role === "admin" ? "/login" : "/customer/login";
  }

  await p.goto(BASE + portal, { waitUntil: "load" });
  await p.locator('input[type="tel"]').fill(digits);
  await p.locator('input[name="password"]').fill(password);
  await Promise.all([p.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 60000 }), p.locator('form button[type="submit"]').click()]);
  const state = await ctx.storageState();
  writeFileSync(file, JSON.stringify(state));
  await ctx.close();
  return state;
}

async function shoot(p) {
  await p.waitForTimeout(600);
  const { scrollH, viewH, scrollW, viewW, inner } = await p.evaluate(() => {
    const main = document.querySelector(".app-main");
    return {
      scrollH: document.documentElement.scrollHeight,
      viewH: window.innerHeight,
      scrollW: document.documentElement.scrollWidth,
      viewW: window.innerWidth,
      inner: main ? main.scrollHeight - main.clientHeight : 0,
    };
  });
  await p.screenshot({ path: out });
  const down = scrollH - viewH;
  const side = scrollW - viewW;
  const fits = down <= 1 && side <= 1 && inner <= 1;
  console.log(`  ${fits ? "✓ fits" : "✗"} ${out}${down > 1 ? ` — page scrolls ${down}px` : ""}${inner > 1 ? ` — content area scrolls ${inner}px` : ""}${side > 1 ? ` — scrolls ${side}px sideways` : ""}`);
}
