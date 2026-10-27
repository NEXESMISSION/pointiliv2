"use client";

import { useState } from "react";
import type { Day, Split, Stats } from "@/lib/stats";
import { t } from "@/lib/t";

type Period = { id: string; label: string; stats: Stats };
type Money = { all: number; out: number; month: number; outMonth: number };

const dt = (n: number) => new Intl.NumberFormat("fr-TN", { maximumFractionDigits: 0 }).format(Math.round(n));
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const dayLong = new Intl.DateTimeFormat("ar-TN-u-nu-latn", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Tunis" });
const said = (day: string) => dayLong.format(new Date(`${day}T12:00:00Z`));
const CARD = "rounded-[1.125rem] bg-surface p-4 shadow-card ring-1 ring-line/70";

/**
 * The console's numbers (the founder, 27 Oct 2026: «a simple analytics page»),
 * one column on the phone: the period on top, six numbers, the road from
 * signing up to paying with the step where most shops fall, the last two
 * weeks day by day (tap a day), the money, then who the shops are — where
 * they came from, what they sell, when they signed up, whether they were
 * called — each with how many use it and how many paid.
 */
export function AdminStats({ periods, days, money }: { periods: Period[]; days: Day[]; money: Money }) {
  const [id, setId] = useState("month");
  const s = (periods.find((p) => p.id === id) ?? periods[0]).stats;
  const net = money.all - money.out;

  return (
    <div>
      <h1 className="text-[1.5rem] font-bold text-ink">الأرقام</h1>

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="tablist" aria-label="المدّة">
        {periods.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={id === p.id}
            onClick={() => setId(p.id)}
            className={`flex h-9 shrink-0 items-center rounded-full px-3.5 text-[0.875rem] font-semibold transition-colors ${id === p.id ? "bg-ink text-white" : "bg-surface text-body ring-1 ring-line"}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          { n: s.shops, label: "محلات سجّلو", tone: "text-ink" },
          { n: s.used, label: `يخدمو بجد · ${pct(s.used, s.shops)}%`, tone: "text-brand" },
          { n: s.paid, label: "خلّصو", tone: "text-mint" },
          { n: s.customers, label: "كليان حقيقيين", tone: "text-ink" },
          { n: s.stamps, label: "تامبونات", tone: "text-ink" },
          { n: s.returning, label: "كليان رجعو", tone: s.returning ? "text-mint" : "text-ink" },
        ].map((x) => (
          <div key={x.label} className="rounded-[1rem] bg-surface px-3 py-2.5 shadow-card ring-1 ring-line/70">
            <b className={`num block text-[1.25rem] leading-tight ${x.tone}`}>{dt(x.n)}</b>
            <span className="text-[0.75rem] font-semibold text-muted">{x.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 space-y-3">
        <Road stats={s} />
        <Columns title="محلات جديدة كل نهار" days={days} value={(d) => d.opened} tone="bg-brand" />
        <Columns title="تامبونات كل نهار" days={days} value={(d) => d.stamps} tone="bg-mint" />

        <section className={CARD}>
          <h2 className="text-[1rem] font-bold text-ink">الفلوس</h2>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            {[
              { n: money.all, label: "دخل من الأول", tone: "text-mint" },
              { n: money.out, label: "خرج من الأول", tone: "text-coral" },
              { n: net, label: "الصافي", tone: net < 0 ? "text-coral" : "text-mint" },
            ].map((x) => (
              <div key={x.label} className="rounded-[0.875rem] bg-canvas/70 px-2 py-2.5">
                {/* the sign stays on the number's left: only the number is left to right */}
                <b className={`block text-[1.125rem] leading-tight ${x.tone}`}>
                  <span className="num">{x.n < 0 ? `−${dt(-x.n)}` : dt(x.n)}</span> {t.payCurrency}
                </b>
                <span className="text-[0.75rem] font-semibold text-muted">{x.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[0.8125rem] text-body">
            هالشهر: دخل <b className="num text-ink">{dt(money.month)}</b> {t.payCurrency}، خرج <b className="num text-ink">{dt(money.outMonth)}</b> {t.payCurrency}
          </p>
        </section>

        {s.splits.map((x) => (
          <SplitCard key={x.title} split={x} />
        ))}

        <p className="px-1 text-[0.75rem] leading-relaxed text-faint">«يخدمو بجد»: جاهم كليان حقيقي، بتامبون بعد ساعة من نهار ما حلّو (اللي قبل تجارب). المحلات متاع التست موش محسوبة.</p>
      </div>
    </div>
  );
}

/** From signing up to paying, step by step — the step that loses the most shops in coral. */
function Road({ stats }: { stats: Stats }) {
  const road = stats.road;
  const top = Math.max(1, road[0].n);
  // the biggest fall: the step that loses the most shops from the one before it
  let fall = 0;
  let lost = 0;
  for (let i = 1; i < road.length; i++) {
    const gone = road[i - 1].n - road[i].n;
    if (gone > lost) [fall, lost] = [i, gone];
  }
  return (
    <section className={CARD}>
      <h2 className="text-[1rem] font-bold text-ink">من التسجيل للخلاص</h2>
      <div className="mt-3 space-y-2">
        {road.map((step, i) => (
          <div key={step.label} className="grid grid-cols-[6.75rem_1fr_4.25rem] items-center gap-2.5">
            <span className={`text-[0.8125rem] font-semibold ${i === fall && lost ? "text-coral" : "text-body"}`}>{step.label}</span>
            <span className="h-3 overflow-hidden rounded-full bg-canvas">
              <span className={`block h-full rounded-full ${i === fall && lost ? "bg-coral" : i === road.length - 1 ? "bg-mint" : "bg-brand"}`} style={{ width: `${step.n ? Math.max(2, pct(step.n, top)) : 0}%` }} />
            </span>
            <span className="num text-left text-[0.8125rem] text-ink">
              <b>{dt(step.n)}</b> <span className="text-faint">{pct(step.n, top)}%</span>
            </span>
          </div>
        ))}
      </div>
      {lost > 0 && (
        <p className="mt-3 rounded-[0.75rem] bg-coral-soft px-3 py-2 text-[0.8125rem] font-semibold text-coral">
          أكبر طيحة: من «{road[fall - 1].label}» لـ«{road[fall].label}»، <span className="num">{dt(lost)}</span> محل.
        </p>
      )}
    </section>
  );
}

/** Fourteen days as columns, today at the end (time runs left to right, as on the board); a tap reads one day. */
function Columns({ title, days, value, tone }: { title: string; days: Day[]; value: (d: Day) => number; tone: string }) {
  const [at, setAt] = useState(days.length - 1);
  const max = Math.max(1, ...days.map(value));
  const total = days.reduce((a, d) => a + value(d), 0);
  const day = days[at];
  return (
    <section className={CARD}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[1rem] font-bold text-ink">{title}</h2>
        <span className="shrink-0 text-[0.75rem] font-semibold text-muted">
          <b className="num text-ink">{dt(total)}</b> في 14 يوم
        </span>
      </div>
      <p className="mt-0.5 text-[0.8125rem] text-body">
        {at === days.length - 1 ? "اليوم" : said(day.day)}: <b className="num text-ink">{dt(value(day))}</b>
      </p>
      <div dir="ltr" className="mt-2 flex h-24 items-end gap-[3px]">
        {days.map((d, i) => {
          const n = value(d);
          return (
            <button key={d.day} type="button" onClick={() => setAt(i)} aria-label={`${said(d.day)}: ${n}`} aria-pressed={i === at} className="flex h-full flex-1 items-end">
              <span className={`block w-full rounded-t-[4px] transition-opacity ${n ? `${tone} ${i === at ? "" : "opacity-40"}` : "bg-line"}`} style={{ height: n ? `${Math.max(6, (n / max) * 100)}%` : "2px" }} />
            </button>
          );
        })}
      </div>
      <p className="mt-1 flex justify-between text-[0.625rem] text-faint">
        <span>اليوم</span>
        <span>قبل أسبوعين</span>
      </p>
    </section>
  );
}

/** Shops put together by one thing: how many signed up, how many use it for real, how many paid. */
function SplitCard({ split }: { split: Split }) {
  if (!split.rows.length) return null;
  const top = Math.max(1, ...split.rows.map((r) => r.n));
  return (
    <section className={CARD}>
      <h2 className="text-[1rem] font-bold text-ink">{split.title}</h2>
      <div className="mt-2 grid grid-cols-[1fr_2.75rem_4.5rem_2.75rem] gap-x-2 border-b border-line pb-1.5 text-[0.6875rem] font-semibold text-faint">
        <span />
        <span className="text-center">سجّلو</span>
        <span className="text-center">يخدمو</span>
        <span className="text-center">خلّصو</span>
      </div>
      {split.rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[1fr_2.75rem_4.5rem_2.75rem] items-center gap-x-2 border-b border-line/60 py-2 last:border-0">
          <span className="min-w-0">
            <bdi className="block truncate text-[0.875rem] font-semibold text-ink">{r.label}</bdi>
            <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-canvas">
              <span className="block h-full rounded-full bg-brand/50" style={{ width: `${Math.max(3, pct(r.n, top))}%` }} />
            </span>
          </span>
          <b className="num text-center text-[0.875rem] text-ink">{dt(r.n)}</b>
          <span className="num text-center text-[0.8125rem] text-ink">
            {dt(r.real)} <span className={pct(r.real, r.n) >= 20 ? "text-mint" : "text-faint"}>{pct(r.real, r.n)}%</span>
          </span>
          <b className={`num text-center text-[0.875rem] ${r.paid ? "text-mint" : "text-faint"}`}>{dt(r.paid)}</b>
        </div>
      ))}
    </section>
  );
}
