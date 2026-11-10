"use client";

import { useState } from "react";
import { Gift, Info, Link2, QrCode, Smartphone, Undo2 } from "lucide-react";
import { shopHistory, type HistoryRow } from "@/app/actions";
import { UndoButton } from "@/components/Undo";
import { Icon3D } from "@/components/ui";
import { fill, stampsN, t } from "@/lib/t";

const PAGE = 60;
const TZ = "Africa/Tunis";
const dayKey = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
const dayLong = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { weekday: "long", day: "numeric", month: "long", timeZone: TZ }).format(new Date(iso));
const clock = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(iso));

type Filter = "all" | "stamps" | "gifts" | "cancels";
const FILTERS: { id: Filter; label: string; test: (r: HistoryRow) => boolean }[] = [
  { id: "all", label: t.histAll, test: () => true },
  { id: "stamps", label: t.histStamps, test: (r) => r.kind === "stamp" },
  { id: "gifts", label: t.histGifts, test: (r) => r.kind === "won" || r.kind === "given" },
  { id: "cancels", label: t.histCancels, test: (r) => r.kind === "cancel" },
];
const VIA = { qr: { icon: QrCode, say: t.histViaQr }, link: { icon: Link2, say: t.histViaLink }, number: { icon: Smartphone, say: t.histViaNumber } } as const;

/**
 * «التاريخ» (10 Nov 2026: «a page called history»): everything that happened at
 * the shop, the newest first, day by day — each tampon with how it came (the
 * code, a link, the number) and what it was for, each gift won and handed
 * over, each tampon taken back. A tampon that can still be taken back carries
 * «فسّخ» (components/Undo): the newest of its customer's card, within a day.
 * Older days come sixty lines at a time.
 */
export function History({ rows: first, today, yesterday }: { rows: HistoryRow[]; today: string; yesterday: string }) {
  const [rows, setRows] = useState(first);
  const [more, setMore] = useState(first.length >= PAGE);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const loadMore = async () => {
    const last = rows[rows.length - 1];
    if (!last || busy) return;
    setBusy(true);
    const next = await shopHistory(last.at).catch(() => []);
    setBusy(false);
    setRows((r) => [...r, ...next.filter((n) => !r.some((x) => x.id === n.id))]);
    setMore(next.length >= PAGE);
  };
  // a tampon taken back: its line becomes the taking back, at once (the next visit reads it from the database)
  const undone = (r: HistoryRow) =>
    setRows((list) => [
      { ...r, id: `x-now-${r.id}`, kind: "cancel", at: new Date().toISOString(), was: r.at, undo: false, moment: null },
      ...list.filter((x) => x.id !== r.id && !(x.kind === "won" && x.moment !== null && r.moment !== null && x.moment > r.moment && x.who === r.who)),
    ]);

  const test = FILTERS.find((f) => f.id === filter)!.test;
  const shown = rows.filter(test);
  // the lines by day, with the day's tampons and gifts counted
  const days: { key: string; at: string; rows: HistoryRow[] }[] = [];
  for (const r of shown) {
    const key = dayKey(r.at);
    const d = days[days.length - 1];
    if (d?.key === key) d.rows.push(r);
    else days.push({ key, at: r.at, rows: [r] });
  }

  if (!first.length) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center pb-[6dvh] text-center">
        <Icon3D name="ticket" size={88} className="animate-float" />
        <p className="mt-4 max-w-[17rem] text-balance text-[1rem] font-semibold text-muted">{t.histNone}</p>
      </div>
    );
  }

  return (
    <>
      <div data-list className="-mx-[clamp(1rem,5vw,1.5rem)] mt-[2dvh] flex shrink-0 gap-2 overflow-x-auto px-[clamp(1rem,5vw,1.5rem)] pb-1 [scrollbar-width:none]" role="tablist" aria-label={t.histTitle}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`press flex h-9 shrink-0 items-center rounded-full px-3.5 text-[0.875rem] font-bold transition-colors ${filter === f.id ? "bg-brand text-white" : "bg-surface text-body shadow-card"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* the list scrolls inside, the page around it stays: data-list says so (scripts/sizes.mjs) */}
      <div data-list data-clarity-mask="true" className="mt-[1.4dvh] min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3">
        {days.length === 0 && <p className="mt-6 text-center text-[0.9375rem] text-muted">{t.histNoneHere}</p>}
        {days.map((d) => {
          const stamps = d.rows.filter((r) => r.kind === "stamp").length;
          const gifts = d.rows.filter((r) => r.kind === "given").length;
          const name = d.key === today ? t.histToday : d.key === yesterday ? t.histYesterday : dayLong(d.at);
          return (
            <section key={d.key} className="mb-3">
              <h2 className="sticky top-0 z-10 flex items-baseline justify-between bg-canvas/95 px-0.5 py-1.5 backdrop-blur">
                <span className="text-[0.9375rem] font-bold">{name}</span>
                <span className="text-[0.75rem] font-semibold text-muted">
                  {stamps > 0 && stampsN(stamps)}
                  {stamps > 0 && gifts > 0 && " · "}
                  {gifts > 0 && fill(t.histGiftsN, { n: gifts })}
                </span>
              </h2>
              <ul className="divide-y divide-line overflow-hidden rounded-[1.25rem] bg-surface shadow-card">
                {d.rows.map((r) => (
                  <Line key={r.id} r={r} onUndone={() => undone(r)} />
                ))}
              </ul>
            </section>
          );
        })}
        {more && filter === "all" && (
          <button type="button" onClick={() => void loadMore()} disabled={busy} className="press mx-auto mt-1 flex h-11 items-center rounded-full bg-surface px-5 text-[0.875rem] font-bold text-brand shadow-card disabled:opacity-60">
            {busy ? t.checking : t.histMore}
          </button>
        )}
        <p className="mt-3 flex items-center justify-center gap-1.5 px-2 text-center text-[0.75rem] text-muted">
          <Info className="size-3.5 shrink-0" /> {t.undoRule}
        </p>
      </div>
    </>
  );
}

/** One thing that happened: what, who, how and when — and «فسّخ» on a tampon that can still be taken back. */
function Line({ r, onUndone }: { r: HistoryRow; onUndone: () => void }) {
  const who = r.who ?? t.someone;
  const via = r.via ? VIA[r.via] : null;
  const line =
    r.kind === "stamp" ? fill(t.histStamp, { who }) : r.kind === "won" ? fill(t.histWon, { who, gift: r.gift ?? "" }) : r.kind === "given" ? fill(t.histGiven, { who, gift: r.gift ?? "" }) : fill(t.histCancel, { who });
  return (
    <li className="flex items-center gap-3 px-3.5 py-2.5" data-kind={r.kind}>
      {r.kind === "stamp" ? (
        <span className="num grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-[0.8125rem] font-bold text-brand">+1</span>
      ) : r.kind === "cancel" ? (
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-coral-soft text-coral">
          <Undo2 className="size-[1.125rem]" strokeWidth={2.4} />
        </span>
      ) : r.kind === "given" ? (
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-mint-soft text-mint">
          <Gift className="size-[1.125rem]" strokeWidth={2.4} />
        </span>
      ) : (
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-coral-soft">
          <Icon3D name="gift" size={22} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <bdi className={`block truncate text-[0.9375rem] font-semibold ${r.kind === "cancel" ? "text-muted line-through decoration-coral/50" : ""}`}>{line}</bdi>
        <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[0.75rem] text-muted">
          <span className="num shrink-0">{clock(r.at)}</span>
          {via && (
            <span className="flex shrink-0 items-center gap-0.5">
              · <via.icon className="size-3" strokeWidth={2.4} /> {via.say}
            </span>
          )}
          {r.item && (
            <span className="min-w-0 truncate">
              · <bdi className="font-bold text-brand">{r.item}</bdi>
            </span>
          )}
          {r.kind === "cancel" && r.was && <span className="shrink-0">· {fill(t.histCancelOf, { time: clock(r.was) })}</span>}
        </span>
      </span>
      {r.kind === "stamp" && r.undo && r.moment !== null && <UndoButton moment={r.moment} who={r.who} at={r.at} item={r.item} where="history" onDone={onUndone} />}
    </li>
  );
}
