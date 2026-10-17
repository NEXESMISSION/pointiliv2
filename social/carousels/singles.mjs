/**
 * Renders singles.html — one-idea posts, said big — to 1080×1350 PNGs in out/singles/.
 *   node social/carousels/singles.mjs          → every design
 *   node social/carousels/singles.mjs 1 4      → only those
 */
import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const DIR = import.meta.dirname;
const OUT = path.join(DIR, "out", "singles");
const N = 6;
const pick = process.argv.slice(2).map(Number);
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  for (let d = 1; d <= N; d++) {
    if (pick.length && !pick.includes(d)) continue;
    await page.goto("file:///" + path.join(DIR, "singles.html").replace(/\\/g, "/") + `?d=${d}`, { waitUntil: "load" });
    await page.evaluate(() => window.ready);
    await page.screenshot({ path: path.join(OUT, `single-${d}.png`) });
    console.log(`  ✓ single-${d}.png`);
  }
} finally {
  await browser.close();
}
