/**
 * The same twelve cards, landscape, with the app in a browser window instead of
 * a phone — for a website hero, a deck, a LinkedIn post, a laptop mockup.
 *
 *   node social/reel/desktop.mjs            → all 12 PNGs, 1920×1080
 *   node social/reel/desktop.mjs 01 04      → only those
 *
 * The screenshots come from screens-desktop/, captured at 1440×900 by
 * `node social/carousels/capture-screens.mjs --desktop`. Stills only: a landscape
 * card is read, not watched.
 */
import { chromium } from "playwright-core";
import { readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { CARDS } from "./motion.mjs";

const DIR = import.meta.dirname;
const SCREENS = path.join(DIR, "..", "carousels", "screens-desktop");
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const DEST = path.join(os.homedir(), "Desktop", "Pointili reel kit", "desktop");

/** Which page of the app each card is showing, for the window's address bar. */
const URLS = {
  "owner-qr.png": "pointili.online/qr",
  "stamp-success.png": "pointili.online/scan",
  "customer-home-after.png": "pointili.online/customer",
  "card-unlocked.png": "pointili.online/customer/cards",
  "reward-code.png": "pointili.online/customer/rewards",
  "customer-card-7.png": "pointili.online/customer/cards",
  "owner-loyalty.png": "pointili.online/loyalty",
  "owner-dashboard.png": "pointili.online/dashboard",
  "owner-customers.png": "pointili.online/customers",
  "owner-activity.png": "pointili.online/activity",
  "scan-needs-account.png": "pointili.online/scan",
};

const dataUri = async (f) => `data:image/png;base64,${(await readFile(f)).toString("base64")}`;

async function main() {
  const picks = process.argv.slice(2).filter((a) => /^\d+$/.test(a));
  const list = picks.length ? CARDS.filter((c) => picks.includes(c.file.slice(0, 2))) : CARDS;
  if (!list.length) throw new Error(`no card matches ${picks.join(", ")}`);
  await mkdir(DEST, { recursive: true });

  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto("file:///" + path.join(DIR, "desktop.html").replace(/\\/g, "/"));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1300);

  try {
    for (const c of list) {
      const payload = { ...c };
      if (c.screen) {
        const f = path.join(SCREENS, c.screen);
        if (!existsSync(f)) throw new Error(`missing desktop capture: ${f}\nrun capture-screens.mjs --desktop first`);
        payload.screenData = await dataUri(f);
        payload.url = URLS[c.screen];
      }
      await page.evaluate((p) => window.renderCard(p), payload);
      await page.waitForTimeout(220);
      await page.screenshot({ path: path.join(DEST, `${c.file}.png`) });
      console.log(`  ✓ ${c.file}.png`);
    }
  } finally {
    await browser.close();
  }
  console.log(`\n${DEST}`);
}

await main();
