import type { Metadata } from "next";
import { Clock, ShieldCheck, Smartphone, type LucideIcon } from "lucide-react";
import { PageIntro } from "@/components/marketing/PageIntro";
import { CtaBand, SectionHead } from "@/components/marketing/Section";
import { StepVisual, demoQr } from "@/components/marketing/Showcase";

export const metadata: Metadata = {
  title: "How it works",
  description: "Businesses show a rotating Pointili QR, customers scan it with their phone, and every visit adds a stamp toward a reward. See how it works in four steps.",
  alternates: { canonical: "/how-it-works" },
};

const STEPS = [
  { visual: "qr", title: "Show your QR at the counter", shop: "Open Pointili on any phone or tablet. The QR refreshes by itself — leave it running.", customer: "Look for the Pointili QR next to the till." },
  { visual: "scan", title: "The customer scans it", shop: "Nothing to type, nothing to press on your side.", customer: "Point your phone camera at the code. First time? Sign up with your phone number in a minute." },
  { visual: "stamp", title: "A stamp lands on the card", shop: "Every visit shows up in your dashboard, live.", customer: "Your stamp appears instantly on that shop's card." },
  { visual: "reward", title: "Full card, free reward", shop: "Scan the customer's reward QR and confirm. Done.", customer: "Tap “Use reward” and show your reward QR at the counter." },
] as const;

const FAIR: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: ShieldCheck, title: "A QR that can't be copied", text: "The code changes after every scan, so a shared photo won't earn stamps." },
  { icon: Clock, title: "One stamp per visit", text: "Each shop sets a waiting time between two stamps." },
  { icon: Smartphone, title: "Install like an app", text: "Add Pointili to your home screen on Android or iPhone." },
];

export default async function HowItWorksPage() {
  const qr = await demoQr();

  return (
    <>
      <PageIntro eyebrow="How it works" title="Stamps, without the paper.">
        The shop shows a QR. You scan it. Every visit earns a stamp, and a full card earns a reward.
      </PageIntro>

      <section className="border-t border-line bg-canvas">
        <ol className="mx-auto max-w-3xl space-y-4 px-5 py-14 sm:py-20">
          {STEPS.map((s, i) => (
            <li key={s.title} className="grid gap-2 rounded-2xl border border-line bg-white p-2 shadow-card sm:grid-cols-[15rem_1fr] sm:items-center">
              <StepVisual step={s.visual} qr={qr} />
              <div className="px-3 pb-4 pt-3 sm:px-5 sm:py-4">
                <p className="text-xs font-semibold text-brand-600">Step {i + 1}</p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink">{s.title}</h2>
                <dl className="mt-3 space-y-2.5 text-sm leading-relaxed">
                  <div className="flex gap-3">
                    <dt className="w-[4.5rem] shrink-0 pt-px text-xs font-semibold uppercase tracking-wide text-muted">Shop</dt>
                    <dd className="text-body">{s.shop}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-[4.5rem] shrink-0 pt-px text-xs font-semibold uppercase tracking-wide text-muted">Customer</dt>
                    <dd className="text-body">{s.customer}</dd>
                  </div>
                </dl>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-line bg-white">
        <div className="mx-auto max-w-5xl px-5 py-16 sm:py-24">
          <SectionHead eyebrow="Built in" title="Fair for everyone" />
          <ul className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-line bg-line shadow-card sm:mt-14 sm:grid-cols-3 [&>li]:bg-white">
            {FAIR.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.title} className="p-6">
                  <span className="grid size-9 place-items-center rounded-lg border border-line text-brand-600">
                    <Icon className="size-[18px]" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-[15px] font-semibold text-ink">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{item.text}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="bg-white px-4 pb-16 sm:px-6 sm:pb-24">
        <CtaBand title="Ready when you are." />
      </section>
    </>
  );
}
