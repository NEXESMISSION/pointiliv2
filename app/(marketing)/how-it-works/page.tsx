import type { Metadata } from "next";
import { Clock, ShieldCheck, Smartphone, type LucideIcon } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { PageIntro } from "@/components/marketing/PageIntro";
import { StepArt } from "@/components/marketing/StepArt";
import { TRIAL_DAYS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "How it works",
  description: "Businesses show a rotating Pointili QR, customers scan it with their phone, and every visit adds a stamp toward a reward. See how it works in four steps.",
  alternates: { canonical: "/how-it-works" },
};

const STEPS = [
  { title: "Show your QR at the counter", business: "Open Pointili on any phone or tablet. The QR refreshes by itself — leave it running.", customer: "Look for the Pointili QR next to the till." },
  { title: "The customer scans it", business: "Nothing to type, nothing to press on your side.", customer: "Point your phone camera at the code. First time? Sign up with your phone number in a minute." },
  { title: "A stamp lands on the card", business: "Every visit shows up in your dashboard, live.", customer: "Your stamp appears instantly on that shop's card." },
  { title: "Full card, free reward", business: "Scan the customer's reward QR and confirm. Done.", customer: "Tap “Use reward” and show your reward QR at the counter." },
];

const FAIR: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: ShieldCheck, title: "A QR that can't be copied", text: "The code changes after every scan, so a shared photo won't earn stamps." },
  { icon: Clock, title: "One stamp per visit", text: "Each shop sets a waiting time between stamps." },
  { icon: Smartphone, title: "Install like an app", text: "Add Pointili to your home screen on Android or iPhone." },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageIntro eyebrow="How it works" title="Stamps, without the paper.">
        The shop shows a QR. You scan it. Every visit earns a stamp, and a full card earns a reward.
      </PageIntro>

      <section className="mx-auto max-w-3xl px-5 pb-8">
        <ol className="space-y-6">
          {STEPS.map((s, i) => (
            <li key={s.title} className="overflow-hidden rounded-3xl border border-line bg-white shadow-card sm:grid sm:grid-cols-[16rem_1fr]">
              <StepArt step={i} className="sm:h-full [&>svg]:sm:h-full [&>svg]:sm:object-cover" />
              <div className="p-6 text-center sm:text-left">
                <span className="inline-grid size-7 place-items-center rounded-full bg-ink text-sm font-bold text-white tabular">{i + 1}</span>
                <h2 className="mt-3 text-xl font-bold text-ink">{s.title}</h2>
                <p className="mt-3 text-[15px] text-body">
                  <span className="font-semibold text-brand-700">Shop · </span>
                  {s.business}
                </p>
                <p className="mt-1.5 text-[15px] text-body">
                  <span className="font-semibold text-success-600">Customer · </span>
                  {s.customer}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14 sm:py-20">
        <h2 className="text-center text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Fair for everyone</h2>
        <ul className="mt-10 grid gap-8 text-center sm:grid-cols-3">
          {FAIR.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.title}>
                <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                  <Icon className="size-6" aria-hidden />
                </span>
                <p className="mt-4 font-bold text-ink">{item.title}</p>
                <p className="mx-auto mt-1 max-w-[16rem] text-[15px] text-muted">{item.text}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="border-t border-line bg-white">
        <div className="mx-auto grid max-w-3xl gap-4 px-5 py-14 sm:grid-cols-2">
          <div className="rounded-3xl border border-line p-6 text-center">
            <p className="text-lg font-bold text-ink">I own a shop</p>
            <p className="mt-1 text-[15px] text-muted">Free for {TRIAL_DAYS} days. No card required.</p>
            <LinkButton href="/register" block className="mt-5">
              Start free
            </LinkButton>
          </div>
          <div className="rounded-3xl border border-line p-6 text-center">
            <p className="text-lg font-bold text-ink">I collect stamps</p>
            <p className="mt-1 text-[15px] text-muted">Free, with your phone number.</p>
            <LinkButton href="/customer/register" variant="outline" block className="mt-5">
              Create my account
            </LinkButton>
          </div>
        </div>
      </section>
    </>
  );
}
