import type { ReactNode } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

const tints = {
  brand: "text-brand-600",
  green: "text-success-600",
  amber: "text-warning-700",
  rose: "text-[#DB2777]",
  white: "text-muted",
} as const;

/** Compact metric: small label + icon on top, the number below. */
export function StatCard({ label, value, icon, tint = "white", change, sub }: { label: string; value: ReactNode; icon?: ReactNode; tint?: keyof typeof tints; change?: number | null; sub?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-white p-3 text-center shadow-card">
      <div className="flex items-center justify-center gap-1.5">
        <span className="truncate text-[13px] font-medium text-muted">{label}</span>
        {icon && <span className={`shrink-0 [&>svg]:size-4 ${tints[tint]}`}>{icon}</span>}
      </div>
      <span className="mt-1.5 block text-2xl font-semibold leading-none tracking-tight text-ink tabular">{value}</span>
      {(change != null || sub) && (
        <div className="mt-1.5 flex items-center justify-center gap-1.5 text-xs">
          {change != null && (
            <span className={`inline-flex items-center gap-0.5 font-semibold ${change >= 0 ? "text-success-600" : "text-danger-600"}`}>
              {change >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              {Math.abs(change)}%
            </span>
          )}
          {sub && <span className="truncate text-muted">{sub}</span>}
        </div>
      )}
    </div>
  );
}

export function ProgressBar({ value, max, color = "var(--color-brand-600)", className = "" }: { value: number; max: number; color?: string; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-line ${className}`} role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(value, max)}>
      <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function Avatar({ label, size = 44, color = "var(--color-brand-600)", src }: { label: string; size?: number; color?: string; src?: string | null }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span className="grid shrink-0 place-items-center rounded-full font-semibold text-white" style={{ width: size, height: size, background: color, fontSize: size * 0.4 }} aria-hidden>
      {label}
    </span>
  );
}
