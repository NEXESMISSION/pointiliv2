"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Phone, Search, X } from "lucide-react";
import { AdminAccess } from "@/components/AdminAccess";
import { Face, Signs, hit, type BoardShop } from "@/components/AdminBoard";
import { digits, spaced } from "@/lib/phone";
import { agoSaid, customersN, t } from "@/lib/t";

const DAY = 86_400_000;
const PAGE = 24;
const dt = (n: number) => new Intl.NumberFormat("fr-TN", { maximumFractionDigits: 3 }).format(Math.round(n * 1000) / 1000);

type View = "waiting" | "soon" | "paid" | "all";
const VIEWS: { id: View; label: string; test: (s: BoardShop, now: number) => boolean; sort?: (a: BoardShop, b: BoardShop) => number }[] = [
  // the trial is over and nothing is paid: the ones used for real first, then the latest to end
  { id: "waiting", label: "يستنّاو الأبونمان", test: (s) => s.shut && !s.paid, sort: (a, b) => b.real - a.real || b.trial_end.localeCompare(a.trial_end) },
  // a trial running out in the next three days: the soonest first
  { id: "soon", label: "التجربة توفى قريب", test: (s, now) => !s.paid && !s.shut && s.started && Date.parse(s.trial_end) - now < 3 * DAY, sort: (a, b) => a.trial_end.localeCompare(b.trial_end) },
  // the paid ones: the first to end on top
  { id: "paid", label: "خالصين", test: (s) => s.paid, sort: (a, b) => (a.paid_until ?? "").localeCompare(b.paid_until ?? "") },
  { id: "all", label: "الكل", test: () => true },
];

/**
 * The subscriptions (the founder, 23 Oct 2026: «in the admin I don't see the
 * space to manage subscriptions»): who waits for the year now that the trial
 * is over, whose trial ends in the next days, who paid and until when — and
 * on each line, without opening anything, the founder's three moves: turn the
 * year on, add days of trial, stop it. The numbers on top: paid now, ending
 * within a month, and what came in this month.
 */
export function AdminSubs({ shops, now: serverNow, month }: { shops: BoardShop[]; now: number; month: number }) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const [view, setView] = useState<View>("waiting");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(PAGE);

  const counts = useMemo(() => Object.fromEntries(VIEWS.map((v) => [v.id, shops.filter((s) => v.test(s, now)).length])) as Record<View, number>, [shops, now]);
  const list = useMemo(() => {
    const v = VIEWS.find((x) => x.id === view)!;
    const hits = shops.filter((s) => v.test(s, now) && hit(s, q));
    return v.sort ? [...hits].sort(v.sort) : hits;
  }, [shops, view, q, now]);
  // the next lines drawn as the end of the list comes near (as on the board)
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = end.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0]?.isIntersecting && setLimit((n) => n + PAGE), { rootMargin: "800px" });
    io.observe(el);
    return () => io.disconnect();
  }, [list.length, limit]);
  const paid = shops.filter((s) => s.paid);
  const ending = paid.filter((s) => s.paid_until && Date.parse(s.paid_until) - now < 30 * DAY).length;

  return (
    <div>
      <h1 className="text-[1.5rem] font-bold text-ink">الأبونمان</h1>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          { n: String(paid.length), label: "خالصين توّا", tone: "text-mint" },
          { n: String(ending), label: "يوفاو في شهر", tone: ending ? "text-coral" : "text-ink" },
          { n: `${dt(month)} ${t.payCurrency}`, label: "دخل هالشهر", tone: "text-ink" },
        ].map((x) => (
          <div key={x.label} className="rounded-[1rem] bg-surface px-3 py-2.5 shadow-card ring-1 ring-line/70">
            <b className={`num block text-[1.25rem] leading-tight ${x.tone}`}>{x.n}</b>
            <span className="text-[0.75rem] font-semibold text-muted">{x.label}</span>
          </div>
        ))}
      </div>

      <label className="mt-3 flex h-11 items-center gap-2 rounded-[0.875rem] bg-surface px-3 shadow-card ring-1 ring-line/80 focus-within:ring-2 focus-within:ring-brand">
        <Search className="size-[1.125rem] shrink-0 text-faint" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setLimit(PAGE);
          }}
          type="search"
          placeholder="لوّج: محل، مولاه، نومرو…"
          aria-label="لوّج"
          className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-faint [&::-webkit-search-cancel-button]:hidden"
        />
        {q && (
          <button type="button" onClick={() => setQ("")} aria-label="امسح" className="grid size-7 place-items-center rounded-full text-muted hover:bg-canvas">
            <X className="size-4" />
          </button>
        )}
      </label>

      <div data-list className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="tablist">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={view === v.id}
            onClick={() => {
              setView(v.id);
              setLimit(PAGE);
            }}
            className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[0.875rem] font-semibold transition-colors ${view === v.id ? "bg-ink text-white" : "bg-surface text-body ring-1 ring-line"}`}
          >
            {v.label} <span className={`num text-[0.8125rem] ${view === v.id ? "text-white/70" : "text-faint"}`}>{counts[v.id]}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-3">
        {list.length === 0 && <p className="rounded-[1.125rem] bg-surface px-4 py-10 text-center text-[0.9375rem] text-muted ring-1 ring-line/70">حتى محل هوني</p>}
        {list.slice(0, limit).map((s) => (
          <SubLine key={s.id} s={s} now={now} />
        ))}
        {list.length > limit && <div ref={end} className="h-10" aria-hidden />}
      </div>
    </div>
  );
}

/** One shop's subscription: who, how much it is used, where its access stands, and the moves on it. */
function SubLine({ s, now }: { s: BoardShop; now: number }) {
  const d = digits(s.owner.phone ?? "");
  const phone = /^\d{8}$/.test(d) ? d : null;
  const use = s.week > 0 ? "يخدم هالجمعة" : s.last_at ? `آخر تامبون ${agoSaid(now - Date.parse(s.last_at))}` : "حتى تامبون";
  return (
    <article data-sub={s.id} className="rounded-[1.125rem] bg-surface p-3.5 shadow-card ring-1 ring-line/70">
      <div className="flex items-start gap-3">
        <Face s={s} />
        <div className="min-w-0 flex-1">
          <b className="block pt-0.5 text-[1rem] leading-snug text-ink">
            <bdi className="block truncate">{s.name}</bdi>
          </b>
          <p className="mt-0.5 text-[0.8125rem] leading-snug text-muted">
            <bdi>{s.owner.name || "بلا اسم"}</bdi> · {s.real ? customersN(s.real) : "حتى حريف"} · {use}
          </p>
        </div>
        {phone && (
          <span className="flex shrink-0 gap-1.5">
            <a href={`tel:+216${phone}`} aria-label={`عيّط ${spaced(phone)}`} className="press grid size-10 place-items-center rounded-[0.75rem] bg-brand-soft text-brand">
              <Phone className="size-4" />
            </a>
            <a href={`https://wa.me/216${phone}`} target="_blank" rel="noreferrer" aria-label="واتساب" className="press grid size-10 place-items-center rounded-[0.75rem] bg-[#25D366]/15 text-[#128C4B]">
              <MessageCircle className="size-4" />
            </a>
          </span>
        )}
      </div>
      <Signs s={s} now={now} />
      <div className="mt-2.5">
        <AdminAccess shop={s} />
      </div>
    </article>
  );
}
