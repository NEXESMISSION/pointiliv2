"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Pause, Play, RotateCcw, X } from "lucide-react";
import { howLong as long, Lat, timesN } from "@/components/console";
import { screenName } from "@/lib/screens";
import { counted, stampsN } from "@/lib/t";

export type Step = { route: string; screen: string | null; ms: number };
export type Visit = {
  id: string; at: string; end_at: string | null; ms: number; pages: number;
  device: string | null; os: string | null; browser: string | null; city: string | null; country: string | null; source: string;
  /** the tampons the shop gave while the owner was in */
  stamps?: number;
  path: Step[];
};
export type Seen = { created_at: string; first_at: string | null; last_at: string | null; n: number; ms: number; days?: { day: string; n: number; ms: number }[]; visits: Visit[] };

const TZ = "Africa/Tunis";
const keyOfDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const hm = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
const longDay = (key: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { weekday: "long", day: "numeric", month: "long", timeZone: TZ }).format(new Date(`${key}T12:00:00Z`));
const shortDay = (key: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "short", timeZone: TZ }).format(new Date(`${key}T12:00:00Z`));


/** A colour per place, so the same screen is the same colour all down the page. */
const INK = ["#6C47FF", "#12B76A", "#F79009", "#E0457B", "#0891B2", "#D7141A", "#7A5AF8", "#15803D", "#B45309", "#1D5FA8"];
const hue = (key: string) => {
  let n = 0;
  for (let i = 0; i < key.length; i++) n = (n * 31 + key.charCodeAt(i)) >>> 0;
  return INK[n % INK.length]!;
};
const keyOf = (w: Step) => `${w.route}:${w.screen ?? ""}`;

/** the same place twice in a row is one stop, its times added */
function stops(path: Step[]): Step[] {
  const out: Step[] = [];
  for (const w of path) {
    const last = out[out.length - 1];
    if (last && keyOf(last) === keyOf(w)) last.ms += w.ms;
    else out.push({ ...w });
  }
  return out;
}

const DEVICES: Record<string, string> = { phone: "تليفون", tablet: "تابلات", computer: "PC" };
const SOURCES: Record<string, string> = { facebook: "جا من فيسبوك", instagram: "جا من إنستغرام", google: "جا من Google", tiktok: "جا من تيك توك", whatsapp: "جا من واتساب", direct: "دخل وحدو" };
const isArabic = (x: string) => /^[؀-ۿ]/.test(x);

/**
 * «كل مرّة دخل»: an owner's visits, understood at a glance (the founder, 18
 * Oct 2026: «a nice thing that shows me something better to understand»).
 *
 * Three layers, each answering one question:
 *   1. the four facts — how many times, how long in all, the last time, where he spends his time;
 *   2. the last 30 days as a strip — a bar a day, as tall as the time he stayed:
 *      the shape says at once whether he comes every day, came once, or stopped;
 *   3. each visit, under its day: the hour, how long, and the way he went in
 *      words — «الكود · 12 دقيقة ‹ الحرفاء · 3 دقايق» — with the tampons given
 *      while he was in, and the visit replayed on a press.
 */
export function Visits({ seen }: { seen: Seen }) {
  const [all, setAll] = useState(false);
  const [play, setPlay] = useState<Step[] | null>(null);
  // the clock read once, when the page opens (the same «today» for every line under it)
  const [now] = useState(() => Date.now());
  const today = keyOfDay(new Date(now));
  const yesterday = keyOfDay(new Date(now - 86_400_000));
  const dayTitle = (key: string) => (key === today ? "اليوم" : key === yesterday ? "البارح" : longDay(key));

  // the 30 days, oldest first: from the database's day counts, else from the visits at hand
  const days = useMemo(() => {
    const by = new Map<string, { n: number; ms: number }>();
    if (seen.days?.length) for (const d of seen.days) by.set(d.day, { n: d.n, ms: d.ms });
    else
      for (const v of seen.visits) {
        const k = keyOfDay(new Date(v.at));
        const x = by.get(k) ?? { n: 0, ms: 0 };
        by.set(k, { n: x.n + 1, ms: x.ms + v.ms });
      }
    const out: { key: string; n: number; ms: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const key = keyOfDay(new Date(now - i * 86_400_000));
      out.push({ key, ...(by.get(key) ?? { n: 0, ms: 0 }) });
    }
    return out;
  }, [seen, now]);
  const active = days.filter((d) => d.n > 0).length;
  const peak = Math.max(1, ...days.map((d) => d.ms));

  // where the time goes, over the visits at hand
  const top = useMemo(() => {
    const by = new Map<string, number>();
    for (const v of seen.visits) for (const w of v.path) by.set(screenName(w.route, w.screen), (by.get(screenName(w.route, w.screen)) ?? 0) + w.ms);
    let best: [string, number] | null = null;
    for (const e of by) if (!best || e[1] > best[1]) best = e;
    return best;
  }, [seen.visits]);

  const shown = all ? seen.visits : seen.visits.slice(0, 8);
  const groups: { key: string; visits: Visit[] }[] = [];
  for (const v of shown) {
    const k = keyOfDay(new Date(v.at));
    const g = groups[groups.length - 1];
    if (g && g.key === k) g.visits.push(v);
    else groups.push({ key: k, visits: [v] });
  }

  if (!seen.visits.length && !seen.n) return <p className="px-5 py-12 text-center text-[0.9375rem] text-muted">مازال ما دخلش للأبليكاسيون</p>;

  return (
    <div>
      {/* 1. the four facts */}
      <dl className="grid grid-cols-2 gap-px border-y border-line/80 bg-line/80 md:grid-cols-4">
        {[
          { label: "دخل", value: timesN(seen.n) },
          { label: "قعد في الكل", value: seen.ms > 0 ? long(seen.ms) : "—" },
          { label: "آخر مرّة", value: seen.last_at ? `${dayTitle(keyOfDay(new Date(seen.last_at)))}، ${hm(seen.last_at)}` : "—" },
          { label: "أكثر بلاصة يقعد فيها", value: top ? top[0] : "—" },
        ].map((f) => (
          <div key={f.label} className="bg-surface px-5 py-3">
            <dt className="text-[0.75rem] font-semibold text-muted">{f.label}</dt>
            <dd className="mt-0.5 truncate text-[0.9375rem] font-bold text-ink" suppressHydrationWarning>
              <bdi>{f.value}</bdi>
            </dd>
          </div>
        ))}
      </dl>

      {/* 2. the last 30 days, a bar a day */}
      <div className="px-5 pb-4 pt-4">
        <p className="flex items-baseline justify-between gap-3 text-[0.8125rem]">
          <span className="font-bold text-ink">آخر 30 يوم</span>
          <span className="text-muted">
            دخل في <b className="font-bold text-ink">{counted(active, "نهار واحد", "يومين", "أيّام", "يوم")}</b> منهم
          </span>
        </p>
        <div dir="ltr" className="mt-3 flex h-16 items-end gap-[3px]">
          {days.map((d) => (
            <div key={d.key} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${longDay(d.key)} · ${d.n ? `${timesN(d.n)} · ${long(d.ms)}` : "ما دخلش"}`}>
              {d.n > 0 ? (
                <span className={`block rounded-t-[3px] ${d.key === today ? "bg-brand" : "bg-brand/55"}`} style={{ height: `${Math.max(12, (d.ms / peak) * 100)}%` }} />
              ) : (
                <span className="block h-[3px] rounded-full bg-line" />
              )}
            </div>
          ))}
        </div>
        {/* under the bars (which run left to right, today at the right end): the same three marks,
            written right to left so no Arabic sits in a left-to-right box */}
        <div className="mt-1.5 flex justify-between text-[0.6875rem] text-muted" suppressHydrationWarning>
          <span>اليوم</span>
          <bdi>{shortDay(days[15]!.key)}</bdi>
          <bdi>{shortDay(days[0]!.key)}</bdi>
        </div>
      </div>

      {/* 3. each visit, under its day */}
      <div className="border-t border-line/80">
        {groups.map((g) => (
          <section key={g.key}>
            <h3 className="bg-canvas/70 px-5 py-2 text-[0.8125rem] font-bold text-body" suppressHydrationWarning>
              {dayTitle(g.key)}
              <span className="ms-2 font-medium text-muted">· دخل {timesN(g.visits.length)}</span>
            </h3>
            <ul className="divide-y divide-line/70">
              {g.visits.map((v) => (
                <VisitRow key={v.id} v={v} onPlay={() => setPlay(v.path)} />
              ))}
            </ul>
          </section>
        ))}
      </div>

      {seen.visits.length > 8 && (
        <button type="button" onClick={() => setAll(!all)} className="flex h-11 w-full items-center justify-center border-t border-line/80 text-[0.875rem] font-semibold text-brand hover:bg-brand-soft/40">
          {all ? "ورّيني أقل" : `ورّيني الكل (${seen.visits.length})`}
        </button>
      )}

      {play && <Player path={play} onClose={() => setPlay(null)} />}
    </div>
  );
}

/** One visit: the hour and how long on the start side, the way he went in words, then where from and the replay. */
function VisitRow({ v, onPlay }: { v: Visit; onPlay: () => void }) {
  const path = stops(v.path);
  const total = path.reduce((a, w) => a + Math.max(w.ms, 400), 0);
  const many = path.length > 6;
  const seenStops = many ? path.slice(0, 5) : path;
  const where = [DEVICES[v.device ?? ""] ?? v.device, v.browser, v.city, SOURCES[v.source] ?? v.source].filter((x): x is string => !!x && x !== "?");

  return (
    <li className="grid gap-x-5 gap-y-2.5 px-5 py-4 md:grid-cols-[6.5rem_1fr_auto]">
      <div>
        <p className="text-[1.0625rem] font-bold leading-tight text-ink">
          <bdi className="num">{hm(v.at)}</bdi>
        </p>
        <p className="mt-0.5 text-[0.8125rem] text-muted">{v.ms > 0 ? `قعد ${long(v.ms)}` : "دخل وخرج"}</p>
      </div>

      <div className="min-w-0">
        {/* the way he went, in words: each stop and the time on it */}
        {path.length ? (
          <p className="flex flex-wrap items-center gap-1.5">
            {seenStops.map((w, i) => (
              <Fragment key={i}>
                {i > 0 && <ChevronLeft className="size-3.5 shrink-0 text-faint" aria-hidden />}
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-canvas px-2.5 py-1 text-[0.8125rem]">
                  <span className="size-2 shrink-0 rounded-full" style={{ background: hue(keyOf(w)) }} aria-hidden />
                  <bdi className="truncate font-semibold text-ink">{screenName(w.route, w.screen)}</bdi>
                  <span className="shrink-0 text-muted">{long(w.ms)}</span>
                </span>
              </Fragment>
            ))}
            {many && <span className="text-[0.8125rem] font-semibold text-muted">و{counted(path.length - 5, "بلاصة أخرى", "زوز بلايص أخرين", "بلايص أخرين", "بلاصة أخرى")}</span>}
          </p>
        ) : (
          <p className="text-[0.8125rem] text-faint">ما نعرفوش شنوّة حلّ</p>
        )}
        {/* the same visit as a ribbon: each place as wide as the time on it */}
        {path.length > 1 && (
          <span className="mt-2.5 flex h-1.5 w-full gap-[2px] overflow-hidden rounded-full" aria-hidden>
            {path.map((w, i) => (
              <span key={i} className="min-w-[3px]" style={{ flexGrow: Math.max(w.ms, 400) / total, background: hue(keyOf(w)) }} />
            ))}
          </span>
        )}
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.75rem] text-muted">
          {(v.stamps ?? 0) > 0 && <span className="rounded-full bg-brand-soft px-2 py-0.5 font-bold text-brand">تعطاو {stampsN(v.stamps!)} وهو داخل</span>}
          {where.map((x, i) => (
            <span key={i}>
              {i > 0 && <span className="me-2 text-faint">·</span>}
              {isArabic(x) ? x : <Lat>{x}</Lat>}
            </span>
          ))}
        </p>
      </div>

      <div className="flex items-start gap-2 md:flex-col md:items-stretch">
        {path.length > 0 && (
          <button type="button" onClick={onPlay} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[0.625rem] bg-brand-soft px-3 text-[0.8125rem] font-bold text-brand hover:bg-brand hover:text-white">
            <Play className="size-3.5" /> عاودها
          </button>
        )}
        <Link href={`/admin/traffic?tab=visits&v=${v.id}`} className="inline-flex h-8 items-center justify-center rounded-[0.625rem] px-3 text-[0.8125rem] font-semibold text-muted hover:bg-canvas hover:text-ink">
          التفاصيل
        </Link>
      </div>
    </li>
  );
}

/** The visit, played: one place at a time, in the time it really took, six times faster. */
function Player({ path: raw, onClose }: { path: Step[]; onClose: () => void }) {
  const path = useMemo(() => stops(raw), [raw]);
  const total = useMemo(() => path.reduce((a, w) => a + Math.max(w.ms, 400), 0), [path]);
  const [at, setAt] = useState(0);
  const [going, setGoing] = useState(true);
  const tick = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!going) return;
    const wait = Math.min(Math.max(path[at]?.ms ?? 600, 400) / 6, 2200);
    tick.current = setTimeout(() => {
      if (at + 1 < path.length) setAt(at + 1);
      else setGoing(false);
    }, wait);
    return () => {
      if (tick.current) clearTimeout(tick.current);
    };
  }, [at, going, path]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const now = path[at]!;
  const done = path.slice(0, at).reduce((a, w) => a + Math.max(w.ms, 400), 0);
  const ended = at + 1 >= path.length && !going;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/55 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="w-full max-w-lg rounded-[1.25rem] bg-surface p-5 shadow-lift" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[1.0625rem] font-bold">الزيارة كيف صارت</h2>
          <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-full bg-canvas text-muted hover:text-ink" aria-label="سكّر">
            <X className="size-4" />
          </button>
        </div>

        {/* where he is, and where he came from */}
        <div className="mt-4 grid place-items-center rounded-[1rem] py-7 text-center" style={{ background: `${hue(keyOf(now))}14` }}>
          <span className="text-[0.8125rem] font-semibold text-muted">{at > 0 ? `جا من: ${screenName(path[at - 1]!.route, path[at - 1]!.screen)}` : "أوّل ما دخل"}</span>
          <span className="mt-1 text-[1.5rem] font-bold leading-tight" style={{ color: hue(keyOf(now)) }}>
            <bdi>{screenName(now.route, now.screen)}</bdi>
          </span>
          <span className="mt-1 text-[0.875rem] font-semibold text-body">قعد فيها {long(now.ms)}</span>
        </div>

        {/* the whole visit, with where we are in it */}
        <div className="relative mt-4">
          <span className="flex h-3 w-full gap-[2px] overflow-hidden rounded-[0.25rem]">
            {path.map((w, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setGoing(false);
                  setAt(i);
                }}
                title={`${screenName(w.route, w.screen)} · ${long(w.ms)}`}
                className={`min-w-[3px] transition-opacity ${i <= at ? "" : "opacity-25"}`}
                style={{ flexGrow: Math.max(w.ms, 400), background: hue(keyOf(w)) }}
              />
            ))}
          </span>
          <span className="pointer-events-none absolute -top-0.5 h-4 w-[2px] bg-ink transition-[inset-inline-start] duration-200" style={{ insetInlineStart: `${(done / total) * 100}%` }} />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => (ended ? (setAt(0), setGoing(true)) : setGoing(!going))}
            className="flex h-10 items-center gap-2 rounded-full bg-brand px-4 text-[0.9375rem] font-bold text-white"
          >
            {ended ? <RotateCcw className="size-4" /> : going ? <Pause className="size-4" /> : <Play className="size-4" />}
            {ended ? "من الأوّل" : going ? "وقّف" : "كمّل"}
          </button>
          <span className="text-[0.8125rem] text-muted">
            <span className="font-semibold text-body">{at + 1}</span> من {path.length}
          </span>
          <span className="ms-auto text-[0.8125rem] font-semibold text-body">الكل: {long(total)}</span>
        </div>
      </div>
    </div>
  );
}
