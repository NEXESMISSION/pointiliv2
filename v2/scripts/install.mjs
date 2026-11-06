/**
 * Android's install buttons, for real on a phone: a tap is Chrome's own install dialog, never the
 * filmed guide — at once when Chrome has offered it, the moment it does when it comes within the
 * tap's five seconds, one more tap («جاهز») when it comes later, a short note when it never comes,
 * and no button at all once Pointili is on the phone. Chrome's offer is played by the page (a
 * `beforeinstallprompt` sent when the script says), and like Chrome's its dialog opens only on a
 * fresh tap. The owner's home (beside «؟»), «المحل», and the front door's footer. Throwaway
 * accounts, deleted at the end; pictures in .e2e/install/.
 *
 *   node scripts/install.mjs      (from v2/, dev server on :3200 — or BASE=)
 */
import { mkdirSync } from "node:fs";
import { config } from "dotenv";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const BASE = process.env.BASE || "http://localhost:3200";
const OUT = ".e2e/install";
mkdirSync(OUT, { recursive: true });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
for (const ip of ["local", "::1", "127.0.0.1"]) await admin.rpc("forget_tries", { p_key: `login-ip:${ip}` });
const PASS = "install-e2e-2026";
const NOTES = ["card_hello", "coach", "logo_tip", "offer", "push", "install", "fix_tip", "first_scan", "first_gift", "mission", "links_tip"];
const ago = (ms) => new Date(Date.now() - ms).toISOString();
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

const d = await robot(admin, `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`);
phones.push(d);
const { data: u, error: ue } = await admin.auth.admin.createUser({ email: `216${d}@phone.pointidi.app`, password: PASS, email_confirm: true, app_metadata: { phone: `+216${d}` } });
if (ue) throw ue;
made.push(u.user.id);
await admin.from("people").upsert({ id: u.user.id, name: "منيرة", phone: `+216${d}`, seen: NOTES });
await admin.from("shops").insert({ owner_id: u.user.id, name: "Salon Mounira", kind: "hair", goal: 6, gift: "بروشينغ بلاش", color: "#6C47FF", created_at: ago(30 * 86_400_000), paid_until: new Date(Date.now() + 300 * 86_400_000).toISOString() });
const { data: live } = await admin.from("news").select("id").eq("active", true);
if (live?.length) await admin.from("news_views").insert(live.map((n) => ({ news_id: n.id, person_id: u.user.id })));

const UA = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36";
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
// Chrome's offer, sent when the script says; like Chrome's, its dialog opens only while a tap is fresh
const offerScript = ({ installed }) => {
  window.__prompted = 0;
  window.__refused = 0;
  window.__offer = () => {
    const e = new Event("beforeinstallprompt", { cancelable: true });
    e.prompt = async () => {
      if (!navigator.userActivation?.isActive) {
        window.__refused++;
        throw new DOMException("The prompt() method must be called with a user gesture", "NotAllowedError");
      }
      window.__prompted++;
    };
    e.userChoice = Promise.resolve({ outcome: "dismissed" });
    dispatchEvent(e);
  };
  if (installed) navigator.getInstalledRelatedApps = async () => [{ platform: "webapp", url: `${location.origin}/manifest.webmanifest` }];
};
async function phone({ installed = false, signedIn = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ar-TN", userAgent: UA });
  await ctx.addInitScript(offerScript, { installed });
  const page = await ctx.newPage();
  if (signedIn) {
    for (let attempt = 1; ; attempt++) {
      await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 90000 });
      await page.waitForTimeout(800);
      await page.locator('input[name="phone"]').fill(d);
      await page.locator('input[name="password"]').fill(PASS);
      await page.locator('button[type="submit"]').click();
      if (await page.waitForURL((x) => !x.pathname.startsWith("/login"), { timeout: 30000 }).then(() => true, () => false)) break;
      if (attempt >= 2) throw new Error("could not sign in");
    }
  }
  return { ctx, page };
}
const shot = async (page, name) => {
  await page.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((e) => (e.style.display = "none")));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${name}.png` });
};
const counts = (page) => page.evaluate(() => ({ prompted: window.__prompted, refused: window.__refused, guide: document.querySelectorAll('[role="dialog"]').length }));
const offer = (page) => page.evaluate(() => window.__offer());
const ICON = 'button[aria-label="حطّ Pointili في تليفونك"], button[aria-label="لحظة… Chrome يحضّر"], button[aria-label="جاهز! انقر باش تحطّو"]';
const open = async (page, path) => {
  await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(1500);
};

try {
  const { page } = await phone();

  console.log("\nThe owner's home, the button beside «؟»");
  await open(page, "/shop");
  const icon = page.locator(ICON).first();
  check("the install button is there on Android before Chrome has offered", await icon.isVisible());
  await offer(page);
  await icon.click();
  await page.waitForTimeout(400);
  let c = await counts(page);
  check("Chrome ready: a tap opens Chrome's own dialog, no guide", c.prompted === 1 && c.guide === 0, c);

  await open(page, "/shop");
  await icon.click();
  await page.waitForTimeout(300);
  check("tapped before Chrome is ready: «لحظة…» on the button, no guide", (await page.locator('button[aria-label="لحظة… Chrome يحضّر"]').count()) === 1 && (await counts(page)).guide === 0);
  await shot(page, "1-home-waiting");
  await page.waitForTimeout(1700);
  await offer(page);
  await page.waitForTimeout(500);
  c = await counts(page);
  check("…Chrome ready two seconds later: its dialog opens by itself", c.prompted === 1 && c.refused === 0 && c.guide === 0, c);

  await open(page, "/shop");
  await icon.click();
  await page.waitForTimeout(6500);
  await offer(page);
  await page.waitForTimeout(500);
  c = await counts(page);
  check("Chrome ready only after the tap's five seconds: no dialog forced, the button says «جاهز»", c.prompted === 0 && (await page.locator('button[aria-label="جاهز! انقر باش تحطّو"]').count()) === 1, c);
  await shot(page, "2-home-ready");
  // it breathes (it asks for the tap): a finger taps it moving, the robot has to be told
  await page.locator('button[aria-label="جاهز! انقر باش تحطّو"]').click({ force: true });
  await page.waitForTimeout(400);
  c = await counts(page);
  check("…one more tap: Chrome's dialog", c.prompted === 1 && c.guide === 0, c);

  await open(page, "/shop");
  await icon.click();
  await page.waitForTimeout(15800);
  const note = page.getByText("Chrome مازال ما حضّرش التثبيت");
  check("Chrome never offers: a short note on its own menu, never the guide", (await note.isVisible()) && (await counts(page)).guide === 0);
  await shot(page, "3-home-none");
  await note.click();
  await page.waitForTimeout(300);
  check("…a tap puts the note away", (await note.count()) === 0);

  console.log("\n«المحل», its line");
  await open(page, "/shop/settings");
  const line = page.getByRole("button", { name: /حطّ Pointili في تليفونك/ });
  check("the line is there", await line.isVisible());
  await line.click();
  await page.waitForTimeout(800);
  check("…tapped: «لحظة…» on the line", await page.getByText("لحظة… Chrome يحضّر").isVisible());
  await offer(page);
  await page.waitForTimeout(500);
  c = await counts(page);
  check("…Chrome ready: its dialog, no guide", c.prompted === 1 && c.guide === 0, c);

  console.log("\nThe front door, its footer");
  const visitor = await phone({ signedIn: false });
  await open(visitor.page, "/");
  const word = visitor.page.getByRole("button", { name: /حطّ Pointili في تليفونك/ }).first();
  check("the footer's word is there", await word.isVisible());
  await word.click();
  await visitor.page.waitForTimeout(1000);
  await offer(visitor.page);
  await visitor.page.waitForTimeout(500);
  c = await counts(visitor.page);
  check("…tapped, then Chrome ready: its dialog, no guide", c.prompted === 1 && c.guide === 0, c);

  console.log("\nPointili already on the phone");
  const home = await phone({ installed: true });
  await open(home.page, "/shop");
  check("the home has no install button", (await home.page.locator(ICON).count()) === 0);
  await shot(home.page, "4-home-installed");
  await open(home.page, "/shop/settings");
  check("«المحل» has no install line", (await home.page.getByRole("button", { name: /حطّ Pointili في تليفونك/ }).count()) === 0);
} catch (e) {
  failed.push(`crashed: ${e.message}`);
  console.log(`  ✗ crashed: ${e.message}`);
  for (const [i, p] of browser.contexts().flatMap((x) => x.pages()).entries()) {
    console.log(`    page ${i}: ${p.url()}`);
    await p.screenshot({ path: `${OUT}/crash-${i}.png` }).catch(() => {});
  }
} finally {
  await browser.close();
  for (const id of made) {
    await admin.from("shops").delete().eq("owner_id", id);
    await admin.auth.admin.deleteUser(id);
  }
  await unrobot(admin, phones);
  console.log(`\n${passed} passed, ${failed.length} failed (removed ${made.length} accounts) · pictures in ${OUT}/`);
  if (failed.length) process.exit(1);
}
