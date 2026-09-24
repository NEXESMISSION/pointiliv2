/**
 * The Pointili profile picture (and a matching Facebook cover).
 *
 *   node social/carousels/logo.mjs   → social/carousels/brand/profile.png, cover.png
 *
 * Same mark and violet as the app and the carousels, so the page, the posts
 * and the product look like one thing.
 */
import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const DIR = import.meta.dirname;
const OUT = path.join(DIR, "brand");
await mkdir(OUT, { recursive: true });

const MARK = (w) => `
  <svg viewBox="0 0 96 70" width="${w}" aria-hidden="true">
    <defs><mask id="g"><rect width="96" height="70" fill="#fff"/><rect x="-2" y="14" width="86" height="58" rx="10" fill="#000"/></mask></defs>
    <rect x="16" y="5" width="72" height="50" rx="7" transform="rotate(8 52 30)" fill="#FFFFFF" fill-opacity="0.55" mask="url(#g)"/>
    <rect x="1" y="17" width="80" height="52" rx="8" fill="#FFFFFF"/>
    <path d="M41 29C42.2 38.6 44.4 41.2 56 43 44.4 44.8 42.2 47.4 41 57 39.8 47.4 37.6 44.8 26 43 37.6 41.2 39.8 38.6 41 29Z" fill="#6535E0"/>
  </svg>`;

const page_ = (body, w, h) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@600;800&family=IBM+Plex+Sans+Arabic:wght@600&display=block" rel="stylesheet">
<style>
  * { margin: 0; box-sizing: border-box; }
  body { width: ${w}px; height: ${h}px; overflow: hidden; font-family: Inter, sans-serif; }
  .bg { position: relative; width: 100%; height: 100%; display: grid; place-items: center;
        background: radial-gradient(120% 90% at 50% 0%, #7a4df2 0%, #6535E0 45%, #4A24B5 100%); color: #fff; }
  .rings { position: absolute; inset: 0; background: repeating-radial-gradient(circle at 50% 118%, rgba(255,255,255,0.07) 0 3px, transparent 3px 90px); }
  .stack { position: relative; display: flex; flex-direction: column; align-items: center; }
</style></head><body>${body}</body></html>`;

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
try {
  const shot = async (html, w, h, file) => {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await page.setContent(page_(html, w, h), { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, file) });
    await page.close();
    console.log(`  ✓ ${file}`);
  };

  // profile: the mark alone, centred, safe inside the circle crop
  await shot(`<div class="bg"><div class="rings"></div><div class="stack">${MARK(560)}</div></div>`, 1080, 1080, "profile.png");

  // cover: mark + name + one line, kept away from the edges Facebook crops
  await shot(
    `<div class="bg"><div class="rings"></div><div class="stack" style="gap:44px">
       <div style="display:flex;align-items:center;gap:40px">${MARK(200)}
         <span style="font-size:150px;font-weight:800;letter-spacing:-0.03em">Pointili</span></div>
       <p style="font-family:'IBM Plex Sans Arabic',Inter,sans-serif;font-size:56px;font-weight:600;opacity:.92" dir="rtl">
         كارط الفيدليتي متاع محلك، في تليفون الحريف</p>
       <p style="font-size:44px;font-weight:600;opacity:.72">Carte de fidélité digitale · Tunisie</p>
     </div></div>`,
    1640, 664, "cover.png",
  );
} finally {
  await browser.close();
}
console.log(`\n${OUT}`);
