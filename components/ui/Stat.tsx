import type { ReactNode } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

const tints = {
  brand: { box: "bg-brand-50", icon: "bg-white text-brand-600" },
  green: { box: "bg-success-50", icon: "bg-white text-success-600" },
  amber: { box: "bg-warning-50", icon: "bg-white text-warning-700" },
  rose: { box: "bg-[#FFEEF6]", icon: "bg-white text-[#DB2777]" },
  white: { box: "bg-white border border-line/80 shadow-card", icon: "bg-canvas text-body" },
} as const;

export function StatCard({ label, value, icon, tint = "white", change, sub }: { label: string; value: ReactNode; icon?: ReactNode; tint?: keyof typeof tints; change?: number | null; sub?: ReactNode }) {
  const t = tints[tint];
  return (
    <div className={`min-w-0 rounded-3xl p-4 ${t.box}`}>
      {icon && <span className={`mb-3 grid size-10 place-items-center rounded-xl ${t.icon}`}>{icon}</span>}
      <span className="block text-[1.7rem] font-bold leading-none tracking-tight text-ink tabular">{value}</span>
      <span className="mt-1.5 block text-[13px] font-medium leading-snug text-body">{label}</span>
      {(change != null || sub) && (
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          {change != null && (
            <span className={`inline-flex items-center gap-0.5 font-semibold ${change >= 0 ? "text-success-600" : "text-danger-600"}`}>
              {change >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
              {Math.abs(change)}%
            </span>
          )}
          {sub && <span className="text-muted">{sub}</span>}
        </div>
      )}
    </div>
  );
}

export function ProgressBar({ value, max, color = "var(--color-brand-600)", className = "" }: { value: number; max: number; color?: string; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-line/80 ${className}`} role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(value, max)}>
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
