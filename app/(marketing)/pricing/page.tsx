import type { Metadata } from "next";
import { PageIntro } from "@/components/marketing/PageIntro";
import { PlanCards } from "@/components/marketing/Plans";
import { CtaBand, Faq, SectionHead } from "@/components/marketing/Section";
import { PLANS, TRIAL_DAYS } from "@/lib/constants";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t, fill, path } = await getI18n();
  return {
    title: t.nav.site.pricing,
    description: fill(t.marketing.meta.pricingDescription, { six: PLANS.six_month.price, year: PLANS.yearly.price, days: TRIAL_DAYS }),
    alternates: { canonical: path("/pricing"), languages: { fr: "/pricing", "ar-TN": "/tn/pricing", "x-default": "/pricing" } },
  };
}

export default async function PricingPage() {
  const { t, fill } = await getI18n();

  return (
    <>
      <PageIntro eyebrow={t.nav.site.pricing} title={t.marketing.pricing.pageTitle}>
        {fill(t.marketing.pricing.pageLead, { days: TRIAL_DAYS })}
      </PageIntro>

      <section className="border-t border-line bg-canvas">
        <div className="mx-auto max-w-3xl px-5 py-14 sm:py-20">
          <PlanCards />
          <p className="mt-6 text-center text-sm text-muted">{t.marketing.pricing.note}</p>
        </div>
      </section>

      <section className="border-t border-line bg-white">
        <div className="mx-auto max-w-2xl px-5 py-16 sm:py-24">
          <SectionHead title={t.marketing.faq.title} />
          <div className="mt-10">
            <Faq skip={1} />
          </div>
        </div>
      </section>

      <section className="bg-white px-4 pb-16 sm:px-6 sm:pb-24">
        <CtaBand />
      </section>
    </>
  );
}
