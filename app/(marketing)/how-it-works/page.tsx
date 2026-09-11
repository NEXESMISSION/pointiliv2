import type { Metadata } from "next";
import { Clock, ShieldCheck, Smartphone, Store, type LucideIcon } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { DarkOutlineLink } from "@/components/marketing/DarkLink";
import { PageIntro } from "@/components/marketing/PageIntro";
import { BUSINESS_STEPS, CUSTOMER_STEPS, StepList } from "@/components/marketing/Steps";
import { TRIAL_DAYS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "How it works",
  description: "Businesses show a rotating Pointidi QR, customers scan it with their phone, and every visit adds a stamp toward a reward. Here's how it works, step by step.",
  alternates: { canonical: "/how-it-works" },
};

const FAIR: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: ShieldCheck, title: "A QR that can't be copied", text: "The code at the counter keeps refreshing, so a shared photo won't earn stamps." },
  { icon: Clock, title: "One stamp per visit", text: "Each business sets a waiting time between stamps, from minutes to once a day." },
  { icon: Smartphone, title: "Nothing to install", text: "Pointidi runs in the browser and can be added to the home screen like an app." },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageIntro
        eyebrow="How it works"
        title="Stamps without the paper."
        footer={
          <div className="flex flex-wrap gap-2.5">
            <DarkOutlineLink href="#businesses" size="md" icon={<Store className="size-4" aria-hidden />} className="flex-row-reverse">
              For businesses
            </DarkOutlineLink>
            <DarkOutlineLink href="#customers" size="md" icon={<Smartphone className="size-4" aria-hidden />} className="flex-row-reverse">
              For customers
            </DarkOutlineLink>
          </div>
        }
      >
        The business shows a QR. The customer scans it. Every visit earns a stamp, and a full card earns a reward.
      </PageIntro>

      {/* Businesses */}
      <section id="businesses" className="scroll-mt-20">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-brand-600 text-white shadow-brand">
              <Store className="size-6" aria-hidden />
            </span>
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">For businesses</h2>
              <p className="text-[15px] text-muted">Ready in minutes. Any phone or tablet can show your QR.</p>
            </div>
          </div>
          <div className="mt-10">
            <StepList steps={BUSINESS_STEPS} detailed />
          </div>
          <div className="mt-10 rounded-3xl border border-brand-100 bg-brand-50 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
            <div>
              <p className="text-lg font-bold text-ink">Try it free for {TRIAL_DAYS} days</p>
              <p className="text-[15px] text-body">No card required. Pick a plan when you&apos;re ready.</p>
            </div>
            <div className="mt-4 grid gap-2.5 sm:mt-0 sm:flex sm:shrink-0">
              <LinkButton href="/register">Start free</LinkButton>
              <LinkButton href="/login" variant="outline">
                Business login
              </LinkButton>
            </div>
          </div>
        </div>
      </section>

      {/* Customers */}
      <section id="customers" className="scroll-mt-20 border-y border-line/80 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-emerald-600 text-white">
              <Smartphone className="size-6" aria-hidden />
            </span>
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">For customers</h2>
              <p className="text-[15px] text-muted">Free. Every loyalty card in one place.</p>
            </div>
          </div>
          <div className="mt-10">
            <StepList steps={CUSTOMER_STEPS} tone="emerald" detailed />
          </div>
          <div className="mt-10 rounded-3xl border border-emerald-100 bg-emerald-50 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
            <div>
              <p className="text-lg font-bold text-ink">Start collecting stamps</p>
              <p className="text-[15px] text-body">Sign up with your phone number.</p>
            </div>
            <div className="mt-4 grid gap-2.5 sm:mt-0 sm:flex sm:shrink-0">
              <LinkButton href="/customer/register" variant="dark">
                Collect stamps
              </LinkButton>
              <LinkButton href="/customer/login" variant="outline">
                I have an account
              </LinkButton>
            </div>
          </div>
        </div>
      </section>

      {/* Fair for everyone */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <h2 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Fair for everyone</h2>
        <ul className="mt-8 grid gap-3 sm:gap-4 md:grid-cols-3">
          {FAIR.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.title} className="flex gap-4 rounded-3xl border border-line/80 bg-white p-5 shadow-card md:flex-col sm:p-6">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-base font-semibold text-ink">{item.title}</p>
                  <p className="mt-1 text-[15px] leading-relaxed text-muted">{item.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
