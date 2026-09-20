import type { Metadata } from "next";
import Link from "next/link";
import { ChartColumn, ChevronRight, Palette, ShieldCheck, Users } from "lucide-react";
import { CardIcon } from "@/components/CardIcon";
import { LinkButton } from "@/components/ui/Button";
import { JsonLd } from "@/components/marketing/JsonLd";
import { PlanCards, PlanFeatures } from "@/components/marketing/Plans";
import { CtaBand, DotGrid, Faq, SectionHead } from "@/components/marketing/Section";
import { HeroShowcase, StepVisual, demoQr } from "@/components/marketing/Showcase";
import { getI18n } from "@/lib/i18n/server";
import type { Messages } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t, path } = await getI18n();
  return {
    title: { absolute: t.marketing.meta.homeTitle },
    description: t.marketing.meta.homeDescription,
    alternates: { canonical: path("/"), languages: { "ar-TN": "/", fr: "/fr", "x-default": "/" } },
  };
}

const MADE_FOR = [
  { icon: "coffee", key: "cafes" },
  { icon: "croissant", key: "bakeries" },
  { icon: "utensils", key: "restaurants" },
  { icon: "pizza", key: "pizzerias" },
  { icon: "scissors", key: "salons" },
  { icon: "ice-cream", key: "juice" },
  { icon: "dumbbell", key: "gyms" },
] as const;

const STEPS = [
  { visual: "qr", title: "qrTitle", text: "qrText" },
  { visual: "stamp", title: "stampTitle", text: "stampText" },
  { visual: "reward", title: "rewardTitle", text: "rewardText" },
] as const;

const FEATURES = [
  { icon: ShieldCheck, title: "secureTitle", text: "secureText" },
  { icon: Palette, title: "brandTitle", text: "brandText" },
  { icon: Users, title: "regularsTitle", text: "regularsText" },
  { icon: ChartColumn, title: "numbersTitle", text: "numbersText" },
] as const;

export default async function LandingPage() {
  const qr = await demoQr();
  const { t, fill, path } = await getI18n();
  const m: Messages["marketing"] = t.marketing;

  return (
    <>
      <JsonLd />

      {/* Hero */}
      <section className="relative overflow-hidden bg-white">
        <DotGrid className="h-[30rem]" />
        <div className="relative mx-auto max-w-3xl px-5 pt-12 text-center sm:pt-20">
          <Link href={path("/how-it-works")} className="inline-flex items-center gap-2 rounded-full border border-line bg-white py-1 ps-1 pe-3 text-[13px] text-body shadow-card transition-colors hover:border-brand-200">
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">{m.hero.badge}</span>
            {m.hero.badgeText}
            <ChevronRight className="rtl:-scale-x-100 size-3.5 text-muted" aria-hidden />
          </Link>
          <h1 className="mx-auto mt-6 max-w-[40rem] text-[2.6rem] font-bold leading-[1.03] tracking-[-0.045em] text-ink sm:text-[4rem]">{m.hero.title}</h1>
          <p className="mx-auto mt-5 max-w-md text-[17px] leading-relaxed text-muted sm:text-lg">{m.hero.subtitle}</p>
          <div className="mx-auto mt-8 flex max-w-xs flex-col gap-2.5 sm:max-w-none sm:flex-row sm:justify-center">
            <LinkButton href="/register" size="lg">
              {t.nav.site.startFree}
            </LinkButton>
            <LinkButton href="#how" variant="outline" size="lg">
              {m.hero.seeHow}
            </LinkButton>
          </div>
          <p className="mt-4 text-[13px] text-muted">{m.hero.note}</p>
        </div>
        <div className="relative mx-auto mt-12 max-w-[35rem] px-5 pb-16 sm:mt-16 sm:pb-24">
          <HeroShowcase qr={qr} />
        </div>
      </section>

      {/* Made for */}
      <section className="border-y border-line bg-canvas">
        <div className="mx-auto max-w-5xl px-5 py-7">
          <p className="text-center text-[13px] font-medium text-muted">{m.madeFor.title}</p>
          <ul className="mt-4 flex flex-wrap justify-center gap-2">
            {MADE_FOR.map((item) => (
              <li key={item.key} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-[13px] font-medium text-body">
                <CardIcon name={item.icon} className="size-3.5 text-muted" />
                {m.madeFor[item.key]}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-16 bg-white">
        <div className="mx-auto max-w-5xl px-5 py-16 sm:py-24">
          <SectionHead eyebrow={t.nav.site.howItWorks} title={m.how.title}>
            {m.how.lead}
          </SectionHead>
          <ol className="mt-10 grid gap-4 sm:mt-14 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.visual} className="rounded-2xl border border-line bg-white p-2 shadow-card">
                <StepVisual step={s.visual} qr={qr} />
                <div className="px-3 pb-4 pt-4 text-center md:text-start">
                  <p className="text-xs font-semibold text-brand-600">{fill(m.how.step, { n: i + 1 })}</p>
                  <h3 className="mt-1 text-base font-semibold text-ink">{m.how[s.title]}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{m.how[s.text]}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-8 text-center">
            <Link href={path("/how-it-works")} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
              {m.how.full} <ChevronRight className="rtl:-scale-x-100 size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-line bg-canvas">
        <div className="mx-auto max-w-5xl px-5 py-16 sm:py-24">
          <SectionHead eyebrow={m.features.eyebrow} title={m.features.title} />
          <ul className="mt-10 grid overflow-hidden rounded-2xl border border-line bg-line shadow-card sm:mt-14 sm:grid-cols-2 lg:grid-cols-4 [&>li]:bg-white gap-px">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <li key={f.title} className="p-6">
                  <span className="grid size-9 place-items-center rounded-lg border border-line text-brand-600">
                    <Icon className="size-[18px]" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-[15px] font-semibold text-ink">{m.features[f.title]}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{m.features[f.text]}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-line bg-white">
        <div className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
          <SectionHead eyebrow={t.nav.site.pricing} title={m.pricing.title}>
            {m.pricing.lead}
          </SectionHead>
          <div className="mt-10 sm:mt-14">
            <PlanCards compact />
          </div>
          <div className="mt-8">
            <PlanFeatures />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-line bg-canvas">
        <div className="mx-auto max-w-2xl px-5 py-16 sm:py-24">
          <SectionHead title={m.faq.title} />
          <div className="mt-10">
            <Faq />
          </div>
        </div>
      </section>

      <section className="bg-canvas px-4 pb-16 sm:px-6 sm:pb-24">
        <CtaBand />
      </section>
    </>
  );
}
