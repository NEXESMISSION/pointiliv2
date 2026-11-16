import { Check, Crown } from "lucide-react";
import { fill, t } from "@/lib/t";

const day = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Tunis" }).format(new Date(iso));

/**
 * Paid, and not near its end: the subscription's card — what it gives — and until when, nothing to pay
 * (the steps come back a few days before the end: RENEW_DAYS, components/PaySteps).
 */
export function PayPaid({ paidUntil }: { paidUntil: string }) {
  return (
    <>
      <section className="relative mt-[1.6dvh] overflow-hidden rounded-[1.75rem] bg-[linear-gradient(140deg,#7c4dff,#6c47ff_45%,#3f22c9)] p-5 text-white">
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_0%_0%,rgb(255_255_255/0.25),transparent_60%)]" aria-hidden />
        <div className="relative flex items-start justify-between gap-3">
          <span className="min-w-0 text-[0.8125rem] font-semibold text-white/80">{t.payPlan}</span>
          {/* the owner screens' icons are line icons (components/Owner.tsx): on the purple card, white on its soft square */}
          <span className="grid size-12 shrink-0 place-items-center rounded-[0.875rem] bg-white/20">
            <Crown className="size-6" strokeWidth={2.2} />
          </span>
        </div>
        <ul className="relative mt-3 space-y-1.5">
          {t.payPerks.map((p) => (
            <li key={p} className="flex items-start gap-2 text-[0.8125rem] text-white/95">
              <Check className="mt-0.5 size-4 shrink-0" strokeWidth={3} /> {p}
            </li>
          ))}
        </ul>
      </section>
      <p className="mt-4 flex items-center justify-center gap-2 rounded-[1.25rem] bg-mint-soft px-4 py-3.5 text-[0.9375rem] font-bold text-mint">
        <Check className="size-5" strokeWidth={3} /> {fill(t.payPaidUntil, { date: day(paidUntil) })}
      </p>
    </>
  );
}
