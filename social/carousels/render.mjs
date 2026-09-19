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

const DIR = import.meta.dirname;
const only = process.argv.slice(2);
const cfg = JSON.parse(await readFile(path.join(DIR, "carousels.json"), "utf8"));

const dataUri = async (file) => {
  if (!file || !existsSync(file)) return null;
  const ext = path.extname(file).slice(1).toLowerCase().replace("jpg", "jpeg");
  return `data:image/${ext};base64,${(await readFile(file)).toString("base64")}`;
};

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
