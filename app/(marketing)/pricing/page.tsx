import type { Metadata } from "next";
import { ChevronDown, Gift } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { PageIntro } from "@/components/marketing/PageIntro";
import { PlanCards } from "@/components/marketing/Plans";
import { PLANS, TRIAL_DAYS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Pricing",
  description: `Two simple Pointili plans: ${PLANS.six_month.price} TND for 6 months or ${PLANS.yearly.price} TND per year. Start with a ${TRIAL_DAYS}-day free trial, no card required.`,
  alternates: { canonical: "/pricing" },
};

const FAQ = [
  {
    q: "How do customers join?",
    a: "They scan your Pointili QR with their phone camera and sign up with their phone number. It takes under a minute, and there's no app to download.",
  },
  {
    q: "How do I pay?",
    a: "Choose a plan in your dashboard and pay by bank transfer, D17 or cash; your plan activates as soon as the payment is confirmed.",
  },
  {
    q: "What happens when my plan expires?",
    a: "Your QR pauses until you renew; your customers keep their stamps.",
  },
];

export default function PricingPage() {
  return (
    <>
      <PageIntro eyebrow="Pricing" title="Simple pricing. No surprises." className="pb-20 sm:pb-28">
        Start with a {TRIAL_DAYS}-day free trial. No card required.
      </PageIntro>

      <section className="relative mx-auto -mt-10 max-w-4xl px-4 sm:-mt-16 sm:px-6">
        <PlanCards />
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-line/80 bg-white px-4 py-3.5 text-[15px] text-body shadow-card sm:items-center sm:px-5">
          <Gift className="mt-0.5 size-5 shrink-0 text-brand-600 sm:mt-0" aria-hidden />
          <p>
            <span className="font-semibold text-ink">Start with a {TRIAL_DAYS}-day free trial.</span> No card required. Pick a plan whenever you&apos;re ready.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Questions</h2>
        <div className="mt-6 space-y-3">
          {FAQ.map((item, i) => (
            <details key={item.q} className="group rounded-2xl border border-line/80 bg-white shadow-card" open={i === 0}>
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 text-base font-semibold text-ink [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown className="size-5 shrink-0 text-faint transition group-open:rotate-180" aria-hidden />
              </summary>
              <p className="px-5 pb-5 text-[15px] leading-relaxed text-muted">{item.a}</p>
            </details>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-lg font-bold text-ink">Ready to bring customers back?</p>
          <LinkButton href="/register" size="lg" className="mt-4 w-full sm:w-auto">
            Start free
          </LinkButton>
        </div>
      </section>
    </>
  );
}
