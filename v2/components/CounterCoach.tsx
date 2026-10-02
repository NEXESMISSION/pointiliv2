"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowDown } from "lucide-react";
import { Confetti } from "@/components/StampLand";
import { Icon3D } from "@/components/ui";
import { fill, t } from "@/lib/t";

/** how long the bravo stays before the code shows by itself */
const BRAVO_MS = 3600;

/**
 * The first time the code shows, right after the card is made: a bravo over
 * the whole screen — «برافو! الكارط متاعك حاضرة، توّا نورّيك الإيكران اللي
 * يسكانيه الحريف» — that fades by itself onto the code, then one note at the
 * bottom: try it with another phone, and see what a customer sees. Once read,
 * the page forgets the welcome (the address loses its ?welcome).
 */
export function CounterCoach({ name }: { name: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"bravo" | "tip" | "done">("bravo");
  const [leaving, setLeaving] = useState(false);

  const show = () => {
    setLeaving(true);
    setTimeout(() => setStep("tip"), 450);
  };

  useEffect(() => {
    if (step !== "bravo") return;
    const id = setTimeout(show, BRAVO_MS);
    return () => clearTimeout(id);
  }, [step]);

  if (step === "done") return null;

  if (step === "bravo") {
    return (
      <div className={`safe-t safe-b fixed inset-0 z-50 flex flex-col items-center justify-center bg-canvas px-6 text-center text-ink transition-[opacity,transform] duration-[450ms] ${leaving ? "scale-[1.04] opacity-0" : "animate-fade"}`} role="dialog" aria-modal="true">
        <style>{`@keyframes cc-bar { from { transform: scaleX(0); } to { transform: scaleX(1); } }`}</style>
        <Confetti count={70} />
        <Icon3D name="trophy" size={96} className="animate-pop" />
        <h1 className="mt-4 animate-rise text-[clamp(28px,4.6dvh,36px)] font-bold" style={{ animationDelay: "150ms" }}>
          {name ? fill(t.coachBravo, { name }) : t.coachBravoAnon}
        </h1>
        <p className="mt-1 animate-rise text-[18px] font-semibold text-body" style={{ animationDelay: "400ms" }}>
          {t.coachReady}
        </p>
        <p className="mt-5 max-w-[17rem] animate-rise text-[16px] leading-relaxed text-muted" style={{ animationDelay: "800ms" }}>
          {t.coachShow}
        </p>
        <div className="mt-8 h-1 w-40 overflow-hidden rounded-full bg-line" aria-hidden>
          <span className="block h-full origin-right rounded-full bg-brand" style={{ animation: `cc-bar ${BRAVO_MS}ms linear both` }} />
        </div>
        <button type="button" onClick={show} className="press mt-4 px-6 py-2 text-[16px] font-bold text-brand">
          {t.coachShowCta}
        </button>
      </div>
    );
  }

  // the tip sits over the title, above the code — never on it, so the other phone can scan right away
  return (
    <div className="safe-t fixed inset-x-0 top-0 z-40 mx-auto max-w-md px-3 pt-2" role="dialog" aria-label={t.coachTipTitle}>
      <style>{`@keyframes cc-down { 0% { transform: translateY(-115%); } 70% { transform: translateY(4%); } 100% { transform: none; } }`}</style>
      <div className="rounded-[24px] bg-surface p-4 text-ink shadow-[0_14px_40px_-12px_rgb(0_0_0/0.45)]" style={{ animation: "cc-down 560ms cubic-bezier(0.2,0.9,0.3,1.1) both" }}>
        <p className="flex items-center gap-2 text-[16.5px] font-bold leading-snug">
          <span className="grid size-7 shrink-0 animate-bounce place-items-center rounded-full bg-brand-soft text-brand">
            <ArrowDown className="size-4" strokeWidth={2.8} />
          </span>
          {t.coachTipTitle}
        </p>
        <p className="mt-1.5 flex items-center gap-2 text-[14px] leading-relaxed text-body">
          <Icon3D name="phone" size={28} className="shrink-0" />
          {t.coachTip}
        </p>
        <button
          type="button"
          onClick={() => {
            setStep("done");
            router.replace("/shop/qr");
          }}
          className="press mt-2.5 h-10 w-full rounded-[14px] bg-brand text-[15px] font-bold text-white shadow-[0_10px_22px_-10px_rgb(108_71_255/0.8)]"
        >
          {t.coachTipOk}
        </button>
      </div>
    </div>
  );
}
