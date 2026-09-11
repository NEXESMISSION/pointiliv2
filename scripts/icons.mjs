// Renders the Pointidi app icons from the brand mark (components/Logo.tsx → LogoMark).
// Run: node scripts/icons.mjs
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BRAND = "#4536F0";

// Path data copied from LogoMark (viewBox 0 0 48 48).
const PIN = "M24 3C14.6 3 7 10.4 7 19.6 7 31.6 21.2 43.3 22.6 44.5a2.2 2.2 0 0 0 2.8 0C26.8 43.3 41 31.6 41 19.6 41 10.4 33.4 3 24 3Z";
const P = "M20.3 15.2h4.6a4.4 4.4 0 0 1 0 8.8h-2.2v3.2h-2.4v-12Zm2.4 2.2v4.4h2.1a2.2 2.2 0 0 0 0-4.4h-2.1Z";

/** The mark, drawn in a 48-unit box. */
function mark({ pin, dot, letter }) {
  return `<path d="${PIN}" fill="${pin}"/><circle cx="24" cy="19.5" r="9.5" fill="${dot}"/><path d="${P}" fill="${letter}"/>`;
}

/**
 * @param size   output px
 * @param scale  mark size as a fraction of the canvas (the mark's 48-unit box)
 * @param bg     background fill
 * @param radius corner radius as a fraction of size (0 = full bleed square)
 */
function iconSvg({ size, scale, bg, radius, colors }) {
  const markPx = size * scale;
  const offset = (size - markPx) / 2;
  const k = markPx / 48;
  const r = size * radius;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="${bg}"/>
  <g transform="translate(${offset} ${offset}) scale(${k})">${mark(colors)}</g>
</svg>`;
}

const onWhite = { pin: BRAND, dot: "#FFFFFF", letter: BRAND };
// White pin, brand "P": the dot blends into the pin, the letter stays brand-coloured.
const onBrand = { pin: "#FFFFFF", dot: "#FFFFFF", letter: BRAND };

const outputs = [
  // "any" icons: brand mark on a white rounded square.
  { file: "public/icon-192.png", svg: iconSvg({ size: 192, scale: 0.72, bg: "#FFFFFF", radius: 0.22, colors: onWhite }) },
  { file: "public/icon-512.png", svg: iconSvg({ size: 512, scale: 0.72, bg: "#FFFFFF", radius: 0.22, colors: onWhite }) },
  // Maskable: full bleed; the pin (≈27 units from centre to its farthest point) stays inside the 80% safe circle.
  { file: "public/icon-maskable-512.png", svg: iconSvg({ size: 512, scale: 0.6, bg: BRAND, radius: 0, colors: onBrand }) },
  // Apple touch icon: iOS rounds the corners itself, so full bleed.
  { file: "app/apple-icon.png", svg: iconSvg({ size: 180, scale: 0.66, bg: BRAND, radius: 0, colors: onBrand }) },
];

for (const { file, svg } of outputs) {
  const out = resolve(root, file);
  await mkdir(dirname(out), { recursive: true });
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(out);
  const meta = await sharp(out).metadata();
  console.log(`✓ ${file} (${meta.width}x${meta.height})`);
}

// Favicon: the bare brand mark.
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">${mark(onWhite)}</svg>\n`;
await writeFile(resolve(root, "app/icon.svg"), favicon);
console.log("✓ app/icon.svg");
