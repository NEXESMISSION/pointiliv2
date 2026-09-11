import { CARD_COLORS, CARD_ICONS, type CardIconName } from "./constants";

/**
 * A loyalty card's look, designed by the owner. Validation here mirrors
 * public.clean_card_design() in SQL — keep the two in step.
 */
export const TEMPLATE_IDS = ["bold", "classic", "pastel", "midnight", "photo", "minimal"] as const;
export const PATTERNS = ["none", "dots", "waves", "grid", "confetti"] as const;
export const STAMP_STYLES = ["icon", "logo", "check", "heart", "star"] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];
export type PatternId = (typeof PATTERNS)[number];
export type StampStyle = (typeof STAMP_STYLES)[number];

export type CardDesign = {
  template: TemplateId;
  bg: string;
  bg2: string | null;
  accent: string;
  text: "light" | "dark";
  pattern: PatternId;
  stamp: StampStyle;
  icon: CardIconName;
  use_cover: boolean;
};

export const SWATCHES = [
  "#6535E0", "#7C3AED", "#DB2777", "#E11D48", "#EA580C", "#D97706",
  "#65A30D", "#0E9F6E", "#0891B2", "#0284C7", "#6B4226", "#334155",
  "#111827", "#F5C451", "#FDF6EC", "#FFFFFF",
];

// ── colour maths ─────────────────────────────────────────────────────────
const HEX = /^#[0-9A-Fa-f]{6}$/;
function rgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function toHex([r, g, b]: [number, number, number]) {
  return `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}
export function mix(a: string, b: string, t: number) {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  return toHex([r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t]);
}
export const shade = (hex: string, t: number) => mix(hex, "#000000", t);
export function luminance(hex: string) {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
export const isLight = (hex: string) => luminance(hex) > 0.45;
export function rgba(hex: string, a: number) {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// ── templates: starting points built from the owner's main colour ────────
export const TEMPLATES: Record<TemplateId, { label: string; hint: string; make: (brand: string) => Partial<CardDesign> }> = {
  bold: { label: "Bold", hint: "Your colour, full card", make: (c) => ({ bg: c, bg2: shade(c, 0.28), accent: "#FFFFFF", text: isLight(c) ? "dark" : "light", pattern: "waves", use_cover: false }) },
  classic: { label: "Classic", hint: "Clean white card", make: (c) => ({ bg: "#FFFFFF", bg2: null, accent: isLight(c) ? shade(c, 0.35) : c, text: "dark", pattern: "none", use_cover: false }) },
  pastel: { label: "Soft", hint: "Light tint of your colour", make: (c) => ({ bg: mix(c, "#FFFFFF", 0.88), bg2: mix(c, "#FFFFFF", 0.72), accent: isLight(c) ? shade(c, 0.35) : c, text: "dark", pattern: "dots", use_cover: false }) },
  midnight: { label: "Midnight", hint: "Dark with gold stamps", make: () => ({ bg: "#111827", bg2: "#27303F", accent: "#F5C451", text: "light", pattern: "grid", use_cover: false }) },
  photo: { label: "Photo", hint: "Your cover photo", make: () => ({ bg: "#111827", bg2: null, accent: "#FFFFFF", text: "light", pattern: "none", use_cover: true }) },
  minimal: { label: "Minimal", hint: "Calm and simple", make: () => ({ bg: "#FAFAF7", bg2: null, accent: "#111827", text: "dark", pattern: "none", stamp: "check", use_cover: false }) },
};

/** Any stored/partial design (or a card from before designs existed) → a complete, valid design. */
export function resolveDesign(raw: Partial<CardDesign> | null | undefined, legacy?: { color?: string | null; icon?: string | null }): CardDesign {
  const brand = CARD_COLORS[(legacy?.color ?? "indigo") as keyof typeof CARD_COLORS]?.accent ?? "#6535E0";
  const legacyIcon = (CARD_ICONS as readonly string[]).includes(legacy?.icon ?? "") ? (legacy!.icon as CardIconName) : "coffee";
  const r = raw ?? {};
  const has = Object.keys(r).length > 0;
  const base: CardDesign = { template: "bold", stamp: "icon", icon: legacyIcon, ...(TEMPLATES.bold.make(brand) as Omit<CardDesign, "template" | "stamp" | "icon">) };
  if (!has) return base;
  return {
    template: (TEMPLATE_IDS as readonly string[]).includes(r.template ?? "") ? r.template! : base.template,
    bg: HEX.test(r.bg ?? "") ? r.bg! : base.bg,
    bg2: HEX.test(r.bg2 ?? "") ? r.bg2! : null,
    accent: HEX.test(r.accent ?? "") ? r.accent! : base.accent,
    text: r.text === "dark" || r.text === "light" ? r.text : base.text,
    pattern: (PATTERNS as readonly string[]).includes(r.pattern ?? "") ? r.pattern! : "none",
    stamp: (STAMP_STYLES as readonly string[]).includes(r.stamp ?? "") ? r.stamp! : "icon",
    icon: (CARD_ICONS as readonly string[]).includes(r.icon ?? "") ? r.icon! : legacyIcon,
    use_cover: r.use_cover === true,
  };
}

/** Everything a card needs to paint itself. */
export function surface(d: CardDesign, hasCover: boolean) {
  const photo = d.use_cover && hasCover;
  const light = photo || d.text === "light";
  const accentLight = isLight(d.accent);
  return {
    photo,
    light,
    background: photo ? "#111827" : d.bg2 ? `linear-gradient(135deg, ${d.bg} 0%, ${d.bg2} 100%)` : d.bg,
    fg: light ? "#FFFFFF" : "#0F1222",
    muted: light ? "rgba(255,255,255,0.75)" : "rgba(15,18,34,0.62)",
    chip: light ? "rgba(255,255,255,0.16)" : "rgba(15,18,34,0.06)",
    emptyBorder: light ? "rgba(255,255,255,0.5)" : rgba(d.accent, 0.4),
    emptyFill: light ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.55)",
    onAccent: accentLight ? (isLight(d.bg) || photo ? "#0F1222" : d.bg) : "#FFFFFF",
    border: !photo && isLight(d.bg) && !d.bg2 ? "1px solid rgba(15,18,34,0.08)" : "none",
  };
}

export function patternImage(p: PatternId, light: boolean): string | undefined {
  if (p === "none") return undefined;
  const c = light ? "255,255,255" : "15,18,34";
  const a = light ? 0.16 : 0.08;
  const svg: Record<Exclude<PatternId, "none">, string> = {
    dots: `<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16'><circle cx='3' cy='3' r='1.5' fill='rgba(${c},${a * 1.4})'/></svg>`,
    grid: `<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22'><path d='M22 0H0V22' fill='none' stroke='rgba(${c},${a})' stroke-width='1'/></svg>`,
    waves: `<svg xmlns='http://www.w3.org/2000/svg' width='90' height='36'><path d='M0 18c22 0 22-10 45-10s23 10 45 10' fill='none' stroke='rgba(${c},${a * 1.3})' stroke-width='2'/><path d='M0 34c22 0 22-10 45-10s23 10 45 10' fill='none' stroke='rgba(${c},${a * 0.8})' stroke-width='2'/></svg>`,
    confetti: `<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60'><rect x='8' y='10' width='6' height='3' rx='1.5' transform='rotate(25 11 11)' fill='rgba(${c},${a * 1.5})'/><rect x='38' y='6' width='6' height='3' rx='1.5' transform='rotate(-30 41 7)' fill='rgba(${c},${a * 1.2})'/><circle cx='28' cy='34' r='2' fill='rgba(${c},${a * 1.4})'/><rect x='46' y='42' width='6' height='3' rx='1.5' transform='rotate(40 49 43)' fill='rgba(${c},${a * 1.5})'/><circle cx='10' cy='48' r='1.6' fill='rgba(${c},${a * 1.2})'/></svg>`,
  };
  return `url("data:image/svg+xml,${encodeURIComponent(svg[p])}")`;
}
