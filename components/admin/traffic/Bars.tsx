"use client";

import { useState } from "react";
import { useT } from "@/components/i18n/Provider";
import { BAR } from "./model";

type Point = { t: string; visitors: number; views: number };

/**
 * Visitors per day (or per hour): one series, one hue, no legend — the card's
 * title names it. Touch or hover a bar for its numbers.
 */
export function VisitorBars({ series, unit }: { series: Point[]; unit: "hour" | "day" }) {
  const { t, intl, count } = useT();
  const w = t.admin.traffic;
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...series.map((p) => p.visitors));
  const n = series.length || 1;
  const gap = n > 45 ? 1 : 2;

  const when = (p: Point, long = false) => {
    if (unit === "hour") return `${p.t.slice(11, 13)}:00`;
    const d = new Date(`${p.t}T12:00:00Z`);
    return new Intl.DateTimeFormat(intl, long ? { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" } : { day: "numeric", month: "short", timeZone: "UTC" }).format(d);
  };
  const ticks = n > 2 ? [0, Math.floor((n - 1) / 2), n - 1] : series.map((_, i) => i);
  const shown = active != null ? series[active] : null;

  return (
    <figure>
      <div className="flex h-5 items-center justify-center gap-2 text-xs" aria-live="polite">
        {shown ? (
          <>
            <b className="font-semibold text-ink">{when(shown, true)}</b>
            <span className="text-body">{count(w.tipVisitors, shown.visitors)}</span>
            <span className="text-faint">·</span>
            <span className="text-muted">{count(w.tipViews, shown.views)}</span>
          </>
        ) : null}
      </div>
      <div dir="ltr" className="relative mt-1 h-28 sm:h-36" onPointerLeave={() => setActive(null)}>
        {[0.25, 0.5, 0.75].map((f) => (
          <div key={f} className="pointer-events-none absolute inset-x-0 border-t border-line/70" style={{ top: `${f * 100}%` }} />
        ))}
        <div className="absolute inset-x-0 bottom-0 border-t border-line" />
        {series.every((p) => !p.visitors) && <p className="absolute inset-0 grid place-items-center text-xs text-faint">{w.emptyTitle}</p>}
        <div className="relative flex h-full items-end" style={{ gap }}>
          {series.map((p, i) => (
            <button
              key={p.t}
              type="button"
              aria-label={`${when(p, true)}: ${count(w.tipVisitors, p.visitors)}, ${count(w.tipViews, p.views)}`}
              onPointerEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              className="flex h-full min-w-0 flex-1 items-end outline-none"
            >
              <span
                className="block w-full rounded-t-[3px] transition-opacity"
                style={{
                  height: p.visitors ? `${Math.max(3, (p.visitors / max) * 100)}%` : "2px",
                  background: p.visitors ? BAR : "#e8e8ed",
                  opacity: active == null || active === i ? 1 : 0.45,
                }}
              />
            </button>
          ))}
        </div>
      </div>
      <figcaption dir="ltr" className="mt-1 flex justify-between text-[11px] text-muted">
        {ticks.map((i) => (
          <span key={i}>{series[i] ? when(series[i]!) : ""}</span>
        ))}
      </figcaption>
    </figure>
  );
}
