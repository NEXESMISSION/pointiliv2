import Link from "next/link";
import { ChevronRight } from "lucide-react";

/** A screen's top: a round back button and the title, large. */
export function Top({ back, title, hint, children }: { back?: string; title: string; hint?: string; children?: React.ReactNode }) {
  return (
    <header className="pt-2">
      {back && (
        <Link href={back} className="press grid size-11 place-items-center rounded-full bg-surface shadow-card" aria-label="back">
          <ChevronRight className="size-5" />
        </Link>
      )}
      <h1 className="mt-5 text-[30px] font-bold leading-tight">{title}</h1>
      {hint && <p className="mt-1 text-[15.5px] text-muted">{hint}</p>}
      {children}
    </header>
  );
}
