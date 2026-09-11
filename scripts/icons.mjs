// Renders every Pointili icon from the brand mark (same shapes as components/Logo.tsx).
// Run: node scripts/icons.mjs
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BRAND = "#6535E0";

/** The mark in its 96×70 box. `white` = white cards with a violet sparkle (for violet backgrounds). */
function mark(white, idp) {
  return `<defs>
    <linearGradient id="${idp}b" x1="0" y1="0" x2="0.2" y2="1"><stop offset="0" stop-color="#7244EC"/><stop offset="1" stop-color="#4F28C6"/></linearGradient>
    <linearGradient id="${idp}f" x1="0" y1="0" x2="0.25" y2="1"><stop offset="0" stop-color="#7143E6"/><stop offset="1" stop-color="#5029C5"/></linearGradient>
    <mask id="${idp}m"><rect width="96" height="70" fill="#fff"/><rect x="-2" y="14" width="86" height="58" rx="10" fill="#000"/></mask>
  </defs>
  <rect x="16" y="5" width="72" height="50" rx="7" transform="rotate(8 52 30)" fill="${white ? "#FFFFFF" : `url(#${idp}b)`}" fill-opacity="${white ? 0.55 : 1}" mask="url(#${idp}m)"/>
  <rect x="1" y="17" width="80" height="52" rx="8" fill="${white ? "#FFFFFF" : `url(#${idp}f)`}"/>
  <path d="M41 29C42.2 38.6 44.4 41.2 56 43 44.4 44.8 42.2 47.4 41 57 39.8 47.4 37.6 44.8 26 43 37.6 41.2 39.8 38.6 41 29Z" fill="${white ? BRAND : "#FFFFFF"}"/>`;
}

/** Square icon: background + the mark centred at `scale` of the width. */
function icon({ size, scale, bg, radius = 0, white }) {
  const w = size * scale;
  const k = w / 96;
  const x = (size - w) / 2;
  const y = (size - 70 * k) / 2 + size * 0.015;
  const fill = bg === "violet" ? `url(#bg)` : bg;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7A4DF0"/><stop offset="1" stop-color="#4E27C4"/></linearGradient></defs>
  <rect width="${size}" height="${size}" rx="${size * radius}" fill="${fill}"/>
  <g transform="translate(${x} ${y}) scale(${k})">${mark(white, "m")}</g>
</svg>`;
}

const outputs = [
  // "any": colour mark on white — what Android shows when it doesn't mask.
  { file: "public/icon-192.png", svg: icon({ size: 192, scale: 0.7, bg: "#FFFFFF", radius: 0.22, white: false }) },
  { file: "public/icon-512.png", svg: icon({ size: 512, scale: 0.7, bg: "#FFFFFF", radius: 0.22, white: false }) },
  // Maskable (Android adaptive icons): full-bleed violet, mark inside the 80% safe circle.
  { file: "public/icon-maskable-512.png", svg: icon({ size: 512, scale: 0.52, bg: "violet", white: true }) },
  { file: "public/icon-maskable-192.png", svg: icon({ size: 192, scale: 0.52, bg: "violet", white: true }) },
  // iOS home screen: full bleed, iOS rounds the corners.
  { file: "app/apple-icon.png", svg: icon({ size: 180, scale: 0.6, bg: "violet", white: true }) },
];

for (const { file, svg } of outputs) {
  const out = resolve(root, file);
  await mkdir(dirname(out), { recursive: true });
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(out);
  console.log(`✓ ${file}`);
}

// Favicon (SVG, crisp at every size) and the mark on its own for the offline page/OG image.
await writeFile(resolve(root, "app/icon.svg"), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -13 96 96">${mark(false, "f")}</svg>\n`);
await writeFile(resolve(root, "public/brand-mark.svg"), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 70">${mark(false, "p")}</svg>\n`);
console.log("✓ app/icon.svg, public/brand-mark.svg");
