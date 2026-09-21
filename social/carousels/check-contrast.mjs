/**
 * Measures the real contrast of every word on every slide.
 *
 *   node social/carousels/check-contrast.mjs            → every carousel
 *   node social/carousels/check-contrast.mjs c51 c53    → only those
 *
 * For each text block it hides the text, photographs what is BEHIND it, and
 * computes the WCAG ratio against the colour the text is actually painted in.
 * Anything under 4.5:1 (3:1 for text above 36px) is reported — that is the
 * line where a headline stops being readable on a phone in daylight.
 */
import { chromium } from "playwright-core";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const DIR = import.meta.dirname;
const only = process.argv.slice(2);
const cfg = JSON.parse(await readFile(path.join(DIR, "carousels.json"), "utf8"));

const dataUri = async (file) => {
  if (!file || !existsSync(file)) return null;
  const ext = path.extname(file).slice(1).toLowerCase().replace("jpg", "jpeg");
  return `data:image/${ext};base64,${(await readFile(file)).toString("base64")}`;
};

/** Mean colour of a region — computed from raw pixels, because sharp's
 * stats() ignores an extract() in the pipeline and reports the whole image. */
async function meanRGB(input, region) {
  const { data, info } = await sharp(input).extract(region).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  const n = data.length / info.channels;
  return [r / n, g / n, b / n];
}

/** sRGB → relative luminance, the WCAG way. */
const lum = (r, g, b) => {
  const f = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r / 255) + 0.7152 * f(g / 255) + 0.0722 * f(b / 255);
};
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
await page.goto("file:///" + path.join(DIR, "template.html").replace(/\\/g, "/"));
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1200);

const bad = [];
let checked = 0;

for (const c of cfg.carousels) {
  if (only.length && !only.includes(c.id)) continue;
  for (const [i, slide] of c.slides.entries()) {
    const photoFile = slide.photo ? path.join(DIR, "photos", slide.photo) : null;
    for (const st of slide.steps ?? []) st.screenData = st.screen ? await dataUri(path.join(DIR, "screens", st.screen)) : null;
    await page.evaluate(async (s) => {
      await window.renderSlide(s);
      await document.fonts.ready;
    }, { ...slide, n: i + 1, total: c.slides.length, photoData: await dataUri(photoFile), screenData: slide.screen ? await dataUri(path.join(DIR, "screens", slide.screen)) : null, luma: slide.luma });
    await page.waitForTimeout(150);

    // every run of words that sits on its own: headline, sub, caption, pill
    const blocks = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll("#root h1, #root .sub, #root .scene-pill span, #root .fcap, #root .pcap, #root .lead")) {
        const r = el.getBoundingClientRect();
        if (r.width < 8 || r.height < 8) continue;
        const cs = getComputedStyle(el);
        out.push({ sel: el.className || el.tagName.toLowerCase(), color: cs.color, size: parseFloat(cs.fontSize), rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }, text: el.textContent.trim().slice(0, 32) });
        // a mark inside a headline is a different colour: check it on its own
        for (const m of el.querySelectorAll("mark")) {
          const mr = m.getBoundingClientRect();
          if (mr.width < 8) continue;
          out.push({ sel: "mark", color: getComputedStyle(m).color, size: parseFloat(cs.fontSize), rect: { x: Math.round(mr.x), y: Math.round(mr.y), w: Math.round(mr.width), h: Math.round(mr.height) }, text: m.textContent.trim().slice(0, 32) });
        }
      }
      return out;
    });

    // photograph the slide with the words hidden: that is what is behind them
    // the ink goes transparent; every background pixel, pill included, stays put
    await page.evaluate(() => {
      const s = document.createElement("style");
      s.id = "pd-hide-ink";
      s.textContent = "#root h1, #root .sub, #root .scene-pill span, #root .fcap, #root .pcap, #root .lead, #root mark { color: transparent !important; text-shadow: none !important }";
      document.head.append(s);
    });
    const shot = await page.screenshot();
    if (process.env.DEBUG_SHOT === `${c.id}-${i + 1}`) await sharp(shot).toFile(".e2e/contrast-debug.png");
    // it MUST go before the next slide, or the next slide's colours read transparent
    await page.evaluate(() => document.getElementById("pd-hide-ink")?.remove());

    for (const b of blocks) {
      const { x, y, w, h } = b.rect;
      if (x < 0 || y < 0 || x + w > 1080 || y + h > 1350) continue;
      // the inner half of the box: the corners of a rounded pill are not background
      const inset = Math.min(10, Math.floor(h / 4));
      const [r, g, bl] = await meanRGB(shot, { left: x + inset, top: y + inset, width: Math.max(1, w - 2 * inset), height: Math.max(1, h - 2 * inset) });
      const back = lum(r, g, bl);
      const m = b.color.match(/\d+/g).map(Number);
      const fore = lum(m[0], m[1], m[2]);
      const cr = ratio(fore, back);
      const floor = b.size >= 36 ? 3 : 4.5; // WCAG large-text rule
      checked++;
      if (cr < floor) bad.push({ id: c.id, slide: i + 1, sel: b.sel, size: Math.round(b.size), ratio: cr.toFixed(2), floor, text: b.text, rect: `${x},${y} ${w}x${h}`, color: b.color, back: `rgb(${Math.round(r)},${Math.round(g)},${Math.round(bl)})` });
    }
  }
}

await browser.close();
console.log(`${checked} text blocks measured`);
if (!bad.length) console.log("every one of them is readable");
for (const b of bad) console.log(`  ✗ ${b.id} slide ${b.slide} · ${b.sel} ${b.size}px · ${b.ratio}:1 (needs ${b.floor}) · text ${b.color} on ${b.back} @ ${b.rect} · ${b.text}`);
