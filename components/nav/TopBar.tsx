import Link from "next/link";
import type { ReactNode } from "react";
import { BackButton } from "./BackButton";

/**
 * Page header: back on the left, title centred, optional action on the right.
 * The back button returns to the previous screen of this visit, or to `back`
 * (the parent page) when the page was opened directly.
 */
export function TopBar({ title, back, action, subtitle, large = false }: { title: ReactNode; back?: string; action?: ReactNode; subtitle?: ReactNode; large?: boolean }) {
  return (
    <header className="mb-5 grid grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-2 pt-1">
      <span className="flex justify-start">
        <BackButton fallback={back} />
      </span>
      <div className="min-w-0 text-center">
        <h1 className={`truncate font-semibold tracking-tight text-ink ${large ? "text-lg" : "text-[17px]"}`}>{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
      </div>
      <span className="flex justify-end">{action}</span>
    </header>
  );
}

/** Link-based filter tabs as a quiet segmented control (state lives in the URL). */
export function Segmented({ items, active }: { items: { href: string; label: string; key: string }[]; active: string }) {
  return (
    <div className="no-scrollbar -mx-4 overflow-x-auto px-4">
      <div className="inline-flex min-w-full gap-1 rounded-xl bg-black/[0.045] p-1 sm:min-w-0">
        {items.map((it) => (
          <Link
            key={it.key}
            href={it.href}
            scroll={false}
            replace
            className={`h-8 flex-1 shrink-0 whitespace-nowrap rounded-lg px-3 text-center text-[13px] font-medium leading-8 transition-colors ${it.key === active ? "bg-white text-ink shadow-card" : "text-muted hover:text-ink"}`}
            aria-current={it.key === active ? "true" : undefined}
          >
            {it.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
