import { NextResponse } from "next/server";
import { pretty } from "@/lib/phone";
import { call } from "@/lib/supabase";
import { fill, stampsN, t } from "@/lib/t";
import { workbook, type Cell } from "@/lib/xlsx";

export const dynamic = "force-dynamic";

type Row = { name: string | null; phone: string | null; stamps: number; goal: number | null; total: number; given: number; waiting: number; since: string | null; last_at: string | null; reset_due: string | null; item?: string | null };
type Month = { month: string; customers: number; stamps: number; gifts: number };
/** one tampon: how it came — «qr» the counter's code, «link» a link, «number» given by number */
type Way = "qr" | "link" | "number";
type Stamp = { at: string; name: string | null; phone: string | null; via: Way; item: string | null; label: string | null };
type Export = { ok: boolean; error?: string; next?: string; shop?: string; goal?: number | null; gift?: string | null; items_on?: boolean; rows?: Row[]; months?: Month[]; stamps?: Stamp[] };

const DAY = 86_400_000;
const X = t.xl;
const WAYS: Way[] = ["qr", "link", "number"];
const WAY: Record<Way, string> = { qr: X.viaQr, link: X.viaLink, number: X.viaNumber };
/** the database's cap on the tampons sheet (supabase/schema.sql, my_export) */
const CAP = 50_000;
const refuse = (status: number, error?: string, next?: string) => NextResponse.json({ ok: false, error, next }, { status, headers: { "Cache-Control": "no-store" } });

/**
 * «تحميل البيانات»: the owner's customers as an Excel file — asked as the owner (the database only ever
 * answers with their own shop's), only for a shop the founder allowed it from the console (export_allowed),
 * and once a week (the founder, 8 Nov 2026: «add the phone number of the client … more structured … how
 * many tampons he had … he can only export once every week»: supabase/schema.sql, my_export).
 *
 * Four sheets: «ملخّص», the shop in a few numbers; «الحرفاء», one line per customer (never the owner's own
 * card), the whole number, the card now and how far from its gift, every tampon and gift, when they came,
 * whether they still come, and — with the card's clock on — when the card goes back to zero; «كل تامبون»,
 * every tampon on its own line (the founder, 9 Nov 2026: «track what I sold, so I can filter the Excel …
 * the tampons with the QR and the links, and what I sold exactly»): when, who, how it came — the counter's
 * QR code, a link (and who the link was made for), or by number — and, in a shop that says what it sells,
 * what it was for; «كل شهر», the shop month by month.
 */
export async function GET() {
  const res = await call<Export>("my_export");
  if (!res) return refuse(503, "network");
  if (!res.ok) {
    if (res.error === "too_soon") return refuse(429, "too_soon", res.next);
    return refuse(res.error === "not_allowed" ? 403 : 401, res.error);
  }

  const now = Date.now();
  const rows = res.rows ?? [];
  const months = res.months ?? [];
  /** whole days since a moment */
  const ago = (iso: string | null) => (iso ? Math.max(0, Math.floor((now - Date.parse(iso)) / DAY)) : null);
  const within = (iso: string | null, days: number) => !!iso && now - Date.parse(iso) <= days * DAY;
  /** tampons still to go before the gift (0: the card is full, its gift waiting) */
  const left = (r: Row) => (r.goal ? Math.max(0, r.goal - r.stamps) : null);
  const sum = (f: (r: Row) => number) => rows.reduce((n, r) => n + (f(r) || 0), 0);
  const best = rows.reduce<Row | null>((b, r) => (r.total > (b?.total ?? 0) ? r : b), null);
  const clock = rows.some((r) => !!r.reset_due);
  const stamps = res.stamps ?? [];
  // what it was for: a shop that says what it sells, or did once
  const items = !!res.items_on || stamps.some((s) => !!s.item) || rows.some((r) => !!r.item);
  // who a link was for: only when the owner wrote it on one
  const labels = stamps.some((s) => !!s.label);
  const byWay = WAYS.map((w) => [w, stamps.filter((s) => s.via === w).length] as const).filter(([, n]) => n > 0);
  const sold = [...stamps.reduce((m, s) => (s.item ? m.set(s.item, (m.get(s.item) ?? 0) + 1) : m), new Map<string, number>())].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ar"));

  // ① the shop in a few numbers
  const summary: Cell[][] = [
    [{ bold: res.shop ?? "", big: true }],
    [X.made, { at: new Date(now).toISOString(), time: true }],
    ...(res.goal ? [[X.card, fill(X.cardIs, { stamps: stampsN(res.goal), gift: res.gift ?? "" })] as Cell[]] : []),
    [],
    [{ bold: X.count }, rows.length],
    [{ bold: X.active }, rows.filter((r) => within(r.last_at, 30)).length],
    [{ bold: X.fresh }, rows.filter((r) => within(r.since, 30)).length],
    [{ bold: X.away }, rows.filter((r) => !!r.last_at && !within(r.last_at, 60)).length],
    [{ bold: X.near }, rows.filter((r) => left(r) === 1).length],
    [],
    [{ bold: X.stamps }, sum((r) => r.total)],
    [{ bold: X.given }, sum((r) => r.given)],
    [{ bold: X.waiting }, sum((r) => r.waiting)],
    ...(best ? [[{ bold: X.best }, fill(X.bestIs, { name: best.name ?? "—", n: stampsN(best.total) })] as Cell[]] : []),
    // how the tampons came, and what sold — the same counts the «كل تامبون» sheet filters to
    ...(byWay.length ? [[], [{ bold: X.ways }] as Cell[], ...byWay.map(([w, n]) => [WAY[w], n] as Cell[])] : []),
    ...(sold.length ? [[], [{ bold: X.sold }] as Cell[], ...sold.map(([name, n]) => [name, n] as Cell[])] : []),
    ...(stamps.length >= CAP ? [[], [fill(X.capped, { n: String(CAP) })] as Cell[]] : []),
    [],
    ...(res.next ? [[{ bold: X.next }, { at: res.next, time: true }] as Cell[]] : []),
  ];

  // ② one line per customer, the latest first
  const head = [X.name, X.phone, X.now, X.left, X.total, X.got, X.wait, X.first, X.last, X.days, X.state, ...(clock ? [X.reset] : []), ...(items ? [X.favourite] : [])];
  const list: Cell[][] = rows.map((r) => [
    r.name ?? "—",
    r.phone ? { ltr: pretty(r.phone) } : null,
    r.stamps,
    left(r),
    r.total,
    r.given,
    r.waiting,
    { at: r.since },
    { at: r.last_at, time: true },
    ago(r.last_at),
    !r.last_at ? X.none : within(r.last_at, 30) ? X.on : X.off,
    ...(clock ? [{ at: r.reset_due }] : []),
    ...(items ? [r.item ?? null] : []),
  ]);

  // ③ every tampon, the latest first: a filter on each column (how it came, what it was for, a day, a customer)
  const tHead = [X.when, X.name, X.phone, X.way, ...(items ? [X.what] : []), ...(labels ? [X.linkFor] : [])];
  const tList: Cell[][] = stamps.map((s) => [
    { at: s.at, time: true },
    s.name ?? "—",
    s.phone ? { ltr: pretty(s.phone) } : null,
    WAY[s.via] ?? X.viaNumber,
    ...(items ? [s.item ?? null] : []),
    ...(labels ? [s.label ?? null] : []),
  ]);

  // ④ month by month, the latest first
  const byMonth: Cell[][] = months.map((m) => [m.month, m.customers, m.stamps, m.gifts]);

  const file = workbook([
    { name: X.summary, rows: summary, widths: [30, 34] },
    { name: X.customers, head, rows: list, widths: [22, 17, 13, 13, 13, 13, 13, 13, 17, 14, 16, ...(clock ? [17] : []), ...(items ? [20] : [])] },
    { name: X.tampons, head: tHead, rows: tList, widths: [17, 22, 17, 13, ...(items ? [20] : []), ...(labels ? [24] : [])] },
    { name: X.months, head: [X.month, X.newOnes, X.monthStamps, X.won], rows: byMonth, widths: [12, 13, 13, 15] },
  ]);
  const day = new Date(now).toLocaleDateString("sv-SE", { timeZone: "Africa/Tunis" });
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="pointili-clients-${day}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
