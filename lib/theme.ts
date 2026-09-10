import { BRAND_COLOR } from "./brand";

/**
 * THE SHOP'S OWN COLOUR, MADE SAFE. The customer's card wears the shop colour;
 * an owner can hand us a pale yellow that makes white text vanish, and the
 * screen still has to be readable. So nothing here trusts the input:
 *
 *   --cafe        the colour as given (card fill)
 *   --cafe-ink    what to WRITE on it — white or near-black, measured
 *   --cafe-text   the colour darkened until legible ON WHITE (figures, links)
 *   --cafe-soft   a wash of it for chips
 *   --cafe-line   a hairline of it
 *   --cafe-deep   a darker end for a gradient
 *
 * THE TRAP: -ink and -text cannot be done in CSS. color-mix can blend but it
 * cannot MEASURE; these are computed on the server and shipped inline so
 * there is no flash and no client work. Ported from v1 lib/theme.ts minus the
 * v1 card themes (radius/font/surface) that this product does not have.
 */

const INK = "#17121f";
const WHITE = "#ffffff";

/** #abc / #aabbcc → [r,g,b]; anything else → null. */
function parseHex(hex: string): [number, number, number] | null {
  const h = hex.trim().replace(/^#/, "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

/** WCAG relative luminance. */
function luminance([r, g, b]: [number, number, number]): number {
  const lin = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function mix(c: [number, number, number], towards: [number, number, number], amount: number) {
  return c.map((v, i) => v + (towards[i] - v) * amount) as [number, number, number];
}

/** A valid colour as lowercase #rrggbb, or the house colour. Never throws.
 *  Lowercase because shops.colour is CHECKed against ^#[0-9a-f]{6}$. */
export function safeColor(input: string | null | undefined): string {
  const rgb = parseHex(input ?? "");
  return rgb ? toHex(rgb) : BRAND_COLOR;
}

/** White or near-black — whichever is legible ON this colour. */
export function inkOn(color: string): string {
  const rgb = parseHex(color) ?? parseHex(BRAND_COLOR)!;
  return contrast(rgb, parseHex(WHITE)!) >= contrast(rgb, parseHex(INK)!) ? WHITE : INK;
}

/**
 * The same hue, pushed until it clears 4.5:1 on `against` — towards black on a
 * light background, towards white on a dark one. Already-legible colours are
 * returned untouched; the loop simply never runs.
 */
export function textOnWhite(color: string, against: string = WHITE): string {
  let rgb = parseHex(color) ?? parseHex(BRAND_COLOR)!;
  const bg = parseHex(against) ?? parseHex(WHITE)!;
  const towards: [number, number, number] = luminance(bg) > 0.45 ? [0, 0, 0] : [255, 255, 255];
  for (let i = 0; i < 24 && contrast(rgb, bg) < 4.5; i++) rgb = mix(rgb, towards, 0.06);
  return toHex(rgb);
}

/**
 * Every custom property the customer's screens theme on, as an inline style.
 *
 * --cafe-text is measured against the TINT, not against white: the tint is the
 * harder background (same hue, lifted), and a figure that clears 4.5 on white
 * measured about 4.0 where it was actually drawn.
 */
export function cafeVars(primary: string | null | undefined, panel: string = WHITE): Record<string, string> {
  const cafe = safeColor(primary);
  const rgb = parseHex(cafe)!;
  const white = parseHex(panel) ?? parseHex(WHITE)!;
  const soft = toHex(mix(rgb, white, 0.86));

  return {
    "--cafe": cafe,
    "--cafe-ink": inkOn(cafe),
    "--cafe-text": textOnWhite(cafe, soft),
    "--cafe-soft": soft,
    "--cafe-line": toHex(mix(rgb, white, 0.72)),
    "--cafe-deep": toHex(mix(rgb, [0, 0, 0], 0.28)),
  };
}

/**
 * The swatches an owner picks from with one tap — distinguishable at a glance
 * and dark enough to carry white text, because that is the case a shop hits
 * first. The free picker below them is for a brand with an exact hex.
 */
export const BRAND_SWATCHES = [
  { name: "Mauve", hex: "#5b3fd1" },
  { name: "Encre", hex: "#1f2937" },
  { name: "Forêt", hex: "#0f6b4f" },
  { name: "Océan", hex: "#0e6fa8" },
  { name: "Brique", hex: "#b0341f" },
  { name: "Terre", hex: "#7a4a25" },
  { name: "Prune", hex: "#7a2b56" },
  { name: "Turquoise", hex: "#0e7c86" },
  { name: "Ardoise", hex: "#475569" },
  { name: "Olive", hex: "#4d6027" },
] as const;
