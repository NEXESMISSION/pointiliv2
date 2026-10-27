import type { BoardShop } from "@/lib/board";
import { t } from "@/lib/t";

/*
 * The console's numbers (/admin/stats, 27 Oct 2026: «a simple analytics
 * page»): the shops opened in a period as one road from signing up to
 * paying, where they came from and what they are, and the last two weeks
 * day by day. All of it read from admin_board's lines — no query of its own.
 */

const TZ = "Africa/Tunis";
const DAY = 86_400_000;
const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const hourOf = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" });
const hour = (iso: string) => Number(hourOf.format(new Date(iso)));

/** a step of the road, and how many shops got there */
export type Step = { label: string; n: number };
/** shops put together by one thing (where from, what kind…): how many, how many in use, how many paid */
export type Row = { label: string; n: number; real: number; paid: number };
export type Split = { title: string; rows: Row[] };
export type Stats = {
  shops: number;
  /** shops with a real customer, real customers, tampons, customers back on another day */
  used: number;
  customers: number;
  stamps: number;
  returning: number;
  paid: number;
  road: Step[];
  splits: Split[];
};
/** one day of the last two weeks (Tunis): its date, the shops opened, the tampons given */
export type Day = { day: string; opened: number; stamps: number };

/** Where the shop's owner came from on his first visit: the ad by its test's name, else the place. */
export function sourceOf(s: BoardShop) {
  const ad = s.x.camp?.match(/TEST\s?\d+/i)?.[0];
  if (ad) return `إعلان ${ad.toUpperCase().replace(/\s/, "")}`;
  if (s.x.camp) return "إعلان";
  return { facebook: "فيسبوك", ig: "إنستغرام", instagram: "إنستغرام", google: "غوغل", direct: "مباشر" }[s.x.src ?? ""] ?? s.x.src ?? "ما نعرفوش";
}

/** The shops put together by `key`, the biggest first; past `top`, the rest in one line. */
function split(title: string, shops: BoardShop[], key: (s: BoardShop) => string, top = 7): Split {
  const by = new Map<string, Row>();
  for (const s of shops) {
    const label = key(s);
    const row = by.get(label) ?? { label, n: 0, real: 0, paid: 0 };
    row.n += 1;
    if (s.real > 0) row.real += 1;
    if (s.paid) row.paid += 1;
    by.set(label, row);
  }
  const rows = [...by.values()].sort((a, b) => b.n - a.n || b.paid - a.paid);
  if (rows.length <= top + 1) return { title, rows };
  const rest = rows.slice(top).reduce((a, r) => ({ ...a, n: a.n + r.n, real: a.real + r.real, paid: a.paid + r.paid }), { label: "أخرى", n: 0, real: 0, paid: 0 });
  return { title, rows: [...rows.slice(0, top), rest] };
}

/** The shops opened since `from` (all of them when null), read as one. */
export function statsOf(all: BoardShop[], from: number | null): Stats {
  const shops = from === null ? all : all.filter((s) => Date.parse(s.created_at) >= from);
  const count = (test: (s: BoardShop) => boolean) => shops.filter(test).length;
  const sum = (n: (s: BoardShop) => number) => shops.reduce((a, s) => a + n(s), 0);
  const kinds = t.kinds as Record<string, string>;
  return {
    shops: shops.length,
    used: count((s) => s.real > 0),
    customers: sum((s) => s.real),
    stamps: sum((s) => s.stamps),
    returning: sum((s) => s.returning),
    paid: count((s) => s.paid),
    road: [
      { label: "سجّلو", n: shops.length },
      { label: "عملو الكارطة", n: count((s) => s.card) },
      { label: "حلّو الـQR", n: count((s) => s.x.v_qr > 0 || s.x.scans > 0 || s.stamps > 0) },
      { label: "جاهم كليان", n: count((s) => s.customers > 0) },
      { label: "كليان حقيقي", n: count((s) => s.real > 0) },
      { label: "5 كليان وأكثر", n: count((s) => s.real >= 5) },
      { label: "خلّصو", n: count((s) => s.paid) },
    ],
    splits: [
      split("منين جاو", shops, sourceOf),
      split("شنوّة المحل", shops, (s) => kinds[s.kind] ?? s.kind),
      // the evening and the night: the owner alone, the shop closed, nobody to scan
      split("وقتاش سجّلو (النهار من 8 لـ19)", shops, (s) => (hour(s.created_at) >= 8 && hour(s.created_at) < 19 ? "في النهار" : "في الليل")),
      split("كلّمتهم؟", shops, (s) => (s.stage && s.stage !== "new" ? "إيه" : "لا")),
      split("ركّبو الأبليكاسيون؟", shops, (s) => (s.app ? "إيه" : "لا")),
      split("التليفون", shops, (s) => s.x.os ?? "ما نعرفوش", 4),
      split("المدينة", shops, (s) => s.x.city ?? "ما نعرفوش", 5),
    ],
  };
}

/** The last 14 days, oldest first, today last: the shops opened each day and the tampons given (admin_board's spark). */
export function daysOf(all: BoardShop[], now: number): Day[] {
  const days = Array.from({ length: 14 }, (_, i) => ({ day: dayKey.format(new Date(now - (13 - i) * DAY)), opened: 0, stamps: 0 }));
  const at = new Map(days.map((d, i) => [d.day, i]));
  for (const s of all) {
    const i = at.get(dayKey.format(new Date(s.created_at)));
    if (i !== undefined) days[i].opened += 1;
    // the spark ends today: lined up from its end
    const spark = s.spark ?? [];
    spark.forEach((n, j) => {
      const d = days[days.length - spark.length + j];
      if (d) d.stamps += n;
    });
  }
  return days;
}
