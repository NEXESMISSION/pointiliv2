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
    <header className="mb-6 grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-2 pt-2">
      <span className="flex justify-start">
        <BackButton fallback={back} />
      </span>
      <div className="min-w-0 text-center">
        <h1 className={`truncate font-bold tracking-tight text-ink ${large ? "text-xl" : "text-lg"}`}>{title}</h1>
        {subtitle && <p className="truncate text-[13px] text-muted">{subtitle}</p>}
      </div>
      <span className="flex justify-end">{action}</span>
    </header>
  );
}

/** Link-based filter tabs (state lives in the URL, so it survives refresh and back). */
export function Segmented({ items, active }: { items: { href: string; label: string; key: string }[]; active: string }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:justify-center">
      {items.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          scroll={false}
          replace
          className={`h-9 shrink-0 rounded-full px-4 text-sm font-semibold leading-9 transition ${it.key === active ? "bg-ink text-white" : "border border-line bg-white text-body hover:bg-canvas"}`}
          aria-current={it.key === active ? "true" : undefined}
        >
          {it.label}
        </Link>
      ))}
    </div>
  );
}
