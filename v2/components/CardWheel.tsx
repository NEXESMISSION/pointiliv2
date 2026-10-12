"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { spin } from "@/app/actions-wheel";
import { Confetti } from "@/components/StampLand";
import { useScreen } from "@/components/Tracker";
import { Wheel, type Prize } from "@/components/Wheel";
import { fill, t } from "@/lib/t";
import { signal } from "@/lib/track";

/**
 * A full card in a wheel shop: the turn, on the customer's card. They spin,
 * the wheel lands, the prize is said — and the page comes back with it as the
 * gift waiting, its code to show at the counter.
 */
export function CardWheel({ card, moment, prizes }: { card: string; moment: number; prizes: Prize[] }) {
  useScreen("wheel");
  const router = useRouter();
  const [won, setWon] = useState<string | null>(null);
  return (
    <div className="relative mt-3 flex shrink-0 animate-pop flex-col items-center rounded-[1.75rem] bg-surface px-4 pb-4 pt-3 text-center shadow-card">
      {won && <Confetti count={90} />}
      <h2 className="text-[1.375rem] font-bold leading-tight">{won ? fill(t.wheelWon, { prize: won }) : t.wheelTitle}</h2>
      <p className={`mb-3 text-[0.9375rem] text-muted ${won ? "invisible" : ""}`}>{t.wheelHint}</p>
      <Wheel
        prizes={prizes}
        size="min(74vw, 36dvh, 20rem)"
        spin={() => spin(moment, card)}
        onDone={(prize) => {
          setWon(prize);
          navigator.vibrate?.([60, 40, 60]);
          signal("wheel_won", prize);
          // the prize, now the gift waiting: its code on the page
          setTimeout(() => router.refresh(), 2200);
        }}
      />
    </div>
  );
}
