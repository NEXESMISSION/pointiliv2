import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/Logo";
import { LinkButton } from "@/components/ui/Button";
import { TRIAL_DAYS } from "@/lib/constants";

/** Centred section heading: small eyebrow, title, one line of support. */
export function SectionHead({ eyebrow, title, children }: { eyebrow?: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {eyebrow && <p className="text-[13px] font-semibold text-brand-600">{eyebrow}</p>}
      <h2 className="mt-2 text-[1.9rem] font-bold leading-[1.12] tracking-[-0.03em] text-ink sm:text-[2.5rem]">{title}</h2>
      {children && <p className="mx-auto mt-3 max-w-lg text-base leading-relaxed text-muted sm:text-[17px]">{children}</p>}
    </div>
  );
}

/** Faint dot grid that fades out — the only decoration on light sections. */
export function DotGrid({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 top-0 bg-[radial-gradient(#d9d9e1_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black_0%,transparent_100%)] ${className}`}
    />
  );
}

export const FAQ = [
  {
    q: "Do my customers need to download an app?",
    a: "No. They scan your QR with the phone camera and sign up with their phone number in under a minute. They can add Pointili to their home screen if they like.",
  },
  {
    q: "Can someone cheat with a photo of the QR?",
    a: "No. Each code works once and expires within a minute, and you choose how long a customer must wait between two stamps.",
  },
  {
    q: "What if I change my card later?",
    a: "Customers keep their stamps. Asking for more stamps never hurts people already collecting, and asking for fewer helps everyone right away.",
  },
  {
    q: "How do I pay?",
    a: "Pick a plan in your dashboard and pay by bank transfer, D17 or cash. Your plan starts as soon as the payment is confirmed.",
  },
  {
    q: "What happens when my plan ends?",
    a: "Your QR pauses until you renew. Your customers keep every stamp.",
  },
];

export function Faq({ items = FAQ }: { items?: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white text-left shadow-card">
      {items.map((item) => (
        <details key={item.q} className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[15px] font-medium text-ink transition-colors hover:bg-canvas/60 [&::-webkit-details-marker]:hidden">
            {item.q}
            <Plus className="size-4 shrink-0 text-muted transition-transform group-open:rotate-45" aria-hidden />
          </summary>
          <p className="-mt-1 px-5 pb-5 text-[15px] leading-relaxed text-muted">{item.a}</p>
        </details>
      ))}
    </div>
  );
}

/** Closing call to action: one dark band, one decision. */
export function CtaBand({ title = "Your next regular is one scan away." }: { title?: string }) {
  return (
    <div className="relative isolate mx-auto max-w-5xl overflow-hidden rounded-3xl bg-ink px-6 py-12 text-center sm:py-16">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(70%_90%_at_50%_0%,rgba(101,53,224,0.55),transparent_70%)]" />
      <LogoMark tone="white" size={46} className="mx-auto" />
      <h2 className="mx-auto mt-6 max-w-md text-[1.75rem] font-bold leading-tight tracking-[-0.03em] text-white sm:text-4xl">{title}</h2>
      <p className="mt-3 text-[15px] text-white/65">Free for {TRIAL_DAYS} days. Ready in five minutes.</p>
      <div className="mx-auto mt-8 flex max-w-xs flex-col gap-2.5 sm:max-w-none sm:flex-row sm:justify-center">
        <LinkButton href="/register" size="lg" className="!bg-white !text-ink !shadow-none hover:!bg-white/90">
          Start free
        </LinkButton>
        <LinkButton href="/customer/register" size="lg" variant="ghost" className="!text-white/80 hover:!bg-white/10 hover:!text-white">
          I collect stamps
        </LinkButton>
      </div>
    </div>
  );
}
