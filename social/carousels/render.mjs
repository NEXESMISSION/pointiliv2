/**
 * Renders the carousels to 1080×1350 PNGs.
 *
 *   node social/carousels/render.mjs            → every carousel
 *   node social/carousels/render.mjs c1 c2      → only those
 *
 * Copy lives in carousels.json. Photos in photos/, real app screens in screens/.
 * A photo that is not generated yet renders as a labelled placeholder, so the
 * text and layout can be checked before any picture exists.
 */
import { chromium } from "playwright-core";
import { readFile, mkdir, writeFile } from "node:fs/promises";
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

/**
 * How bright the photo is exactly where the words go — so the scrim behind them
 * is as strong as THAT picture needs, instead of as strong as the photo we had
 * in mind when we wrote the CSS.
 *
 * The slide is 1080×1350 and the photo is `object-fit: cover` with
 * `object-position: 50% photoY%`, so the visible band has to be mapped back
 * into the source pixels before it is measured.
 *
 * Returns the mean luminance (0 = black, 1 = white) of that band.
 */
async function bandLuma(file, { top, height, photoY = 50 }) {
  const img = sharp(file);
  const { width: iw, height: ih } = await img.metadata();
  const scale = Math.max(1080 / iw, 1350 / ih); // cover
  const vw = iw * scale;
  const vh = ih * scale;
  const offY = (vh - 1350) * (photoY / 100); // which part of the photo is on screen
  const offX = (vw - 1080) / 2;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const region = {
    left: Math.round(clamp(offX / scale, 0, iw - 1)),
    top: Math.round(clamp((offY + top) / scale, 0, ih - 1)),
    width: Math.round(clamp(1080 / scale, 1, iw)),
    height: Math.round(clamp(height / scale, 1, ih)),
  };
  region.width = Math.min(region.width, iw - region.left);
  region.height = Math.min(region.height, ih - region.top);
  const [r, g, b] = (await meanRGB(file, region)).map((v) => v / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The band each layout puts its words in, in slide pixels. */
const TEXT_BAND = { scene: { top: 90, height: 430 }, hook: { top: 880, height: 400 }, photo: { top: 900, height: 380 } };

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
await page.goto("file:///" + path.join(DIR, "template.html").replace(/\\/g, "/"));
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);

const missingPhotos = new Set();
const index = [];

for (const c of cfg.carousels) {
  if (only.length && !only.includes(c.id)) continue;
  const out = path.join(DIR, "out", c.id);
  await mkdir(out, { recursive: true });
  const files = [];
  for (const [i, slide] of c.slides.entries()) {
    const photoFile = slide.photo ? path.join(DIR, "photos", slide.photo) : null;
    if (slide.photo && !existsSync(photoFile)) missingPhotos.add(slide.photo);
    for (const h of slide.halves ?? []) {
      if (!h.photo) continue;
      const f = path.join(DIR, "photos", h.photo);
      if (!existsSync(f)) missingPhotos.add(h.photo);
      h.photoData = await dataUri(f);
    }
    for (const st of slide.steps ?? []) st.screenData = st.screen ? await dataUri(path.join(DIR, "screens", st.screen)) : null;
    const payload = {
      ...slide,
      n: i + 1,
      total: c.slides.length,
      photoData: await dataUri(photoFile),
      // 0 = the photo is dark there, 1 = blinding; the template turns it into a scrim
      luma: photoFile && existsSync(photoFile) && TEXT_BAND[slide.type] ? await bandLuma(photoFile, { ...TEXT_BAND[slide.type], photoY: slide.photoY }) : null,
      screenData: slide.screen ? await dataUri(path.join(DIR, "screens", slide.screen)) : null,
    };
    await page.evaluate(async (s) => {
      await window.renderSlide(s);
      await document.fonts.ready;
    }, payload);
    await page.waitForTimeout(250);
    const name = `slide-${String(i + 1).padStart(2, "0")}.png`;
    await page.screenshot({ path: path.join(out, name) });
    files.push(`${c.id}/${name}`);
  }
  index.push({ id: c.id, title: c.title, question: c.question, files });
  console.log(`  ✓ ${c.id} — ${c.slides.length} slides`);
}

await browser.close();
await writeFile(path.join(DIR, "out", "index.json"), JSON.stringify(index, null, 2));
if (missingPhotos.size) console.log(`\nphotos still to generate: ${[...missingPhotos].sort().join(", ")}`);
