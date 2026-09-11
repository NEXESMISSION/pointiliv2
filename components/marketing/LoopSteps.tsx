import { ArrowRight, Gift, QrCode, ScanLine, Stamp, type LucideIcon } from "lucide-react";

const LOOP: { icon: LucideIcon; label: string; sub: string; tile: string }[] = [
  { icon: QrCode, label: "Merchant QR", sub: "Shown at the counter", tile: "bg-brand-500/20 text-brand-200 ring-brand-300/25" },
  { icon: ScanLine, label: "Customer scans", sub: "With any phone", tile: "bg-brand-500/20 text-brand-200 ring-brand-300/25" },
  { icon: Stamp, label: "+1 Stamp", sub: "Added instantly", tile: "bg-emerald-400/15 text-emerald-300 ring-emerald-300/25" },
  { icon: Gift, label: "Reward", sub: "Card full, treat earned", tile: "bg-amber-400/15 text-amber-300 ring-amber-300/25" },
];

/** The Pointidi loop in four steps: compact on phones, with captions on larger screens. */
export function LoopSteps() {
  return (
    <ol aria-label="How Pointidi works" className="flex items-start rounded-3xl border border-white/10 bg-white/[0.03] px-2 py-4 sm:px-4 sm:py-5">
      {LOOP.map((step, i) => {
        const Icon = step.icon;
        return (
          <li key={step.label} className="contents">
            {i > 0 && <ArrowRight aria-hidden className="mt-3.5 size-3.5 shrink-0 text-white/30 sm:mt-4 sm:size-4" />}
            <div className="flex min-w-0 flex-1 flex-col items-center px-0.5 text-center">
              <span className={`grid size-11 place-items-center rounded-2xl ring-1 sm:size-12 ${step.tile}`}>
                <Icon className="size-5 sm:size-[22px]" aria-hidden />
              </span>
              <span className="mt-2 text-xs font-semibold leading-tight text-white sm:text-sm">{step.label}</span>
              <span className="mt-0.5 hidden text-xs leading-snug text-white/50 sm:block">{step.sub}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
