import Link from "next/link";
import type { ReactNode } from "react";
import { BAR } from "./model";

export type RankRow = { key: string; label: ReactNode; n: number; sub?: ReactNode; href?: string };

/**
 * A ranked list with its share drawn under each name: the number is always
 * written, the bar only helps the eye compare. One hue — rank is the order.
 */
export function RankList({ title, rows, empty, action }: { title: ReactNode; rows: RankRow[]; empty: ReactNode; action?: ReactNode }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div className="min-w-0 rounded-2xl bg-surface shadow-card p-3 shadow-card">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="truncate text-[13px] font-semibold text-muted">{title}</h2>
        {action}
      </div>
      {rows.length === 0 ? (
        <p className="py-2 text-center text-xs text-faint">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const inner = (
              <>
                <span className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate text-[13px] font-medium text-ink">{r.label}</span>
                  <span className="shrink-0 text-[13px] font-semibold text-ink tabular">{r.n}</span>
                </span>
                {r.sub && <span className="block truncate text-[11px] text-muted">{r.sub}</span>}
                <span className="mt-1 block h-1 overflow-hidden rounded-full bg-[#f1f0f5]">
                  <span className="block h-full rounded-full" style={{ width: `${Math.max(3, (r.n / max) * 100)}%`, background: BAR }} />
                </span>
              </>
            );
            return (
              <li key={r.key}>
                {r.href ? (
                  <Link href={r.href} className="-mx-1 block rounded-lg px-1 py-0.5 transition hover:bg-canvas">
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
