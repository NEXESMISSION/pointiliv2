"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Check, ChevronDown, CreditCard, MessageCircle, Phone, Search, Smartphone, X } from "lucide-react";
import { adminShopNote } from "@/app/admin/actions";
import { AdminShopMore } from "@/components/AdminShopMore";
import { ShopMark } from "@/components/ShopMark";
import { digits, spaced } from "@/lib/phone";
import { agoSaid, counted, daysN, hoursN, kindMatches, plain, stampsN } from "@/lib/t";

/** one shop on the board (admin_board) */
export type BoardShop = {
  id: string;
  name: string;
  kind: string;
  color: string;
  logo: string | null;
  /** the card is made */
  card: boolean;
  created_at: string;
  paused: boolean;
  owner: { name: string | null; phone: string | null };
  paid_until: string | null;
  paid: boolean;
  trial_end: string;
  /** the trial's clock started (the first customer came) */
  started: boolean;
  /** the trial is over and nothing is paid: the counter is stopped */
  shut: boolean;
  /** tampons to customers (never the owner's own, a test's or a robot's): all, today, the last 7 days (the first hour after the opening left out) */
  stamps: number;
  today: number;
  week: number;
  customers: number;
  /** customers who got a tampon more than an hour after the opening: the shop in use, not the owner trying it */
  real: number;
  last_at: string | null;
  /** customers who came back on another day; gifts handed over */
  returning: number;
  gifts: number;
  /** the last 14 days, day by day, oldest first (the first hour left out); null: not one tampon in them */
  spark: number[] | null;
  /** the owner: last seen, on how many days, on the site right now, how long in all (ms) */
  seen_at: string | null;
  days: number;
  online: boolean;
  ms: number;
  /** the owner opened the pay page, last; tapped a call or a WhatsApp to pay, last; put Pointili on the phone; let it notify */
  pay_seen: string | null;
  wa_at: string | null;
  app: boolean;
  push: boolean;
  /** the founder's own line about the shop */
  note: string;
};

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const PAGE = 24;
const TZ = "Africa/Tunis";
const monthYear = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { month: "short", year: "numeric", timeZone: TZ }).format(new Date(iso));

/** The last time anything moved at this shop: the owner in the app, or a customer's tampon. */
export const lastMove = (s: BoardShop) => [s.seen_at, s.last_at].filter((x): x is string => !!x).sort().pop() ?? null;

type Filter = "last" | "new" | "live" | "over" | "paid" | "all";
const FILTERS: { id: Filter; label: string; count: boolean; test: (s: BoardShop, now: number) => boolean }[] = [
  { id: "last", label: "آخر من دخل", count: false, test: () => true },
  { id: "new", label: "جداد", count: true, test: (s, now) => now - Date.parse(s.created_at) < 3 * DAY },
  { id: "live", label: "يخدمو", count: true, test: (s) => s.week > 0 },
  { id: "over", label: "التجربة وفات", count: true, test: (s) => s.shut && !s.paid },
  { id: "paid", label: "خالصين", count: true, test: (s) => s.paid },
  { id: "all", label: "الكل", count: true, test: () => true },
];
/** the first one: whoever moved last on top; the working ones by their last tampon, the trials over by the latest to end; the rest newest first */
const SORT: Partial<Record<Filter, (a: BoardShop, b: BoardShop) => number>> = {
  last: (a, b) => (lastMove(b) ?? "").localeCompare(lastMove(a) ?? ""),
  live: (a, b) => (b.last_at ?? "").localeCompare(a.last_at ?? ""),
  over: (a, b) => b.trial_end.localeCompare(a.trial_end),
};

export type Tone = "mint" | "brand" | "coral" | "grey";
export const PILL: Record<Tone, string> = {
  mint: "bg-mint-soft text-mint",
  brand: "bg-brand-soft text-brand",
  coral: "bg-coral-soft text-coral",
  grey: "bg-canvas text-muted ring-1 ring-inset ring-line",
};

/** Where the shop stands, in three words: paid, its trial and what is left of it, over, or not started. */
export function standing(s: BoardShop, now: number): { say: string; tone: Tone } {
  if (s.paused) return { say: "موقوف", tone: "grey" };
  if (s.paid && s.paid_until) return { say: `خالص حتى ${monthYear(s.paid_until)}`, tone: "mint" };
  if (!s.card) return { say: "بلا كارط", tone: "grey" };
  if (s.shut) return { say: "التجربة وفات", tone: "coral" };
  if (!s.started) return { say: "يستنّى أوّل حريف", tone: "grey" };
  const left = Date.parse(s.trial_end) - now;
  return { say: `تجربة · باقي ${left >= DAY ? daysN(Math.floor(left / DAY)) : hoursN(Math.max(1, Math.ceil(left / HOUR)))}`, tone: "brand" };
}

/** Does the shop answer what was typed: its name, its owner, the number, a word of the note, its kind. */
export function hit(s: BoardShop, q: string): boolean {
  const words = plain(q).split(" ").filter(Boolean);
  if (!words.length) return true;
  const hay = plain(`${s.name} ${s.owner.name ?? ""} ${digits(s.owner.phone ?? "")} ${s.note}`);
  return words.every((w) => hay.includes(w) || kindMatches(s.kind, w));
}

/** The shop's face: its logo, or the picture of its kind, on its own colour. */
export function Face({ s }: { s: BoardShop }) {
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
  const [filter, setFilter] = useState<Filter>("last");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(() => {
    // a shop opened from a Telegram alert: drawn even when it is far down the list
    const sorted = [...shops].sort(SORT.last);
    const at = openFirst ? sorted.findIndex((s) => s.id === openFirst) : -1;
    return Math.max(PAGE, at + 10);
  });
  const [open, setOpen] = useState<string | null>(openFirst);

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.id, shops.filter((s) => f.test(s, now)).length])) as Record<Filter, number>, [shops, now]);
  const list = useMemo(() => {
    const f = FILTERS.find((x) => x.id === filter)!;
    const hits = shops.filter((s) => f.test(s, now) && hit(s, q));
    const sort = SORT[filter];
    return sort ? [...hits].sort(sort) : hits;
  }, [shops, filter, q, now]);

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

      {/* the search: a name, an owner, a number, a word of a note, a kind */}
      <label className="mt-3 flex h-11 items-center gap-2 rounded-[0.875rem] bg-surface px-3 shadow-card ring-1 ring-line/80 focus-within:ring-2 focus-within:ring-brand">
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
          <ShopLine key={s.id} s={s} now={now} open={open === s.id} onToggle={() => setOpen(open === s.id ? null : s.id)} />
        ))}
        {list.length > limit && <div ref={end} className="h-10" aria-hidden />}
      </div>
    </div>
  );
}

/** One shop: who and where it stands, its numbers and its last 14 days, the owner's signs, the founder's line, and the call. */
function ShopLine({ s, now, open, onToggle }: { s: BoardShop; now: number; open: boolean; onToggle: () => void }) {
  const st = standing(s, now);
  const d = digits(s.owner.phone ?? "");
  const phone = /^\d{8}$/.test(d) ? d : null;
  const ago = (iso: string) => agoSaid(now - Date.parse(iso));
  return (
    <article id={`shop-${s.id}`} data-shop={s.id} data-moved={lastMove(s) ?? ""} className="scroll-mt-20 rounded-[1.125rem] bg-surface p-3.5 shadow-card ring-1 ring-line/70">
      <div className="flex items-start gap-3">
        <Face s={s} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <b className="min-w-0 flex-1 pt-0.5 text-[1rem] leading-snug text-ink">
              <bdi className="block truncate">{s.name}</bdi>
            </b>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.75rem] font-semibold ${PILL[st.tone]}`}>{st.say}</span>
          </div>
          {/* the owner, and when the shop opened — that one never cut (a new client is the first thing to see); the number is on the call */}
          <p className="mt-0.5 flex items-baseline gap-2 text-[0.8125rem] text-muted">
            <bdi className="min-w-0 truncate">{s.owner.name || "بلا اسم"}</bdi>
            <span className="ms-auto shrink-0">تحلّ {ago(s.created_at)}</span>
          </p>
        </div>
      </div>

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

      <Note id={s.id} note={s.note} />

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
 * The founder's one line about the shop: what he would otherwise keep in his
 * head («كلّمتو، يخلّص نهار الاثنين»). Saved when he leaves the field or
 * presses Enter (Shift+Enter for a new line); a small tick says it is kept,
 * a coral border that it is not — the words stay, to try again.
 */
function Note({ id, note }: { id: string; note: string }) {
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
    <div className="relative mt-2.5">
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
