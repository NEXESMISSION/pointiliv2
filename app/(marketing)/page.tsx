import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Smartphone, Store } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { Benefits } from "@/components/marketing/Benefits";
import { DarkOutlineLink } from "@/components/marketing/DarkLink";
import { HeroVisual } from "@/components/marketing/HeroVisual";
import { LoopSteps } from "@/components/marketing/LoopSteps";
import { PlanTeaser } from "@/components/marketing/Plans";
import { BUSINESS_STEPS, CUSTOMER_STEPS, StepList } from "@/components/marketing/Steps";
import { TRIAL_DAYS } from "@/lib/constants";

export const metadata: Metadata = {
  title: { absolute: "Pointidi — Turn customers into regulars" },
  description: `Simple digital loyalty cards for cafés, restaurants, salons and local businesses in Tunisia. Customers scan your QR, collect stamps and earn rewards. Free for ${TRIAL_DAYS} days.`,
  alternates: { canonical: "/" },
};

export default function LandingPage() {
  return (
    <>
      {/* ───────── Hero ───────── */}
      <section className="relative overflow-hidden bg-[#0B0D1A] text-white">
        <div aria-hidden className="pointer-events-none absolute -top-48 left-1/2 h-[30rem] w-[44rem] -translate-x-1/2 rounded-full bg-amber-400/[0.08] blur-3xl lg:left-auto lg:right-[-10rem] lg:translate-x-0" />
        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 pb-14 pt-8 sm:px-6 sm:pt-12 lg:grid-cols-[1.05fr_1fr] lg:gap-x-14 lg:gap-y-10 lg:pb-24 lg:pt-16">
          <div className="animate-rise lg:col-start-1 lg:row-start-1 lg:self-end">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1.5 pr-3.5 text-[13px] font-medium text-white/80">
              <span className="grid size-6 place-items-center rounded-full bg-white">
                <LogoMark size={18} />
              </span>
              Loyalty cards for local businesses
            </p>
            <h1 className="mt-5 text-[2.5rem] font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-[4.25rem]">
              Turn customers into <span className="text-amber-300">regulars.</span>
            </h1>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-white/70">Simple digital loyalty cards for cafés, restaurants, salons, and local businesses.</p>
            <div className="mt-7 grid gap-3 min-[420px]:flex">
              <LinkButton href="/register" size="lg" icon={<ArrowRight className="size-5" aria-hidden />} className="flex-row-reverse">
                Start Free
              </LinkButton>
              <DarkOutlineLink href="/how-it-works">How It Works</DarkOutlineLink>
            </div>
            <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-white/55">
              {[`${TRIAL_DAYS} days free`, "No card required", "No app to install"].map((item) => (
                <li key={item} className="inline-flex items-center gap-1.5">
                  <Check className="size-4 text-emerald-400" strokeWidth={3} aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="animate-rise [animation-delay:120ms] lg:col-start-1 lg:row-start-2">
            <LoopSteps />
          </div>

          <div className="animate-fade [animation-delay:200ms] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* ───────── How it works, both sides ───────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-brand-600">How it works</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">One QR. Every visit counts.</h2>
          <p className="mt-3 text-base leading-relaxed text-muted sm:text-lg">Set up in minutes. Your customers only need their phone.</p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-2 lg:gap-6">
          <Card className="flex flex-col p-5 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-brand-600 text-white shadow-brand">
                <Store className="size-6" aria-hidden />
              </span>
              <div>
                <h3 className="text-xl font-bold text-ink">For businesses</h3>
                <p className="text-sm text-muted">Bring people back, without paper cards.</p>
              </div>
            </div>
            <div className="mt-6 flex-1">
              <StepList steps={BUSINESS_STEPS} />
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2">
              <LinkButton href="/register" size="md">
                Start free
              </LinkButton>
              <Link href="/how-it-works#businesses" className="inline-flex items-center gap-1 rounded-xl px-2 py-2.5 text-[15px] font-semibold text-brand-700 hover:text-brand-800">
                See the details <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </Card>

          <Card className="flex flex-col p-5 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-emerald-600 text-white">
                <Smartphone className="size-6" aria-hidden />
              </span>
              <div>
                <h3 className="text-xl font-bold text-ink">For customers</h3>
                <p className="text-sm text-muted">All your loyalty cards, on your phone.</p>
              </div>
            </div>
            <div className="mt-6 flex-1">
              <StepList steps={CUSTOMER_STEPS} tone="emerald" />
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2">
              <LinkButton href="/customer/register" size="md" variant="dark">
                Collect stamps
              </LinkButton>
              <Link href="/how-it-works#customers" className="inline-flex items-center gap-1 rounded-xl px-2 py-2.5 text-[15px] font-semibold text-emerald-700 hover:text-emerald-800">
                See the details <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* ───────── Benefits ───────── */}
      <section className="border-y border-line/80 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="max-w-xl text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Loyalty that just works.</h2>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-muted sm:text-lg">No hardware, no printing, no training. If you have a phone at the counter, you&apos;re ready.</p>
          <div className="mt-10">
            <Benefits />
          </div>
        </div>
      </section>

      {/* ───────── Pricing teaser ───────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-sm font-semibold text-brand-600">Pricing</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Simple pricing. {TRIAL_DAYS} days free.</h2>
            <p className="mt-3 max-w-md text-base leading-relaxed text-muted sm:text-lg">
              Try everything free for {TRIAL_DAYS} days. Then pick one of two plans — same features, unlimited customers.
            </p>
            <LinkButton href="/pricing" variant="outline" size="md" className="mt-6" icon={<ArrowRight className="size-4" aria-hidden />}>
              See pricing
            </LinkButton>
          </div>
          <div className="pt-3">
            <PlanTeaser />
          </div>
        </div>
      </section>

      {/* ───────── Final CTA ───────── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#0B0D1A] px-6 py-12 text-center text-white sm:px-12 sm:py-16">
          <div aria-hidden className="pointer-events-none absolute -bottom-40 left-1/2 size-96 -translate-x-1/2 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="relative">
            <h2 className="mx-auto max-w-lg text-3xl font-extrabold tracking-tight sm:text-4xl">Your next regular is one scan away.</h2>
            <p className="mx-auto mt-3 max-w-md text-base text-white/70 sm:text-lg">Create your loyalty card in a few minutes. Free for {TRIAL_DAYS} days, no card required.</p>
            <div className="mx-auto mt-8 grid max-w-xs gap-3 sm:flex sm:max-w-none sm:justify-center">
              <LinkButton href="/register" size="lg">
                Start Free
              </LinkButton>
              <DarkOutlineLink href="/how-it-works">How It Works</DarkOutlineLink>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Customer entry ───────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <Card className="flex flex-col gap-6 p-6 sm:p-8 md:flex-row md:items-center">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Smartphone className="size-7" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-ink sm:text-2xl">Collecting stamps at a shop?</h2>
            <p className="mt-1 text-[15px] leading-relaxed text-muted">Create your free Pointidi account and keep every loyalty card on your phone.</p>
          </div>
          <div className="grid gap-2.5 sm:flex sm:shrink-0">
            <LinkButton href="/customer/register" variant="dark">
              Collect stamps
            </LinkButton>
            <LinkButton href="/customer/login" variant="outline">
              I have an account
            </LinkButton>
          </div>
        </Card>
      </section>
    </>
  );
}
