/**
 * Copies the finished posts into one folder per post, plus one image with every slide.
 *
 *   node social/carousels/export.mjs                 → ~/Desktop/Pointili posts
 *   node social/carousels/export.mjs "D:/somewhere"  → that folder
 *
 * Render first (render.mjs). Folders are numbered in posting order.
 */
import { chromium } from "playwright-core";
import { readFile, writeFile, mkdir, copyFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const DIR = import.meta.dirname;
const OUT = path.join(DIR, "out");
const IDEAS = process.argv.includes("--ideas");
const ADS = process.argv.includes("--ads");
const NEW = process.argv.includes("--new");
const DEST = (process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : path.join(os.homedir(), "Desktop", "Pointili posts")) + (IDEAS ? path.sep + "_ideas" : ADS ? path.sep + "_ads" : NEW ? path.sep + "_new" : "");

// what it is → the doubts → what it brings → the price
const POSTS = [
  ["c2", "01 - How it works"],
  ["c3", "02 - No app needed"],
  ["c12", "03 - Which businesses"],
  ["c10", "04 - What you gain"],
  ["c14", "05 - What one customer is worth"],
  ["c11", "06 - Fast at rush hour"],
  ["c6", "07 - Price"],
  ["c30", "08 - What reward to give"],
  ["c31", "09 - Why they come back"],
];

// the alternative takes on post 04, for picking one
const IDEA_POSTS = [
  ["c20", "A - a day in your shop"],
  ["c21", "B - cardboard vs Pointili"],
  ["c22", "C - what you dont know"],
  ["c23", "D - the customer who never came back"],
  ["c24", "E - one sentence at the till"],
  ["c25", "F - the questions customers ask"],
  ["c26", "G - when it pays for itself"],
];
const AD_POSTS = [
  ["c40", "AD 1 - no app to download"],
  ["c41", "AD 2 - he bought today and then"],
  ["c42", "AD 3 - you see your shop"],
];
// the client's seven AI-made carousels, rebuilt with real screens and the real workflow
const NEW_POSTS = [
  ["c51", "10 - What happens on a scan"],
  ["c53", "11 - From behind the counter"],
  ["c50", "12 - Cardboard vs Pointili"],
  ["c52", "13 - Why customers come back"],
  ["c54", "14 - Every shop its reward"],
  ["c55", "15 - Imagine"],
  ["c56", "16 - He bought once and never came back"],
];
if (IDEAS) POSTS.splice(0, POSTS.length, ...IDEA_POSTS);
if (NEW) POSTS.splice(0, POSTS.length, ...NEW_POSTS);
if (ADS) POSTS.splice(0, POSTS.length, ...AD_POSTS);

const cfg = JSON.parse(await readFile(path.join(DIR, "carousels.json"), "utf8"));
const byId = Object.fromEntries(cfg.carousels.map((c) => [c.id, c]));

await mkdir(DEST, { recursive: true });
const posts = [];
for (const [id, folder] of POSTS) {
  const slides = (await readdir(path.join(OUT, id))).filter((f) => /^slide-\d+\.png$/.test(f)).sort();
  if (slides.length !== byId[id].slides.length) throw new Error(`${id}: ${slides.length} PNGs for ${byId[id].slides.length} slides — render it again`);
  const target = path.join(DEST, folder);
  await rm(target, { recursive: true, force: true });
  await mkdir(target);
  for (const f of slides) await copyFile(path.join(OUT, id, f), path.join(target, f));
  posts.push({ id, folder, title: byId[id].title, slides });
  console.log(`  ✓ ${folder} — ${slides.length} slides`);
}

// one image per post: its own slides, 5 per row, in swipe order
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const sheet = (p, i) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@500;700&family=Inter:wght@500;700&display=block" rel="stylesheet">
<style>
  body { margin: 0; background: #EDEDF2; font-family: Inter, "IBM Plex Sans Arabic", sans-serif; color: #17171C; }
  .wrap { padding: 40px 44px 28px; width: ${5 * 420 + 4 * 18 + 88}px; }
  .label { display: flex; align-items: center; gap: 18px; margin-bottom: 26px; }
  .num { background: #6535E0; color: #fff; font-weight: 700; font-size: 30px; border-radius: 14px; padding: 8px 18px; }
  .q { font-family: "IBM Plex Sans Arabic", Inter, sans-serif; font-weight: 700; font-size: 40px; }
  .count { color: #6B6B76; font-size: 26px; }
  .row { display: flex; flex-wrap: wrap; gap: 30px 18px; }
  figure { margin: 0; text-align: center; }
  img { display: block; width: 420px; height: 525px; border-radius: 14px; box-shadow: 0 2px 8px rgba(0,0,0,.14); }
  figcaption { margin-top: 8px; font-size: 22px; color: #6B6B76; }
</style></head><body><div class="wrap">
  <div class="label"><span class="num">${p.folder.match(/^\d+/)?.[0] ?? String(i + 1).padStart(2, "0")}</span><span class="q" dir="rtl">${esc(p.title)}</span><span class="count">${p.slides.length} slides</span></div>
  <div class="row">${p.slides.map((f, n) => `<figure><img src="${p.id}/${f}"><figcaption>${n + 1}</figcaption></figure>`).join("")}</div>
</div></body></html>`;

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 2300, height: 800 } });
  for (const [i, p] of posts.entries()) {
    const page_ = path.join(OUT, `sheet-${p.id}.html`);
    await writeFile(page_, sheet(p, i));
    await page.goto("file:///" + page_.replace(/\\/g, "/"), { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const name = `00 - ${p.folder.replace(/^\d+ - /, "")} - all slides.jpg`;
    await page.screenshot({ path: path.join(DEST, p.folder, name), fullPage: true, type: "jpeg", quality: 90 });
    console.log(`  ✓ ${p.folder}/${name}`);
  }
} finally {
  await browser.close();
}
console.log(`\n${DEST}`);
