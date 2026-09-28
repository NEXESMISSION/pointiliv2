import { fmt } from "@/lib/i18n/dict";
import { INTL, type Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n";

/* ── Shapes returned by admin_traffic* (supabase/migrations/0010_analytics.sql) ── */

export type KV = { k: string; n: number };
export type HeatCell = { d: number; h: number; n: number };

export type TrafficPerson = { id: string; name: string | null; phone: string | null; role: string | null; business: string | null };

export type TrafficVisit = {
  session: string;
  visitor: string | null;
  started: string;
  last_at: string;
  views: number;
  entry: string;
  exit: string;
  seconds: number;
  source: string;
  campaign: string | null;
  device: string | null;
  os: string | null;
  browser: string | null;
  in_app: string | null;
  country: string | null;
  city: string | null;
  signed_in: boolean;
  user: TrafficPerson | null;
};

export type Traffic = {
  from: string;
  to: string;
  unit: "hour" | "day";
  kpis: {
    visitors: number;
    new_visitors: number;
    sessions: number;
    views: number;
    avg_seconds: number;
    bounce: number | null;
    signed_in: number;
    logins: number;
    signups: number;
    clicks: number;
  };
  prev: { visitors: number; sessions: number; views: number };
  series: { t: string; visitors: number; views: number }[];
  heat_visits: HeatCell[];
  heat_stamps: HeatCell[];
  pages: { path: string; views: number; visitors: number; seconds: number | null; clicks: number }[];
  entries: KV[];
  sources: KV[];
  campaigns: KV[];
  devices: KV[];
  os: KV[];
  browsers: KV[];
  countries: KV[];
  cities: KV[];
  audience: KV[];
  live: { count: number; people: { visitor: string; session: string | null; path: string; at: string; name: string | null; role: string | null }[] };
  recent: TrafficVisit[];
};

export type TrafficSession = {
  session: string;
  visitor: string | null;
  signed_in: boolean;
  user: TrafficPerson | null;
  first: {
    at: string;
    referrer: string | null;
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    device: string | null;
    os: string | null;
    browser: string | null;
    in_app: string | null;
    country: string | null;
    city: string | null;
    lang: string | null;
    vw: number | null;
    vh: number | null;
    bot: boolean;
    test: boolean;
  } | null;
  started: string;
  last_at: string;
  seconds: number;
  events: { kind: "view" | "click" | "login" | "signup"; at: string; path: string; target: string | null; seconds: number | null }[];
  other_visits: { session: string; started: string; views: number; entry: string | null }[];
};

export type TrafficClicks = {
  total: number;
  /** [x share of the width, y in page px, page height, screen width] */
  points: [number, number, number | null, number | null][];
  targets: KV[];
  pages: KV[];
  by_device: { mobile: number; desktop: number };
};

/* ── Ranges: whole Tunis days, so a "7 days" chart has seven bars ────────────── */

export const RANGES = ["d1", "d7", "d30", "d90"] as const;
export type Range = (typeof RANGES)[number];
const DAYS: Record<Range, number> = { d1: 1, d7: 7, d30: 30, d90: 90 };

export function isRange(v: unknown): v is Range {
  return typeof v === "string" && (RANGES as readonly string[]).includes(v);
}

/** Tunisia keeps UTC+1 all year: midnight there is 23:00 UTC the day before. */
export function rangeWindow(range: Range, now = new Date()): { from: Date; to: Date } {
  if (range === "d1") {
    const hour = Math.floor(now.getTime() / 3_600_000) * 3_600_000;
    return { from: new Date(hour - 23 * 3_600_000), to: now };
  }
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Tunis" }).format(new Date(now.getTime() - (DAYS[range] - 1) * 86_400_000));
  return { from: new Date(`${day}T00:00:00+01:00`), to: now };
}

/* ── Links: the reader's choices travel in the address ─────────────────────── */

export const TABS = ["overview", "people", "times", "sources", "pages"] as const;
export type Tab = (typeof TABS)[number];

function query(params: Record<string, string | null>): string {
  const sp = new URLSearchParams();
  for (const [key, v] of Object.entries(params)) if (v) sp.set(key, v);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function trafficHref(tab: Tab, range: Range, all: boolean): string {
  return `/admin/traffic${query({ tab: tab === "overview" ? null : tab, range: range === "d7" ? null : range, all: all ? "1" : null })}`;
}

export function clicksPageHref(path: string, device: "mobile" | "desktop", range: Range, all: boolean): string {
  return `/admin/traffic/clicks${query({ path, device: device === "mobile" ? null : device, range: range === "d7" ? null : range, all: all ? "1" : null })}`;
}

/* ── Names ──────────────────────────────────────────────────────────────── */

type Words = Messages["admin"]["traffic"];

const BRANDS: Record<string, string> = {
  facebook: "Facebook",
  messenger: "Messenger",
  instagram: "Instagram",
  google: "Google",
  whatsapp: "WhatsApp",
  tiktok: "TikTok",
  snapchat: "Snapchat",
  linkedin: "LinkedIn",
  bing: "Bing",
  x: "X",
};

export function pageName(w: Words, path: string): string {
  return (w.pageNames as Record<string, string>)[path] ?? path;
}

export function sourceName(w: Words, k: string | null | undefined): string {
  if (!k || k === "direct") return w.direct;
  return BRANDS[k] ?? k;
}

/** A browser or the app a link was opened in. */
export function appName(w: Words, k: string | null | undefined): string {
  if (!k || k === "unknown") return w.unknown;
  return BRANDS[k] ?? k;
}

export function deviceName(w: Words, k: string | null | undefined): string {
  return (w.device as Record<string, string>)[k ?? "unknown"] ?? w.unknown;
}

export function roleName(w: Words, k: string | null | undefined): string {
  return (w.roles as Record<string, string>)[k ?? "visitor"] ?? k ?? w.roles.visitor;
}

export function countryName(locale: Locale, code: string | null | undefined, w: Words): string {
  if (!code || code === "unknown") return w.unknown;
  try {
    return new Intl.DisplayNames([INTL[locale]], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function duration(w: Words, seconds: number | null | undefined): string {
  const s = Math.max(0, Math.round(Number(seconds ?? 0)));
  if (s < 60) return fmt(w.sec, { n: s });
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r && m < 10 ? fmt(w.min, { m, s: r }) : fmt(w.minOnly, { m });
}

/** "Visiteur 3f9a" — the same browser keeps the same four characters. */
export function visitorLabel(w: Words, visitor: string | null | undefined): string {
  return visitor ? `${w.visitor} ${visitor.slice(0, 4)}` : w.visitor;
}

export function personLabel(w: Words, user: TrafficPerson | null | undefined, visitor: string | null | undefined): string {
  if (user) return user.name || user.phone || user.business || roleName(w, user.role);
  return visitorLabel(w, visitor);
}

/* ── Colour: one hue for magnitude, the brand's own ramp ─────────────────────── */

/** Validated sequential steps (light → dark) for counts; zero keeps the empty colour. */
export const HEAT_STEPS = ["#b9a1fc", "#9a76f7", "#7c50ee", "#5328c4", "#3a207f"] as const;
export const HEAT_EMPTY = "#f1f0f5";
export const BAR = "#6535e0";

export function heatColor(n: number, max: number): string {
  if (!n || max <= 0) return HEAT_EMPTY;
  const step = Math.min(HEAT_STEPS.length, Math.max(1, Math.ceil((n / max) * HEAT_STEPS.length)));
  return HEAT_STEPS[step - 1]!;
}
