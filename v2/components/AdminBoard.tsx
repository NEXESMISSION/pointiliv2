"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, BadgeCheck, Bell, Check, ChevronDown, CreditCard, Flame, ListFilter, MessageCircle, Moon, Pause, Phone, Search, Smartphone, TrendingDown, TrendingUp, Wallet, X, type LucideIcon } from "lucide-react";
import { adminShopNote, adminShopStage } from "@/app/admin/actions";
import { AdminShopMore } from "@/components/AdminShopMore";
import { ShopMark } from "@/components/ShopMark";
import { digits, spaced } from "@/lib/phone";
import { hit, lastMove, PILL, readShop, STAGE_GROUPS, STAGE_LOOK, stageOf, standing, type BoardShop, type Reading, type ReadMark, type ReadTone } from "@/lib/board";
import { agoSaid, counted, daysN, hoursN, stampsN } from "@/lib/t";

const DAY = 86_400_000;
const PAGE = 24;

type Filter = "unpaid" | "last" | "new" | "live" | "over" | "paid" | "all";
const FILTERS: { id: Filter; label: string; count: boolean; test: (s: BoardShop, now: number) => boolean }[] = [
  // the board opens here (the founder, 25 Oct 2026: «the same آخر من دخل, but without the paid»)
  { id: "unpaid", label: "آخر من دخل · ما خلّصوش", count: true, test: (s) => !s.paid },
  { id: "last", label: "آخر من دخل", count: false, test: () => true },
  { id: "new", label: "جداد", count: true, test: (s, now) => now - Date.parse(s.created_at) < 3 * DAY },
  { id: "live", label: "يخدمو", count: true, test: (s) => s.week > 0 },
  { id: "over", label: "التجربة وفات", count: true, test: (s) => s.shut && !s.paid },
  { id: "paid", label: "خالصين", count: true, test: (s) => s.paid },
  { id: "all", label: "الكل", count: true, test: () => true },
];
/** the first two: whoever moved last on top; the working ones by their last tampon, the trials over by the latest to end; the rest newest first */
const byMove = (a: BoardShop, b: BoardShop) => (lastMove(b) ?? "").localeCompare(lastMove(a) ?? "");
const SORT: Partial<Record<Filter, (a: BoardShop, b: BoardShop) => number>> = {
  unpaid: byMove,
  last: byMove,
  live: (a, b) => (b.last_at ?? "").localeCompare(a.last_at ?? ""),
  over: (a, b) => b.trial_end.localeCompare(a.trial_end),
};

/** The shop's face: its logo, or the picture of its kind, on its own colour. */
export function Face({ s }: { s: Pick<BoardShop, "color" | "kind" | "logo"> }) {
  return (
    <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-[0.875rem]" style={{ background: `${s.color}1f` }}>
      <ShopMark shop={s} size={28} />
    </span>
  );
}

/** «5 دقايق», «زوز سوايع»: how long the owner spent in the app, in all. */
const howLong = (ms: number) => {
  const m = Math.round(ms / 60_000);
  return m < 60 ? counted(m, "دقيقة", "زوز دقايق", "دقايق", "دقيقة") : hoursN(Math.round(m / 60));
};

/**
 * The founder's board (23 Oct 2026): every shop on one page — whoever moved
 * last on top, how alive each one is, his own line about it, and a call or a
 * WhatsApp one tap away. The founder: «so much data, browsing so slow… one
 * page to track the new clients, their activity, and a CRM for me, clean and
 * super simple», then «more detailed analytics, easy to see from the box
 * directly». So each line carries its numbers, its last 14 days and the
 * owner's signs of interest; «أكثر» only opens what is done to a shop.
 * Next to his note, where he is with the shop (24 Oct: «not called,
 * messaged, called, did not answer, waiting for payment…»), and the board
 * narrowed to one of those stages beside the search. At the top of each
 * line, what the numbers say about the client and what to do now (25 Oct:
 * «something super smart and useful, so that I have an idea of him»).
 * Searching and the filters work on the list already here, with no wait; the
 * list grows as it is scrolled, so a phone never draws it all.
 */
export function AdminBoard({ shops, now: serverNow, open: openFirst = null }: { shops: BoardShop[]; now: number; open?: string | null }) {
  // one clock for the whole list (not one per line): the server's first, then the phone's, every minute
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  // a paid shop opened from an alert (?shop=) is not in the first list: then the board opens on all of them
  const [filter, setFilter] = useState<Filter>(() => (openFirst && shops.find((s) => s.id === openFirst)?.paid ? "last" : "unpaid"));
  const [stage, setStage] = useState("all");
  const [q, setQ] = useState("");
  // the stages picked on this board since it was drawn, and the lines picked while the list was narrowed to
  // a stage: those stay where they are (a note may follow) until the list is chosen again
  const [picked, setPicked] = useState<Record<string, { stage: string; at: string | null }>>({});
  const [held, setHeld] = useState<string[]>([]);
  const all = useMemo(() => shops.map((s) => (picked[s.id] ? { ...s, stage: picked[s.id].stage, stage_at: picked[s.id].at } : s)), [shops, picked]);
  const [limit, setLimit] = useState(() => {
    // a shop opened from a Telegram alert: drawn even when it is far down the list
    const sorted = [...shops].sort(byMove);
    const at = openFirst ? sorted.findIndex((s) => s.id === openFirst) : -1;
    return Math.max(PAGE, at + 10);
  });
  const [open, setOpen] = useState<string | null>(openFirst);

  // each list counts what it holds at the stage chosen; each stage, what it holds in the list chosen
  const counts = useMemo(() => {
    const atStage = all.filter((s) => stage === "all" || s.stage === stage || held.includes(s.id));
    return Object.fromEntries(FILTERS.map((f) => [f.id, atStage.filter((s) => f.test(s, now)).length])) as Record<Filter, number>;
  }, [all, stage, held, now]);
  const stageCounts = useMemo(() => {
    const f = FILTERS.find((x) => x.id === filter)!;
    const n: Record<string, number> = {};
    for (const s of all) if (f.test(s, now)) n[s.stage] = (n[s.stage] ?? 0) + 1;
    return n;
  }, [all, filter, now]);
  const list = useMemo(() => {
    const f = FILTERS.find((x) => x.id === filter)!;
    const hits = all.filter((s) => f.test(s, now) && (stage === "all" || s.stage === stage || held.includes(s.id)) && hit(s, q));
    const sort = SORT[filter];
    return sort ? [...hits].sort(sort) : hits;
  }, [all, filter, stage, held, q, now]);
  const pickedOne = (id: string, key: string, at: string | null) => {
    setPicked((p) => ({ ...p, [id]: { stage: key, at } }));
    if (stage !== "all") setHeld((h) => (h.includes(id) ? h : [...h, id]));
  };

  // the shop opened from an alert, brought into view once
  const scrolled = useRef(false);
  useEffect(() => {
    if (!openFirst || scrolled.current) return;
    scrolled.current = true;
    document.getElementById(`shop-${openFirst}`)?.scrollIntoView({ block: "start" });
  }, [openFirst]);

  // the next lines drawn as the end of the list comes near
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = end.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0]?.isIntersecting && setLimit((n) => n + PAGE), { rootMargin: "800px" });
    io.observe(el);
    return () => io.disconnect();
  }, [list.length, limit]);

  const today = shops.reduce((n, s) => n + s.today, 0);
  const todayShops = shops.filter((s) => s.today > 0).length;
  const online = shops.filter((s) => s.online).length;

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-[1.5rem] font-bold text-ink">المحلات</h1>
        <p className="pb-1 text-[0.8125rem] text-muted">
          {today ? `اليوم ${stampsN(today)} في ${todayShops === 1 ? "محل واحد" : `${todayShops} محلات`}` : "حتى تامبون اليوم مازال"}
          {online > 0 && (
            <span className="ms-2 inline-flex items-center gap-1 font-semibold text-mint">
              <span className="size-2 rounded-full bg-mint" /> {online} توّا
            </span>
          )}
        </p>
      </div>

      {/* the search (a name, an owner, a number, a word of a note, a kind), and the board narrowed to one stage */}
      <div className="mt-3 flex gap-2">
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[0.875rem] bg-surface px-3 shadow-card ring-1 ring-line/80 focus-within:ring-2 focus-within:ring-brand">
          <Search className="size-[1.125rem] shrink-0 text-faint" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(PAGE);
            }}
            type="search"
            placeholder="لوّج: محل، مولاه، نومرو، ملاحظة…"
            aria-label="لوّج"
            className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-faint [&::-webkit-search-cancel-button]:hidden"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="امسح" className="grid size-7 place-items-center rounded-full text-muted hover:bg-canvas">
              <X className="size-4" />
            </button>
          )}
        </label>
        <StageFilter
          value={stage}
          counts={stageCounts}
          onChange={(v) => {
            setStage(v);
            setHeld([]);
            setLimit(PAGE);
          }}
        />
      </div>

      {/* the ways to look at the list: whoever moved last first, then each with how many are in it */}
      <div data-list className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="tablist">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => {
              setFilter(f.id);
              setHeld([]);
              setLimit(PAGE);
            }}
            className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[0.875rem] font-semibold transition-colors ${filter === f.id ? "bg-ink text-white" : "bg-surface text-body ring-1 ring-line"}`}
          >
            {f.label}
            {f.count && <span className={`num text-[0.8125rem] ${filter === f.id ? "text-white/70" : "text-faint"}`}>{counts[f.id]}</span>}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-3">
        {list.length === 0 && <p className="rounded-[1.125rem] bg-surface px-4 py-10 text-center text-[0.9375rem] text-muted ring-1 ring-line/70">ما لقينا حتى محل</p>}
        {list.slice(0, limit).map((s) => (
          <ShopLine key={s.id} s={s} now={now} open={open === s.id} onToggle={() => setOpen(open === s.id ? null : s.id)} onPicked={(key, at) => pickedOne(s.id, key, at)} />
        ))}
        {list.length > limit && <div ref={end} className="h-10" aria-hidden />}
      </div>
    </div>
  );
}

/** One shop: who and where it stands, its numbers and its last 14 days, the owner's signs, the founder's stage and line, and the call. */
function ShopLine({ s, now, open, onToggle, onPicked }: { s: BoardShop; now: number; open: boolean; onToggle: () => void; onPicked: (stage: string, at: string | null) => void }) {
  const st = standing(s, now);
  const d = digits(s.owner.phone ?? "");
  const phone = /^\d{8}$/.test(d) ? d : null;
  const ago = (iso: string) => agoSaid(now - Date.parse(iso));
  return (
    <article id={`shop-${s.id}`} data-shop={s.id} data-moved={lastMove(s) ?? ""} className="scroll-mt-20 rounded-[1.125rem] bg-surface p-3.5 shadow-card ring-1 ring-line/70">
      <div className="flex items-start gap-3">
        <Link href={`/admin/shop/${s.id}`} aria-label={`${s.name}: كل التفاصيل`} className="shrink-0">
          <Face s={s} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <Link href={`/admin/shop/${s.id}`} className="min-w-0 flex-1 pt-0.5 text-[1rem] font-bold leading-snug text-ink">
              <bdi className="block truncate">{s.name}</bdi>
            </Link>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.75rem] font-semibold ${PILL[st.tone]}`}>{st.say}</span>
          </div>
          {/* the owner, and when the shop opened — that one never cut (a new client is the first thing to see); the number is on the call */}
          <p className="mt-0.5 flex items-baseline gap-2 text-[0.8125rem] text-muted">
            <bdi className="min-w-0 truncate">{s.owner.name || "بلا اسم"}</bdi>
            <span className="ms-auto shrink-0">تحلّ {ago(s.created_at)}</span>
          </p>
        </div>
      </div>

      {/* what the numbers say about him, and what to do now: the first thing read on the line */}
      <ShopReading r={readShop(s, now)} className="mt-2.5" />

      {/* the owner himself: in the app now or when last, on how many days, for how long */}
      <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.8125rem] text-body">
        {s.online ? (
          <span className="inline-flex items-center gap-1 font-semibold text-mint">
            <span className="size-2 rounded-full bg-mint" /> في الأبليكاسيون توّا
          </span>
        ) : (
          <span>{s.seen_at ? `دخل ${ago(s.seen_at)}` : "ما دخلش"}</span>
        )}
        {s.days > 1 && (
          <>
            <span className="text-faint">·</span>
            <span>جا في {daysN(s.days)}</span>
          </>
        )}
        {s.ms >= 60_000 && (
          <>
            <span className="text-faint">·</span>
            <span>{howLong(s.ms)} في الكل</span>
          </>
        )}
      </p>

      {/* its numbers and its 14 days — or, before its first customer, one quiet line */}
      {s.stamps || s.gifts ? (
        <>
          <Numbers s={s} />
          <Days s={s} />
        </>
      ) : (
        <p className="mt-2 rounded-[0.75rem] bg-canvas/70 px-3 py-2 text-[0.8125rem] text-muted">حتى تامبون لحريف مازال</p>
      )}
      <Signs s={s} now={now} />

      {/* the founder's own: where he is with the shop, and his line about it */}
      <div className="mt-2.5 flex flex-wrap items-start gap-2">
        <ShopStage id={s.id} stage={s.stage} at={s.stage_at} now={now} onPicked={onPicked} />
        <ShopNote id={s.id} note={s.note} className="min-w-[8.5rem] flex-1" />
      </div>

      <div className="mt-2.5 grid grid-cols-[1fr_1fr_auto] gap-2">
        {phone ? (
          <a href={`tel:+216${phone}`} aria-label={`عيّط ${spaced(phone)}`} className="press flex h-10 items-center justify-center gap-1.5 rounded-[0.75rem] bg-brand-soft text-[0.875rem] font-bold text-brand">
            <Phone className="size-4 shrink-0" />
            <bdi dir="ltr" className="num">
              {spaced(phone)}
            </bdi>
          </a>
        ) : (
          <span className="flex h-10 items-center justify-center rounded-[0.75rem] bg-canvas text-[0.8125rem] text-faint">بلا نومرو</span>
        )}
        {phone ? (
          <a href={`https://wa.me/216${phone}`} target="_blank" rel="noreferrer" className="press flex h-10 items-center justify-center gap-1.5 rounded-[0.75rem] bg-[#25D366]/15 text-[0.875rem] font-bold text-[#128C4B]">
            <MessageCircle className="size-4" /> واتساب
          </a>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className={`press flex h-10 items-center justify-center gap-1 rounded-[0.75rem] px-3.5 text-[0.875rem] font-semibold ${open ? "bg-ink text-white" : "bg-canvas text-body ring-1 ring-line"}`}
        >
          أكثر <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open && <AdminShopMore shop={s} now={now} />}
    </article>
  );
}

const READ_LOOK: Record<ReadTone, { box: string; head: string }> = {
  hot: { box: "bg-[#FFF1EC] ring-[#FFD5C6]", head: "text-[#C2410C]" },
  good: { box: "bg-mint-soft ring-[#C4ECDA]", head: "text-[#0B7A4B]" },
  warn: { box: "bg-[#FFF8E1] ring-[#F3E2A0]", head: "text-[#86620A]" },
  risk: { box: "bg-[#FFEDEE] ring-[#FFCACE]", head: "text-[#C2272D]" },
  cold: { box: "bg-canvas ring-line", head: "text-muted" },
};
const READ_MARK: Record<ReadMark, LucideIcon> = { flame: Flame, wallet: Wallet, up: TrendingUp, check: BadgeCheck, alert: AlertTriangle, down: TrendingDown, sleep: Moon, pause: Pause };

/**
 * The shop, read (lib/board readShop): what is going on in its colour, the
 * facts that say so, and what to do now. On the board's line and at the top
 * of the shop's own page.
 */
export function ShopReading({ r, className = "" }: { r: Reading; className?: string }) {
  const look = READ_LOOK[r.tone];
  const Mark = READ_MARK[r.mark];
  return (
    <div data-reading={r.tone} className={`rounded-[0.875rem] px-3 py-2.5 ring-1 ring-inset ${look.box} ${className}`}>
      <p className={`flex items-start gap-1.5 text-[0.9375rem] font-bold leading-snug ${look.head}`}>
        <Mark className="mt-0.5 size-4 shrink-0" strokeWidth={2.4} aria-hidden />
        <span className="min-w-0">{r.head}</span>
      </p>
      {r.why.length > 0 && <p className="mt-1 text-[0.8125rem] leading-snug text-body">{r.why.join(" · ")}</p>}
      <p className="mt-1 text-[0.8125rem] font-bold leading-snug text-ink">← {r.next}</p>
    </div>
  );
}

/** Four numbers side by side: real customers (and the first hour's tries), tampons (and today's), who came back, gifts handed over. */
function Numbers({ s }: { s: BoardShop }) {
  const cells: { n: number; label: string; hint: string | null }[] = [
    { n: s.real, label: "حرفاء", hint: s.customers > s.real ? `+${s.customers - s.real} تجربة` : null },
    { n: s.stamps, label: "تامبونات", hint: s.today ? `+${s.today} اليوم` : null },
    { n: s.returning, label: "رجعو", hint: null },
    { n: s.gifts, label: "كادوات", hint: null },
  ];
  return (
    <div className="mt-2.5 grid grid-cols-4 gap-1.5">
      {cells.map((c) => (
        <div key={c.label} className="flex flex-col items-center justify-center rounded-[0.75rem] bg-canvas/70 px-1 py-1.5 text-center">
          <b className={`num text-[1.1875rem] leading-tight ${c.n ? "text-ink" : "text-faint"}`}>{c.n}</b>
          <span className="text-[0.6875rem] font-semibold leading-tight text-muted">{c.label}</span>
          {c.hint && <span className="mt-0.5 text-[0.625rem] font-bold leading-tight text-brand">{c.hint}</span>}
        </div>
      ))}
    </div>
  );
}

/** The last 14 days as little bars, today's the darkest (the first hour after the opening left out). */
function Days({ s }: { s: BoardShop }) {
  const days = s.spark ?? [];
  const total = days.reduce((a, b) => a + b, 0);
  if (!total) return <p className="mt-2 text-[0.75rem] text-faint">حتى تامبون في 14 يوم</p>;
  const max = Math.max(1, ...days);
  return (
    <div className="mt-2.5">
      {/* time runs left to right, today at the end, like any chart */}
      <div dir="ltr" role="img" aria-label={`${stampsN(total)} في 14 يوم`} className="flex h-8 items-end gap-[3px]">
        {days.map((n, i) => (
          <span key={i} className={`flex-1 rounded-t-[3px] ${n ? (i === days.length - 1 ? "bg-brand" : "bg-brand/40") : "bg-line"}`} style={{ height: n ? `${Math.max(14, (n / max) * 100)}%` : "2px" }} />
        ))}
      </div>
      <p className="mt-1 flex justify-between text-[0.625rem] text-faint">
        <span>اليوم</span>
        <span>{stampsN(total)} في 14 يوم</span>
      </p>
    </div>
  );
}

/** What the owner did that says he means it: the pay page, a call or a WhatsApp to pay, the app on the phone, the notifications. */
export function Signs({ s, now }: { s: BoardShop; now: number }) {
  const ago = (iso: string) => agoSaid(now - Date.parse(iso));
  const signs = [
    s.pay_seen ? { icon: CreditCard, say: `حلّ صفحة الخلاص ${ago(s.pay_seen)}`, strong: true } : null,
    s.wa_at ? { icon: MessageCircle, say: `حاول يكلّمنا ${ago(s.wa_at)}`, strong: true } : null,
    s.app ? { icon: Smartphone, say: "حطّ الأبليكاسيون", strong: false } : null,
    s.push ? { icon: Bell, say: "الإشعارات خدّامة", strong: false } : null,
  ].filter((x) => x !== null);
  if (!signs.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {signs.map((x) => (
        <span key={x.say} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.75rem] font-semibold ${x.strong ? "bg-mint-soft text-mint" : "bg-brand-soft text-brand"}`}>
          <x.icon className="size-3.5" /> {x.say}
        </span>
      ))}
    </div>
  );
}

/**
 * Where the founder is with the shop (lib/board STAGES): the phone's own list
 * in five groups, under a pill in the stage's colour that says since when.
 * Saved as soon as it is picked; if it was not, the pill goes back with a
 * coral ring. On the shop's own page, the page is read again after it (the
 * stages it went through).
 */
export function ShopStage({ id, stage, at, now, onPicked, refresh = false }: { id: string; stage: string; at: string | null; now: number; onPicked?: (stage: string, at: string | null) => void; refresh?: boolean }) {
  const router = useRouter();
  const [pick, setPick] = useState<{ stage: string; at: string | null }>({ stage, at });
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const s = stageOf(pick.stage);
  const look = STAGE_LOOK[s.tone];
  const since = pick.stage !== "new" && pick.at ? agoSaid(now - Date.parse(pick.at)) : null;
  const change = async (key: string) => {
    const before = pick;
    const next = { stage: key, at: new Date().toISOString() };
    setPick(next);
    // the board knows at once (its lists and counts): a list chosen while the save is on its way must not find
    // the line held again when it lands
    onPicked?.(next.stage, next.at);
    setState("saving");
    const ok = await adminShopStage(id, key).catch(() => false);
    if (!ok) {
      setPick(before);
      onPicked?.(before.stage, before.at);
      setState("error");
      return;
    }
    setState("idle");
    if (refresh) router.refresh();
  };
  return (
    <label
      data-stage={pick.stage}
      title={state === "error" ? "ما تسجّلتش، عاود" : undefined}
      className={`relative flex min-h-10 shrink-0 cursor-pointer items-center gap-2 rounded-[0.75rem] py-1 pe-2 ps-2.5 ring-inset focus-within:ring-2 focus-within:ring-brand ${look.box} ${state === "error" ? "ring-2 ring-coral" : `ring-1 ${look.ring}`}`}
    >
      <span className={`size-2 shrink-0 rounded-full ${look.dot} ${state === "saving" ? "animate-pulse" : ""}`} />
      <span className="flex flex-col leading-tight">
        <b className="whitespace-nowrap text-[0.8125rem]">{s.label}</b>
        {since && <span className="whitespace-nowrap text-[0.6875rem] font-semibold opacity-75">{since}</span>}
      </span>
      <ChevronDown className="size-3.5 shrink-0 opacity-60" />
      {/* the list itself, over the whole pill: a tap opens the phone's own picker */}
      <select value={pick.stage} onChange={(e) => void change(e.target.value)} aria-label="وين وصلت معاه" className="absolute inset-0 size-full cursor-pointer text-[16px] opacity-0">
        {STAGE_GROUPS.map((g) => (
          <optgroup key={g.group} label={g.group}>
            {g.stages.map((x) => (
              <option key={x.key} value={x.key}>
                {x.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

/** The board narrowed to one stage: each with how many shops are at it in the list chosen (the empty ones left out). */
function StageFilter({ value, counts, onChange }: { value: string; counts: Record<string, number>; onChange: (v: string) => void }) {
  const on = value !== "all";
  const s = stageOf(value);
  const look = STAGE_LOOK[s.tone];
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return (
    <label
      className={`relative flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-[0.875rem] px-3 text-[0.875rem] font-semibold focus-within:ring-2 focus-within:ring-brand ${on ? `ring-1 ring-inset ${look.box} ${look.ring}` : "bg-surface text-body shadow-card ring-1 ring-line/80"}`}
    >
      {on ? <span className={`size-2 shrink-0 rounded-full ${look.dot}`} /> : <ListFilter className="size-4 shrink-0 text-faint" />}
      <span className="max-w-[8.5rem] truncate">{on ? s.label : "المراحل"}</span>
      {on && <span className="num text-[0.8125rem] opacity-70">{counts[value] ?? 0}</span>}
      <ChevronDown className="size-3.5 shrink-0 opacity-60" />
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="المرحلة" className="absolute inset-0 size-full cursor-pointer text-[16px] opacity-0">
        <option value="all">{`كل المراحل · ${total}`}</option>
        {STAGE_GROUPS.map((g) => {
          const shown = g.stages.filter((x) => counts[x.key] || x.key === value);
          return shown.length ? (
            <optgroup key={g.group} label={g.group}>
              {shown.map((x) => (
                <option key={x.key} value={x.key}>{`${x.label} · ${counts[x.key] ?? 0}`}</option>
              ))}
            </optgroup>
          ) : null;
        })}
      </select>
    </label>
  );
}

/**
 * The founder's one line about the shop: what he would otherwise keep in his
 * head («كلّمتو، يخلّص نهار الاثنين»). Saved when he leaves the field or
 * presses Enter (Shift+Enter for a new line); a small tick says it is kept,
 * a coral border that it is not — the words stay, to try again.
 */
export function ShopNote({ id, note, className = "mt-2.5" }: { id: string; note: string; className?: string }) {
  const [text, setText] = useState(note);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const kept = useRef(note);
  const save = async () => {
    const v = text.trim();
    if (v === kept.current) return;
    setState("saving");
    const ok = await adminShopNote(id, v).catch(() => false);
    if (ok) {
      kept.current = v;
      setState("saved");
    } else setState("error");
  };
  return (
    <div className={`relative ${className}`}>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (state !== "idle") setState("idle");
        }}
        onBlur={() => void save()}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        rows={1}
        maxLength={300}
        dir="auto"
        placeholder="اكتب ملاحظة…"
        aria-label="ملاحظة على المحل"
        className={`block max-h-[6rem] min-h-10 w-full resize-none rounded-[0.75rem] border bg-canvas/60 py-2 pe-8 ps-3 text-[16px] leading-snug text-ink [field-sizing:content] placeholder:text-faint focus:border-brand focus:bg-surface focus:outline-none sm:text-[0.875rem] ${state === "error" ? "border-coral" : "border-transparent"}`}
      />
      <span className="pointer-events-none absolute end-2.5 top-3 grid size-4 place-items-center" aria-live="polite">
        {state === "saved" && <Check className="size-4 text-mint" strokeWidth={3} aria-label="تسجّلت" />}
        {state === "saving" && <span className="block size-2 animate-pulse rounded-full bg-brand/50" />}
      </span>
    </div>
  );
}
