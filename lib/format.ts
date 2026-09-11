export const TZ = "Africa/Tunis";

export function greeting(date = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: TZ }).format(date));
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good evening";
}

export function formatDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = {}): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: TZ, ...opts }).format(
    new Date(iso),
  );
}

export function formatLongDate(iso: string | null | undefined): string {
  return formatDate(iso, { month: "long" });
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(iso));
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}

/** Calendar day key in Tunis time, e.g. "2026-09-10". */
export function dayKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));
}

export function dayLabel(iso: string, now = new Date()): string {
  const k = dayKey(iso);
  if (k === dayKey(now.toISOString())) return "Today";
  if (k === dayKey(new Date(now.getTime() - 86400000).toISOString())) return "Yesterday";
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: TZ }).format(new Date(iso));
}

export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "never";
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return formatDate(iso);
}

export function formatNumber(n: number | null | undefined): string {
  return new Intl.NumberFormat("en-US").format(Number(n ?? 0));
}

export function formatTND(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(v)} TND`;
}

export function pctChange(cur: number, prev: number): number | null {
  if (!prev) return cur ? null : 0;
  return Math.round(((cur - prev) / prev) * 100);
}

export function initials(name: string | null | undefined, fallback = "P"): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback;
  return (parts[0]![0]! + (parts[1]?.[0] ?? "")).toUpperCase();
}
