import type { ReactNode } from "react";

/** Light, centred title band for inner marketing pages. */
export function PageIntro({ eyebrow, title, children, footer, className = "" }: { eyebrow: string; title: ReactNode; children?: ReactNode; footer?: ReactNode; className?: string }) {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-full bg-gradient-to-b from-brand-50 to-transparent" />
      <div className={`relative mx-auto max-w-3xl px-5 pb-12 pt-10 text-center sm:pb-16 sm:pt-16 ${className}`}>
        <p className="text-sm font-semibold text-brand-600">{eyebrow}</p>
        <h1 className="mx-auto mt-2 max-w-2xl text-[2.25rem] font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl">{title}</h1>
        {children && <div className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">{children}</div>}
        {footer && <div className="mt-7 flex justify-center">{footer}</div>}
      </div>
    </section>
  );
}
