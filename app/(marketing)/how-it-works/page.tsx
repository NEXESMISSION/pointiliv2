import type { Metadata } from "next";
import { Clock, ShieldCheck, Smartphone, type LucideIcon } from "lucide-react";
import { PageIntro } from "@/components/marketing/PageIntro";
import { CtaBand, SectionHead } from "@/components/marketing/Section";
import { StepVisual, demoQr } from "@/components/marketing/Showcase";
import { getI18n } from "@/lib/i18n/server";
import type { Messages } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t, path } = await getI18n();
  return {
    title: t.nav.site.howItWorks,
    description: t.marketing.meta.howDescription,
    alternates: { canonical: path("/how-it-works"), languages: { "ar-TN": "/how-it-works", fr: "/fr/how-it-works", "x-default": "/how-it-works" } },
  };
}

const STEPS = [
  { visual: "qr", title: "qrTitle", shop: "qrShop", customer: "qrCustomer" },
  { visual: "scan", title: "scanTitle", shop: "scanShop", customer: "scanCustomer" },
  { visual: "stamp", title: "stampTitle", shop: "stampShop", customer: "stampCustomer" },
  { visual: "reward", title: "rewardTitle", shop: "rewardShop", customer: "rewardCustomer" },
] as const;

const FAIR = [
  { icon: ShieldCheck, title: "fairQrTitle", text: "fairQrText" },
  { icon: Clock, title: "fairCooldownTitle", text: "fairCooldownText" },
  { icon: Smartphone, title: "fairInstallTitle", text: "fairInstallText" },
] as const satisfies readonly { icon: LucideIcon; title: string; text: string }[];

export default async function HowItWorksPage() {
  const qr = await demoQr();
  const { t, fill } = await getI18n();
  const h: Messages["marketing"]["howPage"] = t.marketing.howPage;

  return (
    <>
      <PageIntro eyebrow={t.nav.site.howItWorks} title={h.title}>
        {h.lead}
      </PageIntro>

      <section className="border-t border-line bg-canvas">
        <ol className="mx-auto max-w-3xl space-y-4 px-5 py-14 sm:py-20">
          {STEPS.map((s, i) => (
            <li key={s.visual} className="grid gap-2 rounded-2xl border border-line bg-white p-2 shadow-card sm:grid-cols-[15rem_1fr] sm:items-center">
              <StepVisual step={s.visual} qr={qr} />
              <div className="px-3 pb-4 pt-3 sm:px-5 sm:py-4">
                <p className="text-xs font-semibold text-brand-600">{fill(t.marketing.how.step, { n: i + 1 })}</p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink">{h[s.title]}</h2>
                <dl className="mt-3 space-y-2.5 text-sm leading-relaxed">
                  <div className="flex gap-3">
                    <dt className="w-[4.5rem] shrink-0 pt-px text-xs font-semibold uppercase tracking-wide text-muted">{h.shop}</dt>
                    <dd className="text-body">{h[s.shop]}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-[4.5rem] shrink-0 pt-px text-xs font-semibold uppercase tracking-wide text-muted">{h.customer}</dt>
                    <dd className="text-body">{h[s.customer]}</dd>
                  </div>
                </dl>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-line bg-white">
        <div className="mx-auto max-w-5xl px-5 py-16 sm:py-24">
          <SectionHead eyebrow={h.fairEyebrow} title={h.fairTitle} />
          <ul className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-line bg-line shadow-card sm:mt-14 sm:grid-cols-3 [&>li]:bg-white">
            {FAIR.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.title} className="p-6">
                  <span className="grid size-9 place-items-center rounded-lg border border-line text-brand-600">
                    <Icon className="size-[18px]" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-[15px] font-semibold text-ink">{h[item.title]}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{h[item.text]}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="bg-white px-4 pb-16 sm:px-6 sm:pb-24">
        <CtaBand title={t.marketing.cta.ready} />
      </section>
    </>
  );
}
