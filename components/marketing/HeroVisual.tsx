import { Check, ScanLine } from "lucide-react";
import { BusinessAvatar } from "@/components/CardIcon";
import { StampGrid } from "@/components/LoyaltyCard";
import { cardColor } from "@/lib/constants";

/** Hero illustration: a phone showing a Pointidi card, a fresh stamp landing, and a steaming cup. */
export function HeroVisual() {
  const mint = cardColor("emerald");
  const rose = cardColor("rose");

  return (
    <div className="relative mx-auto w-full max-w-[22rem] pb-6 pt-2 sm:max-w-[26rem]">
      {/* warm café glow */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/15 blur-3xl sm:size-[26rem]" />

      {/* phone */}
      <div
        role="img"
        aria-label="Pointidi on a phone: the Café Bonheur loyalty card with 6 of 10 stamps"
        className="relative mx-auto w-[16.5rem] rounded-[2.75rem] bg-[#1B1E2E] p-2.5 shadow-[0_40px_80px_-24px_rgb(0_0_0/0.7)] ring-1 ring-white/10 sm:w-[18.5rem]"
      >
        <div className="relative overflow-hidden rounded-[2.25rem] bg-canvas">
          <div aria-hidden className="absolute left-1/2 top-2 h-[1.35rem] w-[5.25rem] -translate-x-1/2 rounded-full bg-[#1B1E2E]" />
          <div className="tabular flex items-center justify-between px-6 pt-2.5 text-[11px] font-semibold text-ink">
            <span>9:41</span>
            <span className="flex items-end gap-[2px]">
              {[4, 6, 8, 10].map((h) => (
                <span key={h} className="w-[3px] rounded-sm bg-ink" style={{ height: h }} />
              ))}
            </span>
          </div>

          <div className="px-4 pb-4 pt-4">
            <p className="text-[11px] font-medium text-muted">Good morning, Amira</p>
            <p className="text-lg font-extrabold tracking-tight text-ink">My cards</p>

            {/* main card */}
            <div className="mt-3 rounded-3xl p-4" style={{ background: mint.bg }}>
              <div className="flex items-center gap-3">
                <BusinessAvatar icon="coffee" color="emerald" size={40} rounded="rounded-xl" />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-bold text-ink">Café Bonheur</p>
                  <p className="text-xs text-muted">Reward: Free coffee</p>
                </div>
              </div>
              <div className="mt-4">
                <StampGrid filled={6} total={10} color="emerald" icon="coffee" animateIndex={5} />
              </div>
              <p className="tabular mt-3 text-xs font-semibold" style={{ color: mint.accent }}>
                6 / 10 stamps · Free coffee
              </p>
            </div>

            {/* second card */}
            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-line/80 bg-white p-3">
              <BusinessAvatar icon="scissors" color="rose" size={36} rounded="rounded-xl" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-[13px] font-bold text-ink">Salon Yasmine</p>
                  <span className="tabular text-[11px] font-semibold text-muted">3 / 8</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-canvas">
                  <div className="h-full w-[37.5%] rounded-full" style={{ background: rose.accent }} />
                </div>
              </div>
            </div>

            <div className="mt-3 flex h-11 items-center justify-center gap-2 rounded-2xl bg-brand-600 text-sm font-semibold text-white shadow-brand">
              <ScanLine className="size-4" aria-hidden />
              Scan QR
            </div>
          </div>
        </div>
      </div>

      {/* the stamp that just landed */}
      <div
        aria-hidden
        className="absolute right-0 top-16 flex animate-pop items-center gap-2 rounded-2xl bg-white py-2 pl-2 pr-3.5 shadow-lift sm:-right-2 lg:-right-8"
        style={{ animationDelay: "450ms" }}
      >
        <span className="grid size-8 place-items-center rounded-full text-white" style={{ background: mint.accent }}>
          <Check className="size-4" strokeWidth={3} />
        </span>
        <span className="leading-tight">
          <span className="block text-[13px] font-bold text-ink">+1 stamp</span>
          <span className="block text-[11px] text-muted">Café Bonheur</span>
        </span>
      </div>

      <CoffeeCup className="pointer-events-none absolute -left-1 bottom-0 w-24 sm:-left-4 sm:w-32 lg:-left-12" />
    </div>
  );
}

function CoffeeCup({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 132" className={className} aria-hidden>
      <g className="animate-pulse" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="3.5" strokeLinecap="round" fill="none">
        <path d="M44 40c-7-7 5-12 0-20" />
        <path d="M58 36c-7-8 6-13 0-24" />
        <path d="M72 40c-7-7 5-12 0-20" />
      </g>
      <ellipse cx="58" cy="120" rx="54" ry="9" fill="#E6DCCD" />
      <ellipse cx="58" cy="118" rx="36" ry="5" fill="#D3C5B2" />
      <path d="M100 62c16 0 16 26-3 28" stroke="#F4EDE3" strokeWidth="7" strokeLinecap="round" fill="none" />
      <path d="M22 52h72v6c0 32-15 56-36 56S22 90 22 58v-6Z" fill="#FAF6F0" />
      <path d="M94 58c0 32-15 56-36 56 14-6 24-26 26-56h10Z" fill="#EADFD1" />
      <path d="M32 74h52" stroke="#0E9F6E" strokeWidth="5" strokeLinecap="round" opacity="0.85" />
      <ellipse cx="58" cy="52" rx="36" ry="7.5" fill="#F4EDE3" />
      <ellipse cx="58" cy="52.5" rx="31" ry="5.5" fill="#6B4226" />
      <ellipse cx="52" cy="51.5" rx="10" ry="1.8" fill="#8A5A3B" />
    </svg>
  );
}
