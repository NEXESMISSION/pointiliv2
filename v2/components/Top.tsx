import Link from "next/link";
import { ChevronRight } from "lucide-react";

/** A screen's top: a round back button — and, on a list screen, the title under it. */
export function Top({ back, title, hint, children }: { back?: string; title?: string; hint?: string; children?: React.ReactNode }) {
  return (
    <header className="shrink-0 pt-2">
      {back ? (
        <Link href={back} className="press grid size-11 place-items-center rounded-full bg-surface shadow-card" aria-label="back">
          <ChevronRight className="size-5" />
        </Link>
      ) : (
        <span className="block size-11" aria-hidden />
      )}
      {title && <Heading title={title} hint={hint} className="mt-[2.2dvh]" />}
      {children}
    </header>
  );
}

/** A title, large, and its one line of help. */
export function Heading({ title, hint, className = "", children }: { title: string; hint?: string; className?: string; children?: React.ReactNode }) {
  return (
    <div className={className}>
      <h1 className="text-[1.875rem] font-bold leading-tight">{title}</h1>
      {hint && <p className="mt-1 text-[0.9688rem] text-muted">{hint}</p>}
      {children}
    </div>
  );
}
