import { DEFAULT_LOCALE, INTL, type Locale } from "@/lib/i18n/config";
import { fmt, plural } from "@/lib/i18n/dict";
import { messagesFor } from "@/lib/i18n/messages";

export const TZ = "Africa/Tunis";

const words = (locale: Locale) => messagesFor(locale).formats;

export function greeting(locale: Locale = DEFAULT_LOCALE, date = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: TZ }).format(date));
  const w = words(locale);
  if (hour >= 5 && hour < 12) return w.greetingMorning;
  if (hour >= 12 && hour < 18) return w.greetingAfternoon;
  return w.greetingEvening;
}

export function formatDate(iso: string | null | undefined, locale: Locale = DEFAULT_LOCALE, opts: Intl.DateTimeFormatOptions = {}): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(INTL[locale], { day: "numeric", month: "short", year: "numeric", timeZone: TZ, ...opts }).format(new Date(iso));
}

export function formatLongDate(iso: string | null | undefined, locale: Locale = DEFAULT_LOCALE): string {
  return formatDate(iso, locale, { month: "long" });
}

export function formatTime(iso: string, locale: Locale = DEFAULT_LOCALE): string {
  return new Intl.DateTimeFormat(INTL[locale], { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(iso));
}

export function formatDateTime(iso: string | null | undefined, locale: Locale = DEFAULT_LOCALE): string {
  if (!iso) return "—";
  return `${formatDate(iso, locale)} · ${formatTime(iso, locale)}`;
}

/** Calendar day key in Tunis time, e.g. "2026-09-10". */
export function dayKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));
}

export function dayLabel(iso: string, locale: Locale = DEFAULT_LOCALE, now = new Date()): string {
  const k = dayKey(iso);
  const w = words(locale);
  if (k === dayKey(now.toISOString())) return w.today;
  if (k === dayKey(new Date(now.getTime() - 86400000).toISOString())) return w.yesterday;
  return new Intl.DateTimeFormat(INTL[locale], { weekday: "long", day: "numeric", month: "long", timeZone: TZ }).format(new Date(iso));
}

export function timeAgo(iso: string | null | undefined, locale: Locale = DEFAULT_LOCALE, now = Date.now()): string {
  const w = words(locale);
  if (!iso) return w.never;
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 45) return w.justNow;
  const m = Math.round(s / 60);
  if (m < 60) return fmt(w.minutesAgo, { n: m });
  const h = Math.round(m / 60);
  if (h < 24) return fmt(w.hoursAgo, { n: h });
  const d = Math.round(h / 24);
  if (d < 30) return plural(w.daysAgo, d, locale);
  return formatDate(iso, locale);
}

export function formatNumber(n: number | null | undefined, locale: Locale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(INTL[locale]).format(Number(n ?? 0));
}

export function formatTND(n: number | string | null | undefined, locale: Locale = DEFAULT_LOCALE): string {
  const v = Number(n ?? 0);
  return `${new Intl.NumberFormat(INTL[locale], { maximumFractionDigits: 2 }).format(v)} ${words(locale).currency}`;
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

/** Whole days left before an instant, rounded up: the last day still counts. */
export const daysUntil = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
