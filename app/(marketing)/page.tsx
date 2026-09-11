import type { Metadata } from "next";
import { Check, ShieldCheck, Smartphone, Sparkles, Zap } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { HeroPhone } from "@/components/marketing/HeroPhone";
import { JsonLd } from "@/components/marketing/JsonLd";
import { PlanTeaser } from "@/components/marketing/Plans";
import { StepArt } from "@/components/marketing/StepArt";
import { TRIAL_DAYS } from "@/lib/constants";

export const metadata: Metadata = {
  title: { absolute: "Pointili — Digital loyalty cards for cafés, restaurants & salons" },
  description: `Turn customers into regulars. Show a QR at the counter, customers collect stamps on their phone and come back for their reward. Free for ${TRIAL_DAYS} days.`,
  alternates: { canonical: "/" },
};

const STEPS = [
  { title: "Show your QR", text: "Open Pointili on a phone or tablet at the counter. The code refreshes on its own." },
  { title: "Customers scan it", text: "They point their phone camera at the code. Nothing to download." },
  { title: "A stamp lands on their card", text: "Instantly, on their phone — and in your dashboard." },
  { title: "They come back for the reward", text: "Card full? They show their reward QR and you confirm." },
];

const WHY = [
  { icon: Zap, title: "Ready in 5 minutes", text: "Create your card, print nothing, start today." },
  { icon: ShieldCheck, title: "Can't be cheated", text: "The QR changes after every scan. Screenshots don't work." },
  { icon: Smartphone, title: "Any phone", text: "iPhone or Android, no app store needed." },
];

export default function LandingPage() {
  return (
    <>
      <JsonLd />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[36rem] bg-gradient-to-b from-brand-50 via-brand-50/40 to-transparent" />
        <div className="relative mx-auto max-w-3xl px-5 pt-10 text-center sm:pt-16">
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3.5 py-1.5 text-[13px] font-medium text-brand-700">
            <Sparkles className="size-4" aria-hidden /> Loyalty cards for local shops
          </p>
          <h1 className="mx-auto mt-5 max-w-2xl text-[2.6rem] font-extrabold leading-[1.04] tracking-tight text-ink sm:text-6xl">
            Turn customers into <span className="text-brand-600">regulars.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-lg leading-relaxed text-muted">They scan your QR, collect stamps on their phone, and come back for their reward.</p>
          <div className="mx-auto mt-7 flex max-w-xs flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
            <LinkButton href="/register" size="lg">
              Start free
            </LinkButton>
            <LinkButton href="#how" variant="outline" size="lg">
              See how it works
            </LinkButton>
          </div>
          <ul className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-muted">
            {[`${TRIAL_DAYS} days free`, "No card required", "Works on any phone"].map((t) => (
              <li key={t} className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-success-600" strokeWidth={3} aria-hidden /> {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative mx-auto mt-12 max-w-md px-8 pb-16 sm:pb-24">
          <HeroPhone />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20 border-t border-line bg-white">
        <div className="mx-auto max-w-5xl px-5 py-16 sm:py-24">
          <div className="text-center">
            <p className="text-sm font-semibold text-brand-600">How it works</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Four steps. No paper.</h2>
          </div>
          <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:gap-6">
            {STEPS.map((s, i) => (
              <li key={s.title} className="overflow-hidden rounded-3xl border border-line bg-white text-center shadow-card">
                <StepArt step={i} />
                <div className="px-6 pb-7 pt-5">
                  <span className="inline-grid size-7 place-items-center rounded-full bg-ink text-sm font-bold text-white tabular">{i + 1}</span>
                  <h3 className="mt-3 text-lg font-bold text-ink">{s.title}</h3>
                  <p className="mx-auto mt-1 max-w-xs text-[15px] leading-relaxed text-muted">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Why */}
      <section className="mx-auto max-w-5xl px-5 py-16 sm:py-20">
        <ul className="grid gap-8 text-center sm:grid-cols-3">
          {WHY.map((w) => {
            const Icon = w.icon;
            return (
              <li key={w.title}>
                <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                  <Icon className="size-6" aria-hidden />
                </span>
                <p className="mt-4 text-base font-bold text-ink">{w.title}</p>
                <p className="mx-auto mt-1 max-w-[16rem] text-[15px] text-muted">{w.text}</p>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Pricing */}
      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-2xl px-5 py-16 text-center sm:py-20">
          <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Simple pricing</h2>
          <p className="mx-auto mt-3 max-w-md text-muted">Everything included. Try it free for {TRIAL_DAYS} days.</p>
          <div className="mt-8 text-left">
            <PlanTeaser />
          </div>
          <LinkButton href="/pricing" variant="ghost" className="mt-5">
            See plan details
          </LinkButton>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-5 py-16 text-center sm:py-24">
        <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Your next regular is one scan away.</h2>
        <div className="mx-auto mt-7 flex max-w-xs flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <LinkButton href="/register" size="lg">
            Start free
          </LinkButton>
          <LinkButton href="/customer/register" variant="outline" size="lg">
            I collect stamps
          </LinkButton>
        </div>
      </section>
    </>
  );
}
