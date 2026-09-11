import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

/** Page header: optional back link, title, trailing action. */
export function TopBar({ title, back, action, subtitle, large = false }: { title: ReactNode; back?: string; action?: ReactNode; subtitle?: ReactNode; large?: boolean }) {
  return (
    <header className="mb-5 flex items-center gap-2 pt-2">
      {back && (
        <Link href={back} className="-ml-2 grid size-10 shrink-0 place-items-center rounded-xl text-ink hover:bg-white" aria-label="Back">
          <ChevronLeft className="size-6" />
        </Link>
      )}
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
