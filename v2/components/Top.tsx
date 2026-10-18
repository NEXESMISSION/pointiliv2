import { Back } from "@/components/Back";

/** A screen's top: the one back button of the app (components/Back) — and, on
 *  a list screen, the title under it. */
export function Top({ back, title, hint, end, children }: { back?: string; title?: string; hint?: string; end?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="shrink-0 pt-2">
      <div className="flex items-center justify-between gap-3">
        {back ? <Back home={back} /> : <span className="block size-11" aria-hidden />}
        {end}
      </div>
      {title && <Heading title={title} hint={hint} className="mt-[2.2dvh]" />}
      {children}
    </header>
  );
}

/** A title, large, and its one line of help. */
export function Heading({ title, hint, className = "", children }: { title: string; hint?: string; className?: string; children?: React.ReactNode }) {
  return (
    <div className={className}>
      <h1 className="text-[1.625rem] font-bold leading-tight">{title}</h1>
      {hint && <p className="mt-1 text-[0.9375rem] text-muted">{hint}</p>}
      {children}
    </div>
  );
}
