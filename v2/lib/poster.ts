import QRCode from "qrcode";

/**
 * The shop's sign-up poster, drawn on a canvas (13 Nov 2026): one picture that is the same on the screen, in
 * the file downloaded and on paper — the shop's face and name, what the customer gets, the code (the static
 * /j/<token>, which makes an account and the card, never a tampon), three steps and Pointili's name. Three
 * sizes (A4 to print, a story, a square post) and three looks (Pointili's purple, the shop's own colour, white
 * for a printer with little ink). Arabic is shaped by the browser; the font is the page's own (Readex Pro).
 */
export type PosterFormat = "a4" | "story" | "square";
export type PosterLook = "brand" | "shop" | "light";
export const POSTER: Record<PosterFormat, { w: number; h: number }> = {
  a4: { w: 1654, h: 2339 },
  story: { w: 1080, h: 1920 },
  square: { w: 1080, h: 1080 },
};

export type PosterArt = {
  name: string;
  color: string;
  /** the shop's logo (on white) or the picture of what it sells */
  face: HTMLImageElement | null;
  logo: boolean;
  /** Pointili's mark, in the middle of the code and at the foot */
  mark: HTMLImageElement | null;
  /** the gift beside what the customer gets */
  gift: HTMLImageElement | null;
  head: string;
  offer: string;
  steps: string[];
  scan: string;
  foot: string;
  link: string;
  font: string;
};

type Ctx = CanvasRenderingContext2D;
type RGB = [number, number, number];

const rgb = (h: string): RGB => {
  const m = h.replace("#", "");
  const full = m.length === 3 ? m.split("").map((x) => x + x).join("") : m.padEnd(6, "0").slice(0, 6);
  const n = parseInt(full, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const lum = ([r, g, b]: RGB) => {
  const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => Math.round(a[i]! + (b[i]! - a[i]!) * t)) as RGB;
const css = ([r, g, b]: RGB, a = 1) => `rgba(${r},${g},${b},${a})`;
const WHITE: RGB = [255, 255, 255];
const BLACK: RGB = [0, 0, 0];

type Pal = {
  bg: (c: Ctx, w: number, h: number, u: number) => void;
  ink: string;
  soft: string;
  head: string;
  pill: string;
  pillInk: string;
  cardRing: string | null;
  finder: string;
  stepBg: string;
  stepNum: string;
  stepNumInk: string;
  deco: string;
  shadow: string | null;
};

function palette(look: PosterLook, color: string): Pal {
  if (look === "light") {
    return {
      bg: (c, w, h, u) => {
        c.fillStyle = "#ffffff";
        c.fillRect(0, 0, w, h);
        // a soft purple dome over the top, the page white under it (little ink)
        c.fillStyle = "#f2edff";
        c.beginPath();
        c.arc(w / 2, -w * 0.62, w * 1.1, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = "#e7dfff";
        c.lineWidth = u * 0.45;
        rr(c, u * 2.4, u * 2.4, w - u * 4.8, h - u * 4.8, u * 4);
        c.stroke();
      },
      ink: "#0f0e17",
      soft: "#5d5a70",
      head: "#6c47ff",
      pill: "#6c47ff",
      pillInk: "#ffffff",
      cardRing: "#e7dfff",
      finder: "#6c47ff",
      stepBg: "#f4f3f9",
      stepNum: "#6c47ff",
      stepNumInk: "#ffffff",
      deco: "rgba(108,71,255,0.16)",
      shadow: null,
    };
  }
  if (look === "shop") {
    const base = rgb(color);
    const light = lum(base) > 0.5;
    const deep = mix(base, BLACK, 0.4);
    return {
      bg: (c, w, h) => {
        const g = c.createLinearGradient(0, 0, w * 0.25, h);
        g.addColorStop(0, css(mix(base, WHITE, 0.18)));
        g.addColorStop(0.5, css(base));
        g.addColorStop(1, css(mix(base, BLACK, 0.3)));
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
        glow(c, w * 0.15, h * 0.08, w * 0.8, "rgba(255,255,255,0.22)");
      },
      ink: light ? "#0f0e17" : "#ffffff",
      soft: light ? "rgba(15,14,23,0.72)" : "rgba(255,255,255,0.85)",
      head: light ? "#0f0e17" : "#ffffff",
      pill: light ? "#0f0e17" : "#ffffff",
      pillInk: light ? "#ffffff" : css(deep),
      cardRing: null,
      finder: lum(deep) < 0.16 ? css(deep) : "#0f0e17",
      stepBg: light ? "rgba(15,14,23,0.07)" : "rgba(255,255,255,0.16)",
      stepNum: light ? "#0f0e17" : "#ffffff",
      stepNumInk: light ? "#ffffff" : css(deep),
      deco: light ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.22)",
      shadow: "rgba(10,8,30,0.32)",
    };
  }
  return {
    bg: (c, w, h) => {
      const g = c.createLinearGradient(0, 0, w * 0.25, h);
      g.addColorStop(0, "#8d70ff");
      g.addColorStop(0.45, "#6c47ff");
      g.addColorStop(1, "#4220cc");
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
      glow(c, w * 0.12, h * 0.06, w * 0.85, "rgba(255,255,255,0.24)");
      glow(c, w * 0.95, h * 0.86, w * 0.7, "rgba(255,107,74,0.30)");
    },
    ink: "#ffffff",
    soft: "rgba(255,255,255,0.85)",
    head: "#ffffff",
    pill: "#ff6b4a",
    pillInk: "#ffffff",
    cardRing: null,
    finder: "#4a2ad6",
    stepBg: "rgba(255,255,255,0.15)",
    stepNum: "#ffffff",
    stepNumInk: "#4a2ad6",
    deco: "rgba(255,255,255,0.22)",
    shadow: "rgba(18,6,60,0.38)",
  };
}

function glow(c: Ctx, x: number, y: number, r: number, color: string) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = g;
  c.fillRect(0, 0, c.canvas.width, c.canvas.height);
}

function rr(c: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const q = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + q, y);
  c.arcTo(x + w, y, x + w, y + h, q);
  c.arcTo(x + w, y + h, x, y + h, q);
  c.arcTo(x, y + h, x, y, q);
  c.arcTo(x, y, x + w, y, q);
  c.closePath();
}

/** Pointili's sparkle: four points, the sides drawn in */
function sparkle(c: Ctx, x: number, y: number, r: number) {
  c.beginPath();
  c.moveTo(x, y - r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.quadraticCurveTo(x, y, x, y + r);
  c.quadraticCurveTo(x, y, x - r, y);
  c.quadraticCurveTo(x, y, x, y - r);
  c.closePath();
  c.fill();
}

const setFont = (c: Ctx, px: number, weight: number, fam: string) => {
  c.font = `${weight} ${Math.round(px)}px ${fam}`;
};
/** the largest size (down to `min`) at which the words hold on one line */
function fit(c: Ctx, text: string, maxW: number, px: number, min: number, weight: number, fam: string): number {
  let p = px;
  setFont(c, p, weight, fam);
  while (p > min && c.measureText(text).width > maxW) {
    p -= Math.max(1, p * 0.04);
    setFont(c, p, weight, fam);
  }
  return p;
}
/** the words in lines no wider than maxW, at the font set */
function wrap(c: Ctx, text: string, maxW: number, most = 3): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (c.measureText(next).width <= maxW || !line) line = next;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  if (lines.length > most) return [...lines.slice(0, most - 1), lines.slice(most - 1).join(" ")];
  // two lines: cut where the longer of the two is the shortest (no word left alone under a full line)
  if (lines.length === 2 && words.length > 2) {
    let best = lines;
    let widest = Math.max(...lines.map((l) => c.measureText(l).width));
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(" ");
      const b = words.slice(i).join(" ");
      const wd = Math.max(c.measureText(a).width, c.measureText(b).width);
      if (wd <= maxW && wd < widest) {
        widest = wd;
        best = [a, b];
      }
    }
    return best;
  }
  return lines;
}

/** an image inside a box, whole (contain) */
function contain(c: Ctx, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const iw = img.naturalWidth || img.width || 1;
  const ih = img.naturalHeight || img.height || 1;
  const k = Math.min(w / iw, h / ih);
  c.drawImage(img, x + (w - iw * k) / 2, y + (h - ih * k) / 2, iw * k, ih * k);
}

/**
 * The code, drawn: round dots, the three corners as round squares in the look's colour, and Pointili's mark
 * in a white middle — on the highest correction (H), the middle covers far less than the code can lose.
 */
function drawQR(c: Ctx, link: string, x: number, y: number, size: number, finder: string, mark: HTMLImageElement | null) {
  const qr = QRCode.create(link, { errorCorrectionLevel: "H" });
  const n = qr.modules.size;
  const m = size / n;
  const corner = (r: number, k: number) => (r < 7 && k < 7) || (r < 7 && k >= n - 7) || (r >= n - 7 && k < 7);
  const mid = Math.floor(n / 2);
  const hole = Math.max(3, Math.round(n * 0.11));
  c.fillStyle = "#0f0e17";
  for (let r = 0; r < n; r++) {
    for (let k = 0; k < n; k++) {
      if (!qr.modules.get(r, k) || corner(r, k)) continue;
      if (Math.abs(r - mid) <= hole && Math.abs(k - mid) <= hole) continue;
      rr(c, x + k * m + m * 0.07, y + r * m + m * 0.07, m * 0.86, m * 0.86, m * 0.3);
      c.fill();
    }
  }
  for (const [r, k] of [
    [0, 0],
    [0, n - 7],
    [n - 7, 0],
  ] as const) {
    const fx = x + k * m;
    const fy = y + r * m;
    c.fillStyle = finder;
    rr(c, fx, fy, m * 7, m * 7, m * 2.1);
    c.fill();
    c.fillStyle = "#ffffff";
    rr(c, fx + m, fy + m, m * 5, m * 5, m * 1.5);
    c.fill();
    c.fillStyle = finder;
    rr(c, fx + m * 2, fy + m * 2, m * 3, m * 3, m * 1.05);
    c.fill();
  }
  // the middle: white, round, Pointili's mark
  const hs = (hole * 2 + 1) * m;
  const hx = x + (mid - hole) * m;
  const hy = y + (mid - hole) * m;
  c.fillStyle = "#ffffff";
  rr(c, hx + m * 0.3, hy + m * 0.3, hs - m * 0.6, hs - m * 0.6, m * 1.6);
  c.fill();
  if (mark) contain(c, mark, hx + hs * 0.18, hy + hs * 0.18, hs * 0.64, hs * 0.64);
}

/** the shop's face: a white disc with a ring, the logo or the picture of what it sells in it */
function drawFace(c: Ctx, art: PosterArt, cx: number, cy: number, d: number, p: Pal, u: number) {
  c.save();
  if (p.shadow) {
    c.shadowColor = p.shadow;
    c.shadowBlur = u * 3;
    c.shadowOffsetY = u * 0.8;
  }
  c.fillStyle = "#ffffff";
  c.beginPath();
  c.arc(cx, cy, d / 2, 0, Math.PI * 2);
  c.fill();
  c.restore();
  if (p.cardRing) {
    c.strokeStyle = p.cardRing;
    c.lineWidth = u * 0.5;
    c.beginPath();
    c.arc(cx, cy, d / 2, 0, Math.PI * 2);
    c.stroke();
  }
  if (art.face) {
    c.save();
    c.beginPath();
    c.arc(cx, cy, d / 2 - u * 0.4, 0, Math.PI * 2);
    c.clip();
    const k = art.logo ? 0.74 : 0.66;
    contain(c, art.face, cx - (d * k) / 2, cy - (d * k) / 2, d * k, d * k);
    c.restore();
  }
}

/** what the customer gets, in a pill: the gift's picture, then the words */
function drawPill(c: Ctx, art: PosterArt, cx: number, y: number, h: number, maxW: number, p: Pal, align: "center" | "right" = "center") {
  const px = fit(c, art.offer, maxW - h * 1.6, h * 0.46, h * 0.3, 700, art.font);
  setFont(c, px, 700, art.font);
  const tw = c.measureText(art.offer).width;
  const icon = art.gift ? h * 0.78 : 0;
  const w = Math.min(maxW, tw + icon + h * 1.05);
  const x = align === "center" ? cx - w / 2 : cx - w;
  c.fillStyle = p.pill;
  rr(c, x, y, w, h, h / 2);
  c.fill();
  // RTL: the picture at the start (the right), the words after it
  if (art.gift) contain(c, art.gift, x + w - h * 0.32 - icon, y + (h - icon) / 2, icon, icon);
  c.fillStyle = p.pillInk;
  c.textAlign = "right";
  c.textBaseline = "middle";
  c.fillText(art.offer, x + w - h * 0.42 - icon - h * 0.12, y + h / 2 + px * 0.04);
}

/** the white card around the code, the line under it */
function drawCard(c: Ctx, art: PosterArt, x: number, y: number, w: number, qr: number, pad: number, cap: number, p: Pal, u: number) {
  const h = pad + qr + cap * 2.2 + pad * 0.7;
  c.save();
  if (p.shadow) {
    c.shadowColor = p.shadow;
    c.shadowBlur = u * 5;
    c.shadowOffsetY = u * 1.6;
  }
  c.fillStyle = "#ffffff";
  rr(c, x, y, w, h, u * 5);
  c.fill();
  c.restore();
  if (p.cardRing) {
    c.strokeStyle = p.cardRing;
    c.lineWidth = u * 0.5;
    rr(c, x, y, w, h, u * 5);
    c.stroke();
  }
  drawQR(c, art.link, x + (w - qr) / 2, y + pad, qr, p.finder, art.mark);
  setFont(c, cap, 600, art.font);
  c.fillStyle = "#5d5a70";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(art.scan, x + w / 2, y + pad + qr + cap * 1.25);
  return h;
}

/** the three steps: a number in a disc, two lines under it */
function drawSteps(c: Ctx, art: PosterArt, x: number, y: number, w: number, d: number, px: number, p: Pal) {
  const col = w / art.steps.length;
  art.steps.forEach((s, i) => {
    // RTL: the first step on the right
    const cx = x + w - col * (i + 0.5);
    c.fillStyle = p.stepNum;
    c.beginPath();
    c.arc(cx, y + d / 2, d / 2, 0, Math.PI * 2);
    c.fill();
    setFont(c, d * 0.5, 700, art.font);
    c.fillStyle = p.stepNumInk;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(String(i + 1), cx, y + d / 2 + d * 0.03);
    setFont(c, px, 600, art.font);
    c.fillStyle = p.ink;
    const lines = wrap(c, s, col * 0.9, 2);
    lines.forEach((l, j) => c.fillText(l, cx, y + d + px * 0.95 + j * px * 1.22));
  });
  return d + px * 0.95 + px * 1.22 * 2;
}

/** Pointili at the foot: the mark, the name, and the line under it */
function drawFoot(c: Ctx, art: PosterArt, cx: number, y: number, u: number, p: Pal, k = 1) {
  const markH = u * 3.4 * k;
  const markW = markH * (96 / 70);
  setFont(c, u * 3.6 * k, 700, art.font);
  const name = "Pointili";
  const nw = c.measureText(name).width;
  const total = markW + u * 1.2 * k + nw;
  const left = cx - total / 2;
  if (art.mark) {
    // on a dark ground the mark sits on a white chip, so its purple reads
    if (p.ink === "#ffffff") {
      c.fillStyle = "rgba(255,255,255,0.95)";
      rr(c, left - u * 0.5 * k, y - u * 0.5 * k, markW + u * k, markH + u * k, u * 1.1 * k);
      c.fill();
    }
    contain(c, art.mark, left, y, markW, markH);
  }
  c.fillStyle = p.ink;
  c.textAlign = "left";
  c.textBaseline = "middle";
  c.direction = "ltr";
  c.fillText(name, left + markW + u * 1.2 * k, y + markH / 2 + u * 0.1);
  c.direction = "rtl";
  setFont(c, u * 2.5 * k, 500, art.font);
  c.fillStyle = p.soft;
  c.textAlign = "center";
  c.fillText(`${art.foot} · pointili.online`, cx, y + markH + u * 2.6 * k);
  return markH + u * 4 * k;
}

function decorate(c: Ctx, w: number, h: number, u: number, p: Pal, square: boolean) {
  c.fillStyle = p.deco;
  const spots = square
    ? [
        [0.05, 0.08, 2.2],
        [0.5, 0.05, 1.4],
        [0.96, 0.93, 2],
        [0.04, 0.93, 1.5],
        [0.49, 0.95, 1.1],
      ]
    : [
        [0.09, 0.06, 2.4],
        [0.91, 0.1, 3],
        [0.06, 0.4, 1.6],
        [0.95, 0.44, 2],
        [0.1, 0.78, 2.2],
        [0.92, 0.83, 1.5],
        [0.5, 0.025, 1.2],
      ];
  for (const [x, y, r] of spots) sparkle(c, x! * w, y! * h, r! * u);
  // two thin rings, half off the page: stamps on a card
  c.strokeStyle = p.deco;
  c.lineWidth = u * 0.5;
  for (const [x, y, r] of square
    ? [
        [1.02, 0.18, 0.12],
        [-0.03, 0.62, 0.09],
      ]
    : [
        [1.04, 0.28, 0.16],
        [-0.05, 0.6, 0.12],
      ]) {
    c.beginPath();
    c.arc(x! * w, y! * h, r! * w, 0, Math.PI * 2);
    c.stroke();
  }
}

/** The poster, drawn into the canvas at its full size. */
export function drawPoster(canvas: HTMLCanvasElement, format: PosterFormat, look: PosterLook, art: PosterArt) {
  const { w, h } = POSTER[format];
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext("2d");
  if (!c) return;
  const u = w / 100;
  const p = palette(look, art.color);
  c.direction = "rtl";
  p.bg(c, w, h, u);
  decorate(c, w, h, u, p, format === "square");
  if (format === "square") return drawSquare(c, w, h, u, p, art);

  const story = format === "story";
  const face = story ? 17 * u : 14 * u;
  const nameMax = story ? 9 * u : 8.2 * u;
  const headPx = story ? 5.4 * u : 4.9 * u;
  const pillH = story ? 9.6 * u : 8.6 * u;
  let qr = story ? 60 * u : 52 * u;
  const pad = 4.4 * u;
  const cap = story ? 3.6 * u : 3.2 * u;
  const stepD = story ? 7 * u : 6 * u;
  const stepPx = story ? 3.3 * u : 2.9 * u;

  // the name: one line if it can, two if it is long
  let namePx = fit(c, art.name, 86 * u, nameMax, 5.2 * u, 700, art.font);
  setFont(c, namePx, 700, art.font);
  let nameLines = [art.name];
  if (c.measureText(art.name).width > 86 * u) {
    namePx = 5.6 * u;
    setFont(c, namePx, 700, art.font);
    nameLines = wrap(c, art.name, 86 * u, 2);
  }
  setFont(c, headPx, 500, art.font);
  const headLines = wrap(c, art.head, 84 * u, 2);

  const nameH = nameLines.length * namePx * 1.12;
  const headH = headLines.length * headPx * 1.3;
  const cardH = () => pad + qr + cap * 2.2 + pad * 0.7;
  const stepsH = stepD + stepPx * 0.95 + stepPx * 1.22 * 2;
  const footH = 3.4 * u + 4 * u;
  const top = story ? 8 * u : 5.6 * u;
  const bottom = story ? 6 * u : 4.6 * u;
  const gaps = [2.4, 1.2, 3, 4, 4, 3.4].map((g) => g * u);
  const used = () => face + nameH + headH + pillH + cardH() + stepsH + footH + gaps.reduce((a, b) => a + b, 0);
  let free = h - top - bottom - used();
  if (free < 0) {
    qr = Math.max(36 * u, qr + free);
    free = h - top - bottom - used();
  }
  const extra = Math.max(0, free) / gaps.length;
  const g = gaps.map((x) => x + extra);

  let y = top;
  drawFace(c, art, w / 2, y + face / 2, face, p, u);
  y += face + g[0]!;
  c.textAlign = "center";
  c.textBaseline = "top";
  setFont(c, namePx, 700, art.font);
  c.fillStyle = p.ink;
  nameLines.forEach((l, i) => c.fillText(l, w / 2, y + i * namePx * 1.12));
  y += nameH + g[1]!;
  setFont(c, headPx, 500, art.font);
  c.fillStyle = p.soft;
  headLines.forEach((l, i) => c.fillText(l, w / 2, y + i * headPx * 1.3));
  y += headH + g[2]!;
  drawPill(c, art, w / 2, y, pillH, 84 * u, p);
  y += pillH + g[3]!;
  const cardW = qr + pad * 2;
  y += drawCard(c, art, (w - cardW) / 2, y, cardW, qr, pad, cap, p, u) + g[4]!;
  y += drawSteps(c, art, 8 * u, y, 84 * u, stepD, stepPx, p) + g[5]!;
  drawFoot(c, art, w / 2, y, u, p, story ? 1.1 : 1);
}

function drawSquare(c: Ctx, w: number, h: number, u: number, p: Pal, art: PosterArt) {
  // the code on the left, the words on the right (RTL: they are read first)
  const qr = 33 * u;
  const pad = 3.6 * u;
  const cap = 2.6 * u;
  const cardW = qr + pad * 2;
  const cardH = pad + qr + cap * 2.2 + pad * 0.7;
  const footH = 7 * u;
  const cardX = 6 * u;
  const cardY = (h - footH - cardH) / 2;
  drawCard(c, art, cardX, cardY, cardW, qr, pad, cap, p, u);

  const right = 94 * u;
  const colW = right - (cardX + cardW + 5 * u);
  const face = 11 * u;
  let namePx = fit(c, art.name, colW, 6.6 * u, 4 * u, 700, art.font);
  setFont(c, namePx, 700, art.font);
  let nameLines = [art.name];
  if (c.measureText(art.name).width > colW) {
    namePx = 4.2 * u;
    setFont(c, namePx, 700, art.font);
    nameLines = wrap(c, art.name, colW, 2);
  }
  const headPx = 3.6 * u;
  setFont(c, headPx, 500, art.font);
  const headLines = wrap(c, art.head, colW, 3);
  const pillH = 6.6 * u;
  const stepD = 4.6 * u;
  const stepPx = 2.7 * u;
  const total = face + 2.2 * u + nameLines.length * namePx * 1.12 + 1 * u + headLines.length * headPx * 1.3 + 2.6 * u + pillH + 3 * u + art.steps.length * (stepD + 1.4 * u);
  let y = Math.max(5 * u, (h - footH - total) / 2);

  drawFace(c, art, right - face / 2, y + face / 2, face, p, u);
  y += face + 2.2 * u;
  c.textAlign = "right";
  c.textBaseline = "top";
  setFont(c, namePx, 700, art.font);
  c.fillStyle = p.ink;
  nameLines.forEach((l, i) => c.fillText(l, right, y + i * namePx * 1.12));
  y += nameLines.length * namePx * 1.12 + 1 * u;
  setFont(c, headPx, 500, art.font);
  c.fillStyle = p.soft;
  headLines.forEach((l, i) => c.fillText(l, right, y + i * headPx * 1.3));
  y += headLines.length * headPx * 1.3 + 2.6 * u;
  drawPill(c, art, right, y, pillH, colW, p, "right");
  y += pillH + 3 * u;
  // the steps, one under the other
  art.steps.forEach((s, i) => {
    const cy = y + stepD / 2;
    c.fillStyle = p.stepNum;
    c.beginPath();
    c.arc(right - stepD / 2, cy, stepD / 2, 0, Math.PI * 2);
    c.fill();
    setFont(c, stepD * 0.5, 700, art.font);
    c.fillStyle = p.stepNumInk;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(String(i + 1), right - stepD / 2, cy + stepD * 0.03);
    setFont(c, stepPx, 600, art.font);
    c.fillStyle = p.ink;
    c.textAlign = "right";
    c.fillText(s, right - stepD - 1.6 * u, cy);
    y += stepD + 1.4 * u;
  });
  drawFoot(c, art, w / 2, h - footH - 2.2 * u, u, p, 0.85);
}
