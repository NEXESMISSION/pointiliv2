"use client";

import { useEffect, useState } from "react";
import { cardMoments, type CardMoment } from "@/app/actions";
import { Icon3D } from "@/components/ui";
import { fill } from "@/lib/t";

const say = {
  title: "شنوّة خذا في كل تامبون",
  none: "مازال حتى تامبون",
  stamp: "تامبون",
  won: "ربح {gift}",
  given: "خذا {gift}",
};
const when = (iso: string) =>
  new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis" }).format(new Date(iso));

/**
 * One customer's card, tampon by tampon, under the card in the owner's sheet:
 * what each one was for (a shop that says what it sells), numbered in the
 * order they came, with the day and the hour — and on top, how many of each
 * thing. Gifts sit in the line where they were won.
 */
export function CardMoments({ card, color, tally: showTally = true }: { card: string; color: string; tally?: boolean }) {
  const [rows, setRows] = useState<CardMoment[] | null>(null);
  useEffect(() => {
    let live = true;
    cardMoments(card)
      .then((r) => live && setRows(r))
      .catch(() => live && setRows([]));
    return () => {
      live = false;
    };
  }, [card]);

  if (!rows) {
    return (
      <div className="mt-4 space-y-2" aria-busy="true">
        {[0, 1].map((i) => (
          <span key={i} className="block h-12 animate-pulse rounded-[0.875rem] bg-surface" />
        ))}
      </div>
    );
  }

  const stamps = rows.filter((r) => r.kind === "stamp");
  // the tampons numbered in the order they came: the oldest is 1
  const order = new Map(stamps.map((r, i) => [r.id, stamps.length - i]));
  const tally = [...stamps.reduce((m, r) => (r.item ? m.set(r.item, (m.get(r.item) ?? 0) + 1) : m), new Map<string, number>())].sort((a, b) => b[1] - a[1]);

  return (
    <section className="mt-4">
      <h3 className="mb-2 flex items-center justify-between px-0.5 text-[0.9375rem] font-bold">
        {say.title}
        <span className="num text-[0.8125rem] font-semibold text-muted">{stamps.length}</span>
      </h3>
      {showTally && tally.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {tally.map(([name, n]) => (
            <span key={name} className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[0.8438rem] font-bold" style={{ background: `color-mix(in oklab, ${color} 14%, white)`, color }}>
              <bdi>{name}</bdi>
              <span className="num rounded-full bg-white/80 px-1.5 text-[0.75rem]">×{n}</span>
            </span>
          ))}
        </div>
      )}
      {rows.length === 0 ? (
        <p className="rounded-[0.875rem] bg-surface px-4 py-3 text-center text-[0.875rem] text-muted shadow-card">{say.none}</p>
      ) : (
        <ul data-list className="max-h-[30dvh] divide-y divide-line overflow-y-auto overscroll-contain rounded-[1rem] bg-surface shadow-card">
          {rows.map((r) =>
            r.kind === "stamp" ? (
              <li key={r.id} className="flex items-center gap-3 px-3.5 py-2.5">
                <span className="num grid size-9 shrink-0 place-items-center rounded-full text-[0.875rem] font-bold text-white" style={{ background: color }}>
                  {order.get(r.id)}
                </span>
                <span className={`min-w-0 flex-1 truncate text-[0.9688rem] ${r.item ? "font-bold text-ink" : "font-medium text-muted"}`}>
                  <bdi>{r.item ?? say.stamp}</bdi>
                </span>
                <span className="shrink-0 text-[0.75rem] tabular-nums text-muted">{when(r.at)}</span>
              </li>
            ) : (
              <li key={r.id} className="flex items-center gap-3 bg-coral-soft/50 px-3.5 py-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-coral-soft">
                  <Icon3D name="gift" size={22} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-bold text-coral">{fill(r.given ? say.given : say.won, { gift: r.gift ?? "" })}</span>
                <span className="shrink-0 text-[0.75rem] tabular-nums text-muted">{when(r.at)}</span>
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
}
