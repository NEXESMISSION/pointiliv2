import type { ReactNode } from "react";
import { DotGrid } from "./Section";

/** Centred title band for inner marketing pages. */
export function PageIntro({ eyebrow, title, children, footer, className = "" }: { eyebrow: string; title: ReactNode; children?: ReactNode; footer?: ReactNode; className?: string }) {
  return (
    <section className="relative overflow-hidden bg-white">
      <DotGrid className="h-full" />
      <div className={`relative mx-auto max-w-3xl px-5 pb-12 pt-12 text-center sm:pb-16 sm:pt-20 ${className}`}>
        <p className="text-[13px] font-semibold text-brand-600">{eyebrow}</p>
        <h1 className="mx-auto mt-3 max-w-2xl text-[2.35rem] font-bold leading-[1.06] tracking-[-0.035em] text-ink sm:text-[3.25rem]">{title}</h1>
        {children && <div className="mx-auto mt-4 max-w-lg text-[17px] leading-relaxed text-muted">{children}</div>}
        {footer && <div className="mt-8 flex justify-center">{footer}</div>}
      </div>
    </section>
  );
}
