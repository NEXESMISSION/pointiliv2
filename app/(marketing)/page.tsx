import type { Metadata } from "next";
import Link from "next/link";
import { ChartColumn, ChevronRight, Palette, ShieldCheck, Users } from "lucide-react";
import { CardIcon } from "@/components/CardIcon";
import { LinkButton } from "@/components/ui/Button";
import { JsonLd } from "@/components/marketing/JsonLd";
import { PlanCards, PlanFeatures } from "@/components/marketing/Plans";
import { CtaBand, DotGrid, Faq, SectionHead } from "@/components/marketing/Section";
import { HeroShowcase, StepVisual, demoQr } from "@/components/marketing/Showcase";
import { TRIAL_DAYS } from "@/lib/constants";

export const metadata: Metadata = {
  title: { absolute: "Pointili — Digital loyalty cards for cafés, restaurants & salons" },
  description: `Turn customers into regulars. Show a QR at the counter, customers collect stamps on their phone and come back for their reward. Free for ${TRIAL_DAYS} days.`,
  alternates: { canonical: "/" },
};

const MADE_FOR = [
  { icon: "coffee", label: "Cafés" },
  { icon: "croissant", label: "Bakeries" },
  { icon: "utensils", label: "Restaurants" },
  { icon: "pizza", label: "Pizzerias" },
  { icon: "scissors", label: "Barbers & salons" },
  { icon: "ice-cream", label: "Juice bars" },
];

const STEPS = [
  { visual: "qr", title: "Show your QR", text: "Open Pointili on a phone or tablet at the counter. The code refreshes on its own." },
  { visual: "stamp", title: "Customers scan, a stamp lands", text: "They use their phone camera. The stamp appears on their card instantly." },
  { visual: "reward", title: "They come back for the reward", text: "Card full? You scan their reward QR and confirm. Done." },
] as const;

const FEATURES = [
  { icon: ShieldCheck, title: "Screenshot-proof", text: "The QR changes after every scan. A copied code earns nothing." },
  { icon: Palette, title: "Your brand", text: "Your colours, logo, cover photo and stamp style." },
  { icon: Users, title: "Know your regulars", text: "Every customer, their visits, and who's close to a reward." },
  { icon: ChartColumn, title: "Clear numbers", text: "Stamps, rewards and returning customers at a glance." },
];

export default async function LandingPage() {
  const qr = await demoQr();

  return (
    <>
      <JsonLd />

      {/* Hero */}
      <section className="relative overflow-hidden bg-white">
        <DotGrid className="h-[30rem]" />
        <div className="relative mx-auto max-w-3xl px-5 pt-12 text-center sm:pt-20">
          <Link href="/how-it-works" className="inline-flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-3 text-[13px] text-body shadow-card transition-colors hover:border-brand-200">
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">No app needed</span>
            Loyalty cards for local shops
            <ChevronRight className="size-3.5 text-muted" aria-hidden />
          </Link>
          <h1 className="mx-auto mt-6 max-w-[40rem] text-[2.6rem] font-bold leading-[1.03] tracking-[-0.045em] text-ink sm:text-[4rem]">Turn first visits into regulars.</h1>
          <p className="mx-auto mt-5 max-w-md text-[17px] leading-relaxed text-muted sm:text-lg">A QR at your counter. A stamp card on their phone. Rewards that bring them back.</p>
          <div className="mx-auto mt-8 flex max-w-xs flex-col gap-2.5 sm:max-w-none sm:flex-row sm:justify-center">
            <LinkButton href="/register" size="lg">
              Start free
            </LinkButton>
            <LinkButton href="#how" variant="outline" size="lg">
              See how it works
            </LinkButton>
          </div>
          <p className="mt-4 text-[13px] text-muted">
            {TRIAL_DAYS} days free · No card required · Any phone
          </p>
        </div>
        <div className="relative mx-auto mt-12 max-w-[35rem] px-5 pb-16 sm:mt-16 sm:pb-24">
          <HeroShowcase qr={qr} />
        </div>
      </section>

      {/* Made for */}
      <section className="border-y border-line bg-canvas">
        <div className="mx-auto max-w-5xl px-5 py-7">
          <p className="text-center text-[13px] font-medium text-muted">Made for the places people go every week</p>
          <ul className="mt-4 flex flex-wrap justify-center gap-2">
            {MADE_FOR.map((m) => (
              <li key={m.label} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-[13px] font-medium text-body">
                <CardIcon name={m.icon} className="size-3.5 text-muted" />
                {m.label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-16 bg-white">
        <div className="mx-auto max-w-5xl px-5 py-16 sm:py-24">
          <SectionHead eyebrow="How it works" title="Three steps. Zero paper.">
            Set up in five minutes. Your customers don&apos;t install anything.
          </SectionHead>
          <ol className="mt-10 grid gap-4 sm:mt-14 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-2xl border border-line bg-white p-2 shadow-card">
                <StepVisual step={s.visual} qr={qr} />
                <div className="px-3 pb-4 pt-4 text-center md:text-left">
                  <p className="text-xs font-semibold text-brand-600">Step {i + 1}</p>
                  <h3 className="mt-1 text-base font-semibold text-ink">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-8 text-center">
            <Link href="/how-it-works" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
              The full walkthrough <ChevronRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-line bg-canvas">
        <div className="mx-auto max-w-5xl px-5 py-16 sm:py-24">
          <SectionHead eyebrow="Why Pointili" title="Everything a stamp card should be." />
          <ul className="mt-10 grid overflow-hidden rounded-2xl border border-line bg-line shadow-card sm:mt-14 sm:grid-cols-2 lg:grid-cols-4 [&>li]:bg-white gap-px">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <li key={f.title} className="p-6">
                  <span className="grid size-9 place-items-center rounded-lg border border-line text-brand-600">
                    <Icon className="size-[18px]" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-[15px] font-semibold text-ink">{f.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{f.text}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-line bg-white">
        <div className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
          <SectionHead eyebrow="Pricing" title="One price. Everything included.">
            Try it free for {TRIAL_DAYS} days, then pick a plan.
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
          <SectionHead title="Questions, answered" />
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
