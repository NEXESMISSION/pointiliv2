import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

export function Card({ className = "", children, ...rest }: ComponentProps<"div">) {
  return (
    <div className={`rounded-2xl bg-surface shadow-card ${className}`} {...rest}>
      {children}
    </div>
  );
}

/** A section heading above a group, the way the round-2 screens set them. */
export function SectionTitle({ children, action, className = "" }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={`mb-2.5 flex items-baseline justify-between gap-3 px-1 ${className}`}>
      <h2 className="text-[17px] font-bold text-ink">{children}</h2>
      {action && <div className="text-sm font-medium text-brand-600">{action}</div>}
    </div>
  );
}

/** A tappable settings/list row. */
export function ListRow({ href, icon, title, subtitle, trailing, danger, onClick }: { href?: string; icon?: ReactNode; title: ReactNode; subtitle?: ReactNode; trailing?: ReactNode; danger?: boolean; onClick?: () => void }) {
  const inner = (
    <>
      {icon && <span className={`grid size-9 shrink-0 place-items-center rounded-[11px] ${danger ? "bg-danger-50 text-danger-600" : "bg-surface-2 text-body"} [&>svg]:size-[18px] [&>img]:size-[26px]`}>{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[15px] font-medium ${danger ? "text-danger-600" : "text-ink"}`}>{title}</span>
        {subtitle && <span className="block truncate text-[12.5px] text-muted">{subtitle}</span>}
      </span>
      {trailing ?? (href ? <ChevronRight className="rtl:-scale-x-100 size-4 shrink-0 text-faint" /> : null)}
    </>
  );
  const cls = "flex min-h-[58px] w-full items-center gap-3 px-4 py-2.5 text-start transition-colors hover:bg-surface-2/70 active:bg-surface-2";
  if (href) return <Link href={href} className={cls}>{inner}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={cls}>{inner}</button>;
  return <div className={cls}>{inner}</div>;
}

export function Divided({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <Card className={`divide-y divide-line overflow-hidden ${className}`}>{children}</Card>;
}
