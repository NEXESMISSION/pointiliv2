import type { ReactNode } from "react";

/** Dark title band that continues the header on inner marketing pages. */
export function PageIntro({ eyebrow, title, children, footer, className = "" }: { eyebrow: string; title: ReactNode; children?: ReactNode; footer?: ReactNode; className?: string }) {
  return (
    <section className="relative overflow-hidden bg-[#0B0D1A] text-white">
      <div aria-hidden className="pointer-events-none absolute -top-32 right-[-6rem] size-96 rounded-full bg-amber-400/10 blur-3xl" />
      <div className={`relative mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-14 ${className}`}>
        <p className="text-sm font-semibold text-brand-300">{eyebrow}</p>
        <h1 className="mt-2 max-w-2xl text-[2.25rem] font-extrabold leading-[1.08] tracking-tight sm:text-5xl">{title}</h1>
        {children && <div className="mt-4 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">{children}</div>}
        {footer && <div className="mt-7">{footer}</div>}
      </div>
    </section>
  );
}
