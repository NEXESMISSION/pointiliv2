import Link from "next/link";
import type { ReactNode } from "react";
import { BackButton } from "./BackButton";

/**
 * Page header: the title is centred on the page, the back button sits at the
 * start and the optional action at the end — both pinned to the title's own
 * line, so a two-line header never drags them out of alignment.
 */
export function TopBar({ title, back, action, subtitle, large = false }: { title: ReactNode; back?: string; action?: ReactNode; subtitle?: ReactNode; large?: boolean }) {
  return (
    <header className="relative mb-5 pt-1 text-center">
      <span className="absolute start-0 top-1 flex h-11 items-center">
        <BackButton fallback={back} />
      </span>
      {action && <span className="absolute end-0 top-1 flex h-11 items-center">{action}</span>}
      <h1 className={`flex h-11 items-center justify-center px-12 font-semibold tracking-tight text-ink ${large ? "text-lg" : "text-[17px]"}`}>
        <span className="truncate">{title}</span>
      </h1>
      {subtitle && <p className="mx-auto max-w-[calc(100%-3rem)] truncate text-xs text-muted">{subtitle}</p>}
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
