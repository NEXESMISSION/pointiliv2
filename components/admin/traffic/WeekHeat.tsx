"use client";

import { useMemo, useState } from "react";
import { useT } from "@/components/i18n/Provider";
import { HEAT_STEPS, heatColor, type HeatCell } from "./model";

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;
/** An isolated left-to-right run: inside an Arabic line, "20:00–21:00" would otherwise read backwards. */
const ltr = (s: string) => `${String.fromCodePoint(0x2066)}${s}${String.fromCodePoint(0x2069)}`;

/**
 * Weekday × hour, Tunis time: when visits begin, or when shops give stamps.
 * One hue, light to dark; an empty hour stays grey. The line above the grid
 * says the busiest hour, or the one under the finger.
 */
export function WeekHeat({ visits, stamps }: { visits: HeatCell[]; stamps: HeatCell[] }) {
  const { t, count, fill } = useT();
  const w = t.admin.traffic;
  const [metric, setMetric] = useState<"visits" | "stamps">("visits");
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null);
  const cells = metric === "visits" ? visits : stamps;
  const tip = metric === "visits" ? w.tipVisits : w.tipStamps;

  const { grid, max, peak } = useMemo(() => {
    const g = new Map<string, number>();
    let m = 0;
    let top: HeatCell | null = null;
    for (const c of cells) {
      g.set(`${c.d}-${c.h}`, c.n);
      if (c.n > m) {
        m = c.n;
        top = c;
      }
    }
    return { grid: g, max: m, peak: top };
  }, [cells]);

  const dayName = (d: number) => (w.days as Record<string, string>)[`d${d}`] ?? "";
  const shortDay = (d: number) => (w.daysShort as Record<string, string>)[`d${d}`] ?? "";

  let line: string;
  if (hover) {
    const n = grid.get(`${hover.d}-${hover.h}`) ?? 0;
    line = `${dayName(hover.d)} · ${ltr(`${hh(hover.h)}–${hh((hover.h + 1) % 24)}`)} · ${count(tip, n)}`;
  } else if (peak) {
    line = fill(w.heatPeak, { day: dayName(peak.d), hour: hh(peak.h) });
  } else {
    line = w.heatNone;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex gap-1 rounded-xl bg-black/[0.045] p-1" role="tablist">
          {(["visits", "stamps"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={metric === k}
              onClick={() => setMetric(k)}
              className={`h-7 rounded-lg px-3 text-[13px] font-medium transition-colors ${metric === k ? "bg-white text-ink shadow-card" : "text-muted hover:text-ink"}`}
            >
              {k === "visits" ? w.heatVisits : w.heatStamps}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 text-[11px] text-muted" aria-hidden>
          <span>{w.less}</span>
          {HEAT_STEPS.map((c) => (
            <span key={c} className="size-2.5 rounded-[3px]" style={{ background: c }} />
          ))}
          <span>{w.more}</span>
        </div>
      </div>

      <p className="mt-3 h-5 truncate text-center text-[13px] font-medium text-ink" aria-live="polite">
        {line}
      </p>

      <div dir="ltr" className="mt-2 grid gap-[2px]" style={{ gridTemplateColumns: "2.6rem repeat(24, minmax(0, 1fr))" }} onPointerLeave={() => setHover(null)} role="grid">
        <span />
        {HOURS.map((h) => (
          <span key={h} className="text-center text-[10px] leading-4 text-faint tabular">
            {h % 3 === 0 ? h : ""}
          </span>
        ))}
        {DAYS.map((d) => (
          <div key={d} className="contents" role="row">
            <span className="self-center truncate pe-1 text-end text-[11px] text-muted" role="rowheader">
              {shortDay(d)}
            </span>
            {HOURS.map((h) => {
              const n = grid.get(`${d}-${h}`) ?? 0;
              const on = hover?.d === d && hover.h === h;
              return (
                <button
                  key={h}
                  type="button"
                  role="gridcell"
                  aria-label={`${dayName(d)} ${hh(h)}: ${count(tip, n)}`}
                  onPointerEnter={() => setHover({ d, h })}
                  onFocus={() => setHover({ d, h })}
                  onClick={() => setHover({ d, h })}
                  className={`aspect-square rounded-[3px] outline-none ${on ? "ring-2 ring-ink ring-offset-1" : ""}`}
                  style={{ background: heatColor(n, max) }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-[11px] text-faint">{w.heatNote}</p>
    </div>
  );
}
