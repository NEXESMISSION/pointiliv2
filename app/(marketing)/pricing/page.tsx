import type { Metadata } from "next";
import { PageIntro } from "@/components/marketing/PageIntro";
import { PlanCards } from "@/components/marketing/Plans";
import { CtaBand, Faq, FAQ, SectionHead } from "@/components/marketing/Section";
import { PLANS, TRIAL_DAYS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Pricing",
  description: `Two simple Pointili plans: ${PLANS.six_month.price} TND for 6 months or ${PLANS.yearly.price} TND per year. Start with a ${TRIAL_DAYS}-day free trial, no card required.`,
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <>
      <PageIntro eyebrow="Pricing" title="Simple pricing. No surprises.">
        Start with a {TRIAL_DAYS}-day free trial. No card required.
      </PageIntro>

      <section className="border-t border-line bg-canvas">
        <div className="mx-auto max-w-3xl px-5 py-14 sm:py-20">
          <PlanCards />
          <p className="mt-6 text-center text-sm text-muted">Every plan includes all features. Pay by bank transfer, D17 or cash.</p>
        </div>
      </section>

      <section className="border-t border-line bg-white">
        <div className="mx-auto max-w-2xl px-5 py-16 sm:py-24">
          <SectionHead title="Questions, answered" />
          <div className="mt-10">
            <Faq items={FAQ.slice(1)} />
          </div>
        </div>
      </section>

      <section className="bg-white px-4 pb-16 sm:px-6 sm:pb-24">
        <CtaBand />
      </section>
    </>
  );
}
