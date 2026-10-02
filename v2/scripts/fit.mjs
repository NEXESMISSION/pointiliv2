/**
 * The screens a newcomer meets fit one phone screen — no scrolling — from a
 * small Android (360×640) to a big iPhone (430×932). Prints ✓ or the
 * overflow in px, and saves each screen to shots/fit.
 *
 *   node scripts/fit.mjs        (from v2/, with the dev server on :3200)
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const BASE = process.env.BASE || "http://localhost:3200";
const OUT = process.env.OUT || "shots/fit";
mkdirSync(OUT, { recursive: true });
const sizes = [
  [360, 640],
  [375, 667],
  [390, 844],
  [430, 932],
  [465, 830],
];
const paths = ["/", "/join", "/login", "/shop/new", "/forgot"];

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
let bad = 0;
try {
  for (const [width, height] of sizes) {
    const page = await (await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ar-TN" })).newPage();
    for (const path of paths) {
      await page.goto(BASE + path, { waitUntil: "load" });
      await page.waitForTimeout(700);
      const m = await page.evaluate(() => ({ h: document.documentElement.scrollHeight - innerHeight, w: document.documentElement.scrollWidth - innerWidth }));
      const name = `${path === "/" ? "home" : path.slice(1).replace(/\//g, "-")}-${width}x${height}`;
      await page.screenshot({ path: `${OUT}/${name}.png` });
      const ok = m.h <= 0 && m.w <= 0;
      if (!ok) bad++;
      console.log(`  ${ok ? "✓" : "✗"} ${name}${ok ? "" : ` — ${m.h > 0 ? `${m.h}px too tall` : ""}${m.w > 0 ? ` ${m.w}px too wide` : ""}`}`);
    }
  }
} finally {
  await browser.close();
}
console.log(bad ? `\n${bad} screens scroll` : "\nevery screen fits");
if (bad) process.exit(1);
