/**
 * Real screens of the live site, as a phone shows them (390×844 at 3×, the size of the other
 * screens in assets/screens): `node capture.mjs join=/join home=/`. Public pages only — no
 * account is made. A capture is not a visitor: the traffic calls are answered here.
 */
import { chromium } from "playwright-core";
import { join } from "node:path";

const SITE = process.env.SITE || "https://www.pointili.online";
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
const jobs = process.argv.slice(2).map((a) => a.split("="));
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: IPHONE, locale: "ar-TN" });
await ctx.route(/\/api\/(beacon|here)/, (r) => r.fulfill({ status: 204, body: "" }));
const page = await ctx.newPage();
for (const [name, path] of jobs) {
  await page.goto(SITE + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const out = join(import.meta.dirname, "assets", "screens", `${name}.png`);
  await page.screenshot({ path: out });
  console.log("✓", out);
}
await browser.close();
