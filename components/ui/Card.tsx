import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

export function Card({ className = "", children, ...rest }: ComponentProps<"div">) {
  return (
    <div className={`rounded-3xl border border-line/80 bg-white shadow-card ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, action, className = "" }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={`mb-3 flex items-center justify-between gap-3 ${className}`}>
      <h2 className="text-base font-semibold text-ink">{children}</h2>
      {action}
    </div>
  );
}

/** A tappable settings/list row. */
export function ListRow({ href, icon, title, subtitle, trailing, danger, onClick }: { href?: string; icon?: ReactNode; title: ReactNode; subtitle?: ReactNode; trailing?: ReactNode; danger?: boolean; onClick?: () => void }) {
  const inner = (
    <>
      {icon && <span className={`grid size-10 shrink-0 place-items-center rounded-2xl ${danger ? "bg-danger-50 text-danger-600" : "bg-canvas text-body"}`}>{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[15px] font-medium ${danger ? "text-danger-600" : "text-ink"}`}>{title}</span>
        {subtitle && <span className="block truncate text-sm text-muted">{subtitle}</span>}
      </span>
      {trailing ?? (href ? <ChevronRight className="size-5 shrink-0 text-faint" /> : null)}
    </>
  );
  const cls = "flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-canvas/70";
  if (href) return <Link href={href} className={cls}>{inner}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={cls}>{inner}</button>;
  return <div className={cls}>{inner}</div>;
}

export function Divided({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <Card className={`divide-y divide-line/80 overflow-hidden ${className}`}>{children}</Card>;
}
