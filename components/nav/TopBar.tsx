import Link from "next/link";
import type { ReactNode } from "react";
import { BackButton } from "./BackButton";

/**
 * Page header. The back button is always offered: it returns to the previous
 * screen of this visit, or to `back` (the parent page) when opened directly.
 */
export function TopBar({ title, back, action, subtitle, large = false }: { title: ReactNode; back?: string; action?: ReactNode; subtitle?: ReactNode; large?: boolean }) {
  return (
    <header className="mb-5 flex items-center gap-3 pt-2">
      <BackButton fallback={back} />
      <div className="min-w-0 flex-1">
        <h1 className={`truncate font-bold tracking-tight text-ink ${large ? "text-2xl" : "text-xl"}`}>{title}</h1>
        {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

/** Link-based filter tabs (state lives in the URL, so it survives refresh and back). */
export function Segmented({ items, active }: { items: { href: string; label: string; key: string }[]; active: string }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {items.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          scroll={false}
          replace
          className={`h-9 shrink-0 rounded-full px-4 text-sm font-semibold leading-9 transition ${it.key === active ? "bg-brand-600 text-white shadow-brand" : "border border-line bg-white text-body hover:bg-canvas"}`}
          aria-current={it.key === active ? "true" : undefined}
        >
          {it.label}
        </Link>
      ))}
    </div>
  );
}
