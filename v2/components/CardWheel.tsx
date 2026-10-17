"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { spin } from "@/app/actions-wheel";
import { Confetti } from "@/components/StampLand";
import { useBars } from "@/lib/bars";
import { useScreen } from "@/components/Tracker";
import { Icon3D } from "@/components/ui";
import { Wheel, type Prize } from "@/components/Wheel";
import { fill, t } from "@/lib/t";
import { signal } from "@/lib/track";

const never = () => () => {};
const say = {
  later: "من بعد",
  collect: "ورّي الكود متاعك للمحل وخوذ الكادو",
  ok: "باهي",
};

/**
 * A full card in a wheel shop: the turn opens as a popup over the card, by
 * itself, the moment the card page shows — the wheel big in the middle, one
 * tap on its hub. It lands where the server says (the prize is drawn there,
 * never here), the prize is said with confetti, and «باهي» brings the page
 * back with it as the gift waiting, its code to show at the counter.
 * Closed before spinning, a banner on the page opens it again.
 */
export function CardWheel({ card, moment, prizes, turns = 1 }: { card: string; moment: number; prizes: Prize[]; turns?: number }) {
  useScreen("wheel");
  const router = useRouter();
  const [open, setOpen] = useState(true);
  useBars(open ? "#24222e" : null);
  const [won, setWon] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  // drawn over everything (on the page's body), so no card, header or scroll box clips it; not while the server draws
  const browser = useSyncExternalStore(never, () => true, () => false);
  useEffect(() => {
    if (!open || spinning || won) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [open, spinning, won]);

  // the prize is now the gift waiting: the page comes back with it (never before the wheel has stopped)
  const done = () => {
    setOpen(false);
    router.refresh();
  };

  const popup = (
    <div className="fixed inset-0 z-[60] flex animate-fade flex-col items-center justify-center bg-[rgb(15_14_23/0.86)] px-5 text-center text-white backdrop-blur-[3px]" role="dialog" aria-modal="true" aria-label={t.wheelTitle}>
      {won && <Confetti count={110} />}
      {!spinning && !won && (
        <button type="button" onClick={() => setOpen(false)} className="press absolute end-4 top-[max(1rem,env(safe-area-inset-top))] grid size-11 place-items-center rounded-full bg-white/15" aria-label={say.later}>
          <X className="size-5" />
        </button>
      )}
      <h2 className="animate-rise text-balance text-[1.5rem] font-bold leading-tight">{won ? fill(t.wheelWon, { prize: won }) : t.wheelTitle}</h2>
      <p className="mt-1.5 text-[0.9375rem] text-white/75">{won ? say.collect : t.wheelHint}</p>
      <div className="mt-[4dvh]">
        <Wheel
          prizes={prizes}
          size="min(84vw, 50dvh, 23rem)"
          spin={async () => {
            setSpinning(true);
            const r = await spin(moment, card);
            if (!r) setSpinning(false);
            return r;
          }}
          onDone={(prize) => {
            setSpinning(false);
            setWon(prize);
            navigator.vibrate?.([60, 40, 60]);
            signal("wheel_won", prize);
          }}
        />
      </div>
      {won && (
        <button type="button" onClick={done} className="press mt-[4dvh] h-14 w-full max-w-xs animate-pop rounded-[1.25rem] bg-white text-[1.0625rem] font-bold text-ink">
          {say.ok}
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* closed before the spin: the turn waits on the page, one tap opens it again */}
      {!open && !won && (
        <button type="button" onClick={() => setOpen(true)} className="press mt-3 flex w-full shrink-0 animate-pop items-center gap-3 rounded-[1.25rem] bg-ink px-4 py-3.5 text-start text-white">
          <Icon3D name="party" size={40} className="animate-float" />
          <span className="min-w-0 flex-1">
            <b className="block text-[1.0625rem]">{turns > 1 ? fill(t.wheelWaitsMany, { n: turns }) : t.wheelWaits}</b>
            <span className="block text-[0.8125rem] text-white/70">{t.wheelHint}</span>
          </span>
          <span className="shrink-0 rounded-full bg-white px-3.5 py-2 text-[0.9375rem] font-bold text-ink">{t.wheelGo}</span>
        </button>
      )}
      {open && browser && createPortal(popup, document.body)}
    </>
  );
}
