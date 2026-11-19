"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowDownLeft, ArrowUpRight, Check, Pencil, Plus, Repeat, Search, Trash2, X } from "lucide-react";
import { adminFixedDrop, adminFixedPay, adminFixedSave } from "@/app/admin/actions";
import { AdminBookAdd, AdminBookDelete } from "@/components/AdminTools";
import { daysBetween, fixedDinars, monthEnd, monthStart, USD_TND, type FixedCost, type MoneyLine } from "@/lib/money";
import { daysN, monthsSaid, t } from "@/lib/t";

const CARD = "rounded-[1.125rem] bg-surface p-4 shadow-card ring-1 ring-line/70";
const FIELD = "h-10 w-full rounded-[0.75rem] bg-canvas px-3 text-[0.9375rem] text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand";
const CHIP = "h-8 shrink-0 rounded-full px-3 text-[0.8125rem] font-bold transition-colors";
// 1 440, not 1440; 47,35 when there are millimes
const dt = (n: number) => new Intl.NumberFormat("fr-TN", { maximumFractionDigits: 3 }).format(Math.round(n * 1000) / 1000);
const dt0 = (n: number) => new Intl.NumberFormat("fr-TN", { maximumFractionDigits: 0 }).format(Math.round(n));
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${dt0(Math.abs(n))}`;
const at = (d: string) => new Date(`${d}T12:00:00Z`);
const monthLong = (ym: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { month: "long", year: "numeric", timeZone: "UTC" }).format(at(`${ym}-15`));
const monthShort = (ym: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { month: "short", timeZone: "UTC" }).format(at(`${ym}-15`));
const daySaid = (d: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "short", timeZone: "UTC" }).format(at(d));

/** what each kind is called: the shops' subscriptions, then the books' own kinds */
const KIND: Record<string, string> = { shop: "أبونمانات المحلات", ...t.aBookKinds };
const OUT_KINDS = ["ads", "tools", "print", "move", "people", "other"];
const IN_KINDS = ["shop", "sub", "service", "other"];

type Period = "month" | "last" | "3m" | "year" | "all" | "custom";
const PERIODS: { id: Period; label: string }[] = [
  { id: "month", label: "هالشهر" },
  { id: "last", label: "الشهر اللي فات" },
  { id: "3m", label: "3 شهور" },
  { id: "year", label: "هالعام" },
  { id: "all", label: "من الأوّل" },
  { id: "custom", label: "مخصّص" },
];

/** The days a period covers, both ends in. */
function rangeOf(p: Period, today: string, from: string, to: string): [string, string] {
  if (p === "month") return [monthStart(today), today];
  if (p === "last") {
    const s = monthStart(today, 1);
    return [s, monthEnd(s)];
  }
  if (p === "3m") return [monthStart(today, 2), today];
  if (p === "year") return [`${today.slice(0, 4)}-01-01`, today];
  if (p === "custom") return [from || "0000-01-01", to || "9999-12-31"];
  return ["0000-01-01", "9999-12-31"];
}
const total = (ls: MoneyLine[], side: "in" | "out") => ls.reduce((a, l) => (l.side === side ? a + l.amount : a), 0);

/**
 * The money, its own page in the console (the founder, 19 Nov 2026: «make sure the money has its own page, more
 * filters, something advanced, super clear, very modern»). From the top: the period; what came in, what went
 * out and what is left; the fixed costs, each with its countdown and «خلّصت»; six months side by side; where
 * the money went and where it came from; and every line, filtered by side, kind, words and fixed costs, by
 * month or the biggest first — with a line to write by hand.
 */
export function AdminMoney({ lines, fixed, today }: { lines: MoneyLine[]; fixed: FixedCost[]; today: string }) {
  const [period, setPeriod] = useState<Period>("month");
  const [from, setFrom] = useState(() => monthStart(today, 1));
  const [to, setTo] = useState(today);
  const [side, setSide] = useState<"all" | "in" | "out">("all");
  const [kinds, setKinds] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [fixedOnly, setFixedOnly] = useState(false);
  const [sort, setSort] = useState<"new" | "big">("new");
  const [lo, hi] = rangeOf(period, today, from, to);

  const inPeriod = useMemo(() => lines.filter((l) => l.day >= lo && l.day <= hi), [lines, lo, hi]);
  const pin = total(inPeriod, "in");
  const pout = total(inPeriod, "out");
  const shown = useMemo(() => {
    const words = q.trim().toLowerCase();
    const ls = inPeriod.filter(
      (l) => (side === "all" || l.side === side) && (kinds.length === 0 || kinds.includes(l.kind)) && (!fixedOnly || l.fixed !== null) && (!words || `${l.label} ${l.detail}`.toLowerCase().includes(words)),
    );
    return sort === "big" ? [...ls].sort((a, b) => b.amount - a.amount) : ls;
  }, [inPeriod, side, kinds, fixedOnly, q, sort]);
  const chips = (side === "in" ? IN_KINDS : side === "out" ? OUT_KINDS : [...IN_KINDS, ...OUT_KINDS.filter((k) => k !== "other")]).filter((k) => inPeriod.some((l) => l.kind === k));
  const filters = (side !== "all" ? 1 : 0) + kinds.length + (q.trim() ? 1 : 0) + (fixedOnly ? 1 : 0) + (sort !== "new" ? 1 : 0);
  const reset = () => {
    setSide("all");
    setKinds([]);
    setQ("");
    setFixedOnly(false);
    setSort("new");
  };
  // by month, newest first (the biggest-first order is one list)
  const groups = useMemo(() => {
    if (sort === "big") return [{ ym: "", lines: shown }];
    const out: { ym: string; lines: MoneyLine[] }[] = [];
    for (const l of shown) {
      const ym = l.day.slice(0, 7);
      if (out.at(-1)?.ym !== ym) out.push({ ym, lines: [] });
      out.at(-1)!.lines.push(l);
    }
    return out;
  }, [shown, sort]);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-[1.5rem] font-bold text-ink">الفلوس</h1>
        <span className="rounded-full bg-surface px-3 py-1 text-[0.75rem] font-semibold text-muted ring-1 ring-line">
          <bdi dir="ltr">1$ = {USD_TND}</bdi> {t.payCurrency}
        </span>
      </div>

      {/* the period: everything under it follows */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="tablist" aria-label="المدّة">
        {PERIODS.map((p) => (
          <button key={p.id} type="button" role="tab" aria-selected={period === p.id} onClick={() => setPeriod(p.id)} className={`${CHIP} h-9 px-3.5 ${period === p.id ? "bg-ink text-white" : "bg-surface text-body ring-1 ring-line"}`}>
            {p.label}
          </button>
        ))}
      </div>
      {period === "custom" && (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[0.75rem] font-semibold text-muted">
            من
            <input type="date" value={from} max={to || today} onChange={(e) => setFrom(e.target.value)} dir="ltr" className={`${FIELD} mt-1`} />
          </label>
          <label className="text-[0.75rem] font-semibold text-muted">
            لين
            <input type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} dir="ltr" className={`${FIELD} mt-1`} />
          </label>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <Tile label="دخل" value={`+${dt0(pin)}`} tone="text-mint" />
        <Tile label="خرج" value={`−${dt0(pout)}`} tone="text-coral" />
        <Tile label="الصافي" value={signed(pin - pout)} tone={pin - pout >= 0 ? "text-mint" : "text-coral"} strong />
      </div>

      <FixedCard fixed={fixed} today={today} />
      <MonthsChart lines={lines} today={today} />

      {(pin > 0 || pout > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Split title="وين مشات الفلوس" tone="bg-coral" rows={OUT_KINDS.map((k) => ({ label: KIND[k] ?? k, n: total(inPeriod.filter((l) => l.kind === k), "out") }))} />
          <Split title="منين جات الفلوس" tone="bg-mint" rows={IN_KINDS.map((k) => ({ label: KIND[k] ?? k, n: total(inPeriod.filter((l) => l.kind === k), "in") }))} />
        </div>
      )}

      {/* every line, with its filters */}
      <section className={CARD}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[1rem] font-bold text-ink">الخطوط</h2>
          {filters > 0 && (
            <button type="button" onClick={reset} className="flex items-center gap-1 text-[0.8125rem] font-bold text-brand">
              <X className="size-4" /> امسح الفلاتر ({filters})
            </button>
          )}
        </div>
        <div className="mt-2.5 flex gap-2">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value.slice(0, 40))} placeholder="لوّج: محل، إشهار، Vercel…" aria-label="لوّج" className={`${FIELD} ps-9`} />
          </label>
          <button type="button" onClick={() => setSort(sort === "new" ? "big" : "new")} className={`h-10 shrink-0 rounded-[0.75rem] px-3 text-[0.8125rem] font-bold ring-1 ${sort === "big" ? "bg-ink text-white ring-ink" : "bg-surface text-body ring-line"}`}>
            {sort === "new" ? "الأجدد" : "الأكبر"}
          </button>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1 rounded-[0.75rem] bg-ink/[0.05] p-1">
          {(["all", "in", "out"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSide(s);
                setKinds([]);
              }}
              className={`h-9 rounded-[0.5rem] text-[0.8438rem] font-bold ${side === s ? "bg-surface text-ink shadow-sm" : "text-muted"}`}
            >
              {s === "all" ? "الكل" : s === "in" ? "دخل" : "خرج"}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {chips.map((k) => {
            const on = kinds.includes(k);
            return (
              <button key={k} type="button" aria-pressed={on} onClick={() => setKinds(on ? kinds.filter((x) => x !== k) : [...kinds, k])} className={`${CHIP} ${on ? "bg-ink text-white" : "bg-surface text-body ring-1 ring-line"}`}>
                {KIND[k] ?? k}
              </button>
            );
          })}
          {fixed.length > 0 && (
            <button type="button" aria-pressed={fixedOnly} onClick={() => setFixedOnly(!fixedOnly)} className={`${CHIP} flex items-center gap-1 ${fixedOnly ? "bg-brand text-white" : "bg-brand-soft text-brand"}`}>
              <Repeat className="size-3.5" /> الثابتة
            </button>
          )}
        </div>
        <p className="mt-2.5 text-[0.8125rem] text-muted">
          <b className="num text-ink">{shown.length}</b> خط · دخل <b className="num text-mint">+{dt0(total(shown, "in"))}</b> · خرج <b className="num text-coral">−{dt0(total(shown, "out"))}</b> {t.payCurrency}
        </p>
        <div className="mt-2.5">
          <AdminBookAdd today={today} />
        </div>
        {shown.length === 0 ? (
          <p className="mt-4 rounded-[0.875rem] bg-canvas/70 px-3 py-6 text-center text-[0.875rem] text-muted">ما فماش خطوط هنا. بدّل المدّة ولا الفلاتر.</p>
        ) : (
          groups.map((g) => (
            <div key={g.ym || "all"} className="mt-3">
              {g.ym && (
                <p className="flex items-baseline justify-between gap-2 border-b border-line pb-1.5 text-[0.8125rem]">
                  <b className="text-ink">{monthLong(g.ym)}</b>
                  <span className="text-muted">
                    <span className="num text-mint">+{dt0(total(g.lines, "in"))}</span> · <span className="num text-coral">−{dt0(total(g.lines, "out"))}</span>
                  </span>
                </p>
              )}
              <ul className="divide-y divide-line/60">
                {g.lines.map((l) => (
                  <Row key={l.key} l={l} />
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function Tile({ label, value, tone, strong = false }: { label: string; value: string; tone: string; strong?: boolean }) {
  return (
    <div className={`rounded-[1rem] px-3 py-2.5 shadow-card ring-1 ${strong ? "bg-ink ring-ink" : "bg-surface ring-line/70"}`}>
      <b className={`num block text-[1.25rem] leading-tight ${strong ? (value.startsWith("−") ? "text-[#FF9B85]" : "text-[#5BE3A3]") : tone}`}>
        <bdi dir="ltr">{value}</bdi>
      </b>
      <span className={`text-[0.75rem] font-semibold ${strong ? "text-white/70" : "text-muted"}`}>
        {label} · {t.payCurrency}
      </span>
    </div>
  );
}

/** One line: which way, what, when, how much — and the bin for a line written by hand. */
function Row({ l }: { l: MoneyLine }) {
  const inn = l.side === "in";
  return (
    <li className="flex items-center gap-2.5 py-2.5">
      <span className={`grid size-9 shrink-0 place-items-center rounded-full ${inn ? "bg-mint-soft text-mint" : "bg-coral-soft text-coral"}`}>{inn ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}</span>
      <span className="min-w-0 flex-1">
        <bdi className="block truncate text-[0.9375rem] font-semibold text-ink">{l.label}</bdi>
        <span className="flex items-center gap-1 truncate text-[0.75rem] text-muted">
          {daySaid(l.day)}
          {l.detail && <> · {l.detail}</>}
          {l.fixed !== null && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-brand-soft px-1.5 text-[0.6875rem] font-bold text-brand">
              <Repeat className="size-3" /> ثابت
            </span>
          )}
        </span>
      </span>
      <bdi dir="ltr" className={`num shrink-0 text-[0.9375rem] font-bold ${inn ? "text-mint" : "text-coral"}`}>
        {`${inn ? "+" : "−"}${dt(l.amount)}`}
      </bdi>
      {l.hand !== null && <AdminBookDelete id={l.hand} />}
    </li>
  );
}

/** Where the period's money went (or came from), kind by kind, the biggest first. */
function Split({ title, rows, tone }: { title: string; rows: { label: string; n: number }[]; tone: string }) {
  const kept = rows.filter((r) => r.n > 0).sort((a, b) => b.n - a.n);
  const sum = kept.reduce((a, r) => a + r.n, 0);
  if (!kept.length) return null;
  return (
    <section className={CARD}>
      <h2 className="text-[1rem] font-bold text-ink">{title}</h2>
      <div className="mt-2 space-y-2.5">
        {kept.map((r) => (
          <div key={r.label}>
            <p className="flex items-baseline justify-between gap-2 text-[0.8125rem]">
              <span className="font-semibold text-ink">{r.label}</span>
              <span className="text-muted">
                <b className="num text-ink">{dt0(r.n)}</b> {t.payCurrency} · <span className="num">{Math.round((r.n / sum) * 100)}%</span>
              </span>
            </p>
            <span className="mt-1 block h-2 overflow-hidden rounded-full bg-canvas">
              <span className={`block h-full rounded-full ${tone}`} style={{ width: `${Math.max(3, (r.n / sum) * 100)}%` }} />
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Six months side by side, this one last (time runs left to right): in and out, a tap reads one month. */
function MonthsChart({ lines, today }: { lines: MoneyLine[]; today: string }) {
  const data = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => monthStart(today, 5 - i).slice(0, 7)).map((ym) => {
        const ls = lines.filter((l) => l.day.startsWith(ym));
        return { ym, inn: total(ls, "in"), out: total(ls, "out") };
      }),
    [lines, today],
  );
  const [pick, setPick] = useState(data.length - 1);
  const max = Math.max(1, ...data.flatMap((d) => [d.inn, d.out]));
  const m = data[pick] ?? data[data.length - 1]!;
  return (
    <section className={CARD}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[1rem] font-bold text-ink">شهر بشهر</h2>
        <span className="text-[0.75rem] font-semibold text-muted">آخر 6 شهور</span>
      </div>
      <p className="mt-0.5 text-[0.8125rem] text-body">
        <b className="text-ink">{monthLong(m.ym)}</b>: دخل <b className="num text-mint">{dt0(m.inn)}</b> · خرج <b className="num text-coral">{dt0(m.out)}</b> · الصافي{" "}
        <b className={`num ${m.inn - m.out >= 0 ? "text-mint" : "text-coral"}`}>
          <bdi dir="ltr">{signed(m.inn - m.out)}</bdi>
        </b>
      </p>
      <div dir="ltr" className="mt-3 flex h-32 items-end gap-2">
        {data.map((d, i) => (
          <button key={d.ym} type="button" onClick={() => setPick(i)} aria-pressed={i === pick} aria-label={`${monthLong(d.ym)}: +${dt0(d.inn)} −${dt0(d.out)}`} className={`flex h-full flex-1 items-end justify-center gap-1 rounded-[0.5rem] transition-opacity ${i === pick ? "" : "opacity-45"}`}>
            <span className="block w-1/2 max-w-[1.25rem] rounded-t-[4px] bg-mint" style={{ height: d.inn ? `${Math.max(4, (d.inn / max) * 100)}%` : "2px" }} />
            <span className="block w-1/2 max-w-[1.25rem] rounded-t-[4px] bg-coral" style={{ height: d.out ? `${Math.max(4, (d.out / max) * 100)}%` : "2px" }} />
          </button>
        ))}
      </div>
      <div dir="ltr" className="mt-1 flex gap-2">
        {data.map((d) => (
          <span key={d.ym} className="flex-1 truncate text-center text-[0.6875rem] text-faint">
            {monthShort(d.ym)}
          </span>
        ))}
      </div>
    </section>
  );
}

const everySaid = (n: number) => `كل ${monthsSaid(n)}`;

/**
 * The fixed costs (19 Nov 2026: «stuff I pay monthly … I need to pay something, in the countdown for it, so I
 * can keep things neat and tracked»): each with the days left before it is due — coral once past, the day
 * itself in the brand's colour, the last week in amber — what it costs (its dollars too), how often, when it
 * was last paid. «خلّصت» writes the line in the books and moves the day a period on. Written, changed and
 * dropped here; what they come to in a month at the top.
 */
function FixedCard({ fixed, today }: { fixed: FixedCost[]; today: string }) {
  const [adding, setAdding] = useState(false);
  const monthly = fixed.reduce((a, f) => a + fixedDinars(f) / f.every, 0);
  const due = fixed.filter((f) => daysBetween(today, f.next_on) <= 7).length;
  return (
    <section className={CARD}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-[1rem] font-bold text-ink">
          <Repeat className="size-4 text-brand" /> المصاريف الثابتة
        </h2>
        {fixed.length > 0 && (
          <span className="text-[0.75rem] font-semibold text-muted">
            في الشهر ≈ <b className="num text-ink">{dt0(monthly)}</b> {t.payCurrency}
          </span>
        )}
      </div>
      {due > 0 && <p className="mt-1 text-[0.8125rem] font-semibold text-coral">{due === 1 ? "واحد يستنّى الخلاص هالجمعة" : `${due} يستنّاو الخلاص هالجمعة`}</p>}
      {fixed.length === 0 && !adding && <p className="mt-2 text-[0.8125rem] text-muted">زيد اللي تخلّصو كل شهر (Claude، Vercel…): كل واحد يورّيك قدّاش باقي ليه.</p>}
      {fixed.length > 0 && (
        <ul className="mt-2 divide-y divide-line/60">
          {fixed.map((f) => (
            <FixedRow key={f.id} f={f} today={today} />
          ))}
        </ul>
      )}
      <div className="mt-2.5">
        {adding ? (
          <FixedForm today={today} onDone={() => setAdding(false)} />
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="press flex h-10 w-full items-center justify-center gap-1.5 rounded-[0.75rem] bg-canvas text-[0.875rem] font-bold text-body ring-1 ring-line">
            <Plus className="size-4" /> زيد مصروف ثابت
          </button>
        )}
      </div>
    </section>
  );
}

function FixedRow({ f, today }: { f: FixedCost; today: string }) {
  const [mode, setMode] = useState<"idle" | "pay" | "edit" | "drop">("idle");
  const [amount, setAmount] = useState(() => String(fixedDinars(f)));
  const [on, setOn] = useState(today);
  const [pending, start] = useTransition();
  const [err, setErr] = useState(false);
  const left = daysBetween(today, f.next_on);
  const pill = left < 0 ? "bg-coral text-white" : left === 0 ? "bg-brand text-white" : left <= 7 ? "bg-[#FFF1D6] text-[#9A5B00]" : "bg-canvas text-body ring-1 ring-line";
  const said = left < 0 ? `فات عليه ${daysN(-left)}` : left === 0 ? "اليوم" : `باقي ${daysN(left)}`;
  const sum = Number(amount.replace(",", "."));

  if (mode === "edit") return <li className="py-2.5"><FixedForm today={today} f={f} onDone={() => setMode("idle")} /></li>;
  return (
    <li className="py-2.5">
      <div className="flex items-center gap-2.5">
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.75rem] font-bold ${pill}`}>{said}</span>
        <span className="min-w-0 flex-1">
          <bdi className="block truncate text-[0.9375rem] font-semibold text-ink">{f.what}</bdi>
          <span className="block truncate text-[0.75rem] text-muted">
            {everySaid(f.every)} · {daySaid(f.next_on)}
            {f.last_on && <> · آخر خلاص {daySaid(f.last_on)}</>}
          </span>
        </span>
        <span className="shrink-0 text-end">
          <b className="num block text-[0.9375rem] text-ink">
            {dt(fixedDinars(f))} <span className="text-[0.75rem] font-semibold text-muted">{t.payCurrency}</span>
          </b>
          {f.usd && (
            <span className="num block text-[0.6875rem] text-faint">
              <bdi dir="ltr">${f.usd}</bdi>
            </span>
          )}
        </span>
      </div>
      {mode === "idle" && (
        <div className="mt-2 flex gap-1.5">
          <button type="button" onClick={() => setMode("pay")} className="press flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[0.625rem] bg-brand text-[0.8125rem] font-bold text-white">
            <Check className="size-4" /> خلّصت
          </button>
          <button type="button" onClick={() => setMode("edit")} aria-label="بدّل" className="grid size-9 place-items-center rounded-[0.625rem] bg-canvas text-muted ring-1 ring-line">
            <Pencil className="size-4" />
          </button>
          <button type="button" onClick={() => setMode("drop")} aria-label="امسح" className="grid size-9 place-items-center rounded-[0.625rem] bg-canvas text-muted ring-1 ring-line">
            <Trash2 className="size-4" />
          </button>
        </div>
      )}
      {mode === "pay" && (
        <form
          className="mt-2 space-y-2 rounded-[0.875rem] bg-canvas/70 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!(sum > 0) || on > today) return;
            start(async () => {
              const next = await adminFixedPay(f.id, sum, on).catch(() => null);
              setErr(!next);
              if (next) setMode("idle");
            });
          }}
        >
          <p className="text-[0.8125rem] font-semibold text-ink">قدّاش خلّصت؟ يتكتب في الحسابات، والنهار الجاي يتحرّك {monthsSaid(f.every)}.</p>
          <div className="grid grid-cols-2 gap-2">
            <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, "").slice(0, 10))} inputMode="decimal" aria-label="قدّاش" className={FIELD} />
            <input type="date" value={on} max={today} onChange={(e) => setOn(e.target.value)} aria-label="النهار" dir="ltr" className={FIELD} />
          </div>
          {err && <p className="text-[0.8125rem] font-semibold text-coral">ما تسجّلش، عاود</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={pending || !(sum > 0)} className="press flex h-10 flex-1 items-center justify-center rounded-[0.75rem] bg-brand text-[0.875rem] font-bold text-white disabled:opacity-50">
              {pending ? "…" : "سجّل"}
            </button>
            <button type="button" onClick={() => setMode("idle")} className="h-10 rounded-[0.75rem] px-4 text-[0.875rem] font-semibold text-muted">
              {t.back}
            </button>
          </div>
        </form>
      )}
      {mode === "drop" && (
        <div className="mt-2 flex items-center gap-2 rounded-[0.875rem] bg-coral-soft p-3 text-[0.8125rem] text-coral">
          <span className="min-w-0 flex-1 font-semibold">نمسحوه؟ الخطوط اللي خلّصتهم يقعدو في الحسابات.</span>
          <button type="button" onClick={() => setMode("idle")} className="h-8 rounded-[0.5rem] px-2 font-semibold text-muted">
            لا
          </button>
          <button type="button" disabled={pending} onClick={() => start(async () => void (await adminFixedDrop(f.id).catch(() => false)))} className="h-8 rounded-[0.5rem] bg-coral px-3 font-bold text-white disabled:opacity-60">
            امسح
          </button>
        </div>
      )}
    </li>
  );
}

/** A fixed cost written or changed: what, in dinars or dollars, how often, the next day it is due, its kind. */
function FixedForm({ today, f, onDone }: { today: string; f?: FixedCost; onDone: () => void }) {
  const [what, setWhat] = useState(f?.what ?? "");
  const [cur, setCur] = useState<"tnd" | "usd">(f?.usd ? "usd" : "tnd");
  const [value, setValue] = useState(f ? String(f.usd ?? f.amount) : "");
  const [every, setEvery] = useState(f?.every ?? 1);
  const [next, setNext] = useState(f?.next_on ?? today);
  const [kind, setKind] = useState(f?.kind ?? "tools");
  const [pending, start] = useTransition();
  const [err, setErr] = useState(false);
  const n = Number(value.replace(",", "."));
  const can = what.trim().length >= 2 && n > 0 && /^\d{4}-\d{2}-\d{2}$/.test(next);
  return (
    <form
      className="space-y-2.5 rounded-[0.875rem] bg-canvas/70 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!can) return;
        start(async () => {
          const ok = await adminFixedSave({ id: f?.id ?? null, what, kind, amount: cur === "usd" ? n * USD_TND : n, usd: cur === "usd" ? n : null, every, next }).catch(() => false);
          setErr(!ok);
          if (ok) onDone();
        });
      }}
    >
      <input value={what} onChange={(e) => setWhat(e.target.value.slice(0, 80))} placeholder="على شنوّة؟ (مثلا: Claude Code)" aria-label="على شنوّة" className={FIELD} />
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d.,]/g, "").slice(0, 10))} inputMode="decimal" placeholder="قدّاش" aria-label="قدّاش" className={FIELD} />
        <div className="grid grid-cols-2 gap-1 rounded-[0.75rem] bg-ink/[0.05] p-1">
          {(["tnd", "usd"] as const).map((c) => (
            <button key={c} type="button" onClick={() => setCur(c)} className={`h-8 rounded-[0.5rem] px-3 text-[0.8125rem] font-bold ${cur === c ? "bg-surface text-ink shadow-sm" : "text-muted"}`}>
              {c === "tnd" ? t.payCurrency : "$"}
            </button>
          ))}
        </div>
      </div>
      {cur === "usd" && n > 0 && (
        <p className="text-[0.75rem] text-muted">
          <bdi dir="ltr" className="num font-semibold text-ink">{`$${value} × ${USD_TND} = ${dt(n * USD_TND)}`}</bdi> {t.payCurrency}
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {[1, 3, 6, 12].map((m) => (
          <button key={m} type="button" onClick={() => setEvery(m)} className={`${CHIP} ${every === m ? "bg-ink text-white" : "bg-surface text-body ring-1 ring-line"}`}>
            {everySaid(m)}
          </button>
        ))}
      </div>
      <label className="block text-[0.75rem] font-semibold text-muted">
        النهار الجاي اللي تخلّص فيه
        <input type="date" value={next} onChange={(e) => setNext(e.target.value)} dir="ltr" className={`${FIELD} mt-1`} />
      </label>
      <div className="flex flex-wrap gap-1.5">
        {OUT_KINDS.map((k) => (
          <button key={k} type="button" onClick={() => setKind(k)} className={`${CHIP} ${kind === k ? "bg-ink text-white" : "bg-surface text-body ring-1 ring-line"}`}>
            {KIND[k] ?? k}
          </button>
        ))}
      </div>
      {err && <p className="text-[0.8125rem] font-semibold text-coral">ما تسجّلش، عاود</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending || !can} className="press flex h-10 flex-1 items-center justify-center rounded-[0.75rem] bg-brand text-[0.875rem] font-bold text-white disabled:opacity-50">
          {pending ? "…" : f ? "سجّل التبديل" : "زيد"}
        </button>
        <button type="button" onClick={onDone} className="h-10 rounded-[0.75rem] px-4 text-[0.875rem] font-semibold text-muted">
          {t.back}
        </button>
      </div>
    </form>
  );
}
