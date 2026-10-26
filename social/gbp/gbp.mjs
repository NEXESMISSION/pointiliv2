// Renders gbp.html's pictures + crops of the founder's footage into ~/Desktop/Pointili Google profile (JPG, as Google wants).
import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";
const DIR = import.meta.dirname;
const OUT = path.join(os.homedir(), "Desktop", "Pointili Google profile");
await mkdir(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const url = (k) => "file:///" + path.join(DIR, "gbp.html").split(path.sep).join("/") + "?k=" + k;
const p = await b.newPage();
await p.goto(url("logo"));
const keys = await p.evaluate(() => window.KEYS);
for (const k of keys) {
  await p.goto(url(k));
  await p.evaluate(() => window.ready);
  const { w, h } = await p.evaluate(() => window.SIZE);
  await p.setViewportSize({ width: w, height: h });
  await p.waitForTimeout(300);
  const png = await p.screenshot({ clip: { x: 0, y: 0, width: w, height: h } });
  await sharp(png).jpeg({ quality: 90 }).toFile(path.join(OUT, `${k}.jpg`));
  console.log("  ✓", k);
}
await b.close();
const PHOTOS = path.join(DIR, "..", "carousels", "photos");
for (const [src, name, top] of [["SC-60-3.png", "photo-cafe-scan", 0.42], ["SC-61-3.png", "photo-snack-scan", 0.3], ["SC-62-1.png", "photo-qr-counter", 0.38], ["SC-61-4.png", "photo-card-on-phone", 0.35], ["SC-60-1.png", "photo-cafe-client", 0.2]]) {
  const img = sharp(path.join(PHOTOS, src)); const m = await img.metadata();
  const size = Math.min(m.width, m.height);
  await img.extract({ left: Math.round((m.width - size) / 2), top: Math.round((m.height - size) * top), width: size, height: size }).resize(1080, 1080).jpeg({ quality: 90 }).toFile(path.join(OUT, `${name}.jpg`));
  console.log("  ✓", name);
}
console.log(OUT);
