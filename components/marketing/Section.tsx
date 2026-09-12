import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/Logo";
import { LinkButton } from "@/components/ui/Button";
import { TRIAL_DAYS } from "@/lib/constants";
import { getI18n } from "@/lib/i18n/server";

/** Centred section heading: small eyebrow, title, one line of support. */
export function SectionHead({ eyebrow, title, children }: { eyebrow?: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {eyebrow && <p className="text-[13px] font-semibold text-brand-600">{eyebrow}</p>}
      <h2 className="mt-2 text-[1.9rem] font-bold leading-[1.12] tracking-[-0.03em] text-ink sm:text-[2.5rem]">{title}</h2>
      {children && <p className="mx-auto mt-3 max-w-lg text-base leading-relaxed text-muted sm:text-[17px]">{children}</p>}
    </div>
  );
}

/** Faint dot grid that fades out — the only decoration on light sections. */
export function DotGrid({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 top-0 bg-[radial-gradient(#d9d9e1_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black_0%,transparent_100%)] ${className}`}
    />
  );
}

/** The questions, in the order they are asked. Pricing skips the first (it is a landing-page question). */
export const FAQ_KEYS = ["app", "cheat", "change", "pay", "end"] as const;

export async function Faq({ skip = 0 }: { skip?: number }) {
  const { t } = await getI18n();
  const items = FAQ_KEYS.slice(skip).map((key) => t.marketing.faq.items[key]);
  return (
    <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white text-start shadow-card">
      {items.map((item) => (
        <details key={item.q} className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[15px] font-medium text-ink transition-colors hover:bg-canvas/60 [&::-webkit-details-marker]:hidden">
            {item.q}
            <Plus className="size-4 shrink-0 text-muted transition-transform group-open:rotate-45" aria-hidden />
          </summary>
          <p className="-mt-1 px-5 pb-5 text-[15px] leading-relaxed text-muted">{item.a}</p>
        </details>
      ))}
    </div>
  );
}

/** Closing call to action: one dark band, one decision. */
export async function CtaBand({ title }: { title?: string }) {
  const { t, fill } = await getI18n();
  return (
    <div className="relative isolate mx-auto max-w-5xl overflow-hidden rounded-3xl bg-ink px-6 py-12 text-center sm:py-16">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(70%_90%_at_50%_0%,rgba(101,53,224,0.55),transparent_70%)]" />
      <LogoMark tone="white" size={46} className="mx-auto" />
      <h2 className="mx-auto mt-6 max-w-md text-[1.75rem] font-bold leading-tight tracking-[-0.03em] text-white sm:text-4xl">{title ?? t.marketing.cta.title}</h2>
      <p className="mt-3 text-[15px] text-white/65">{fill(t.marketing.cta.note, { days: TRIAL_DAYS })}</p>
      <div className="mx-auto mt-8 flex max-w-xs flex-col gap-2.5 sm:max-w-none sm:flex-row sm:justify-center">
        <LinkButton href="/register" size="lg" className="!bg-white !text-ink !shadow-none hover:!bg-white/90">
          {t.nav.site.startFree}
        </LinkButton>
        <LinkButton href="/customer/register" size="lg" variant="ghost" className="!text-white/80 hover:!bg-white/10 hover:!text-white">
          {t.marketing.cta.collector}
        </LinkButton>
      </div>
    </div>
  );
}
