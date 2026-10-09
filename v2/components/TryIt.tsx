"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, QrCode, ScanLine, X } from "lucide-react";
import { Pass } from "@/components/Pass";
import { Confetti, StampLand } from "@/components/StampLand";
import { Icon3D } from "@/components/ui";
import { fill, kindIcon, pointsSaid, t } from "@/lib/t";
import { signal } from "@/lib/track";

/** what the demo needs to know of the shop: the card as the customer would get it */
export type DemoShop = { name: string; kind: string; color: string; logo?: string | null; goal: number | null; gift: string | null; stamp_logo?: boolean; mode?: "stamps" | "points" };

/**
 * The customer's side, replayed on the owner's own phone — the thing an owner
 * alone at midnight cannot see, since a phone cannot scan its own screen.
 * Four beats in a drawn phone: the scan, the tampon landing on a card in the
 * shop's colours, the gift won when the card is full, and the owner's part
 * («سكاني», then «إيه، عطيه الكادو»). Nothing is written anywhere.
 */
export function TryIt({ shop, onClose }: { shop: DemoShop; onClose: () => void }) {
  const [beat, setBeat] = useState(0);
  const goal = shop.goal ?? 10;
  const gift = shop.gift ?? "";
  const pass = { name: shop.name, kind: shop.kind, color: shop.color, logo: shop.logo, goal, gift, stamp_logo: shop.stamp_logo, mode: shop.mode };
  // a shop in points mode: the scan, then the points landing — no full card, no gift to hand over (the store comes later)
  const byPoints = shop.mode === "points";
  const DEMO_POINTS = 5;
  // the shop's own logo as the stamp, when it chose so (and has one)
  const stampFace = shop.stamp_logo && shop.logo ? shop.logo : null;
  // said once, when the demo opens — not again when the page behind it re-renders (the counter polls)
  useEffect(() => signal("tryit", "open"), []);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [onClose]);
  const captions = byPoints ? [t.tryScan, t.tryPoints] : [t.tryScan, t.tryStamp, fill(t.tryWin, { n: goal, gift }), t.tryYou];
  const last = beat === captions.length - 1;
  const next = () => {
    if (last) {
      signal("tryit", "done");
      onClose();
    } else setBeat(beat + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex animate-fade flex-col items-center justify-center bg-ink/80 px-5 text-center text-white backdrop-blur-[3px]" role="dialog" aria-modal="true" aria-label={t.tryTitle}>
      <button type="button" onClick={onClose} className="press absolute end-4 top-[max(1rem,env(safe-area-inset-top))] grid size-10 place-items-center rounded-full bg-white/15" aria-label={t.back}>
        <X className="size-5" />
      </button>
      <p className="text-[0.8125rem] font-semibold text-white/70">{t.tryTitle}</p>
      <p key={beat} className="mt-1 min-h-[3.2rem] max-w-[22rem] animate-rise text-balance text-[1.0625rem] font-bold leading-snug">
        <span className="num me-1.5 inline-grid size-6 place-items-center rounded-full bg-white/20 align-[-3px] text-[0.75rem]">{beat + 1}</span>
        {captions[beat]}
      </p>

      {/* the drawn phone: the customer's screen, or the owner's on the last beat */}
      <div className="relative mt-4 aspect-[9/16] w-[min(19rem,78vw,30dvh)] overflow-hidden rounded-[2rem] bg-canvas text-ink shadow-[0_30px_60px_-20px_rgb(0_0_0/0.6)] ring-[6px] ring-[#1a1726]">
        <span className="absolute left-1/2 top-2 h-1.5 w-16 -translate-x-1/2 rounded-full bg-ink/15" aria-hidden />
        <div key={beat} className="flex h-full flex-col items-center justify-center px-4 pb-4 pt-8 text-center">
          {beat === 0 && (
            <Phone>
              <span className="relative grid size-24 place-items-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-brand/15" />
                <span className="grid size-[4.25rem] place-items-center rounded-full bg-[linear-gradient(150deg,#9b7bff,#6c47ff_55%,#4a2ad6)] text-white">
                  <ScanLine className="size-8" />
                </span>
              </span>
              <p className="mt-3 text-[0.9375rem] font-semibold text-muted">{t.checking}</p>
              <p className="mt-4 flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[0.75rem] font-bold text-body shadow-card">
                <QrCode className="size-3.5 text-brand" /> {shop.name}
              </p>
            </Phone>
          )}
          {beat === 1 && (
            <Phone>
              <Confetti count={24} />
              <StampLand color={shop.color} icon={byPoints ? "coin" : kindIcon(shop.kind)} size={84} logo={byPoints ? null : stampFace} label={byPoints ? `+${DEMO_POINTS}` : "+1"} />
              <p className="mt-1 text-[1.25rem] font-bold">{byPoints ? fill(t.pointsWon, { n: pointsSaid(DEMO_POINTS) }) : t.newStamp}</p>
              <p className="text-[0.8125rem] font-semibold text-muted">{shop.name}</p>
              <div className="mt-3 w-full text-start">
                <Pass shop={pass} stamps={1} points={DEMO_POINTS} small fresh />
              </div>
            </Phone>
          )}
          {beat === 2 && (
            <Phone>
              <Confetti count={40} />
              <StampLand color={shop.color} icon={kindIcon(shop.kind)} size={72} logo={stampFace} />
              <p className="mt-1 text-balance text-[1.125rem] font-bold leading-tight">{fill(t.won, { gift })}</p>
              <div className="mt-2 w-full text-start">
                <Pass shop={pass} stamps={goal} small />
              </div>
              <span className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-[0.875rem] bg-[linear-gradient(150deg,#ffa183,#ff6b4a)] px-3 py-2 text-[0.8125rem] font-bold text-white">
                <Icon3D name="gift" size={22} /> {t.wonBody}
              </span>
            </Phone>
          )}
          {beat === 3 && (
            <Phone>
              <p className="absolute top-8 text-[0.6875rem] font-bold text-muted">{t.tryYourScreen}</p>
              <Icon3D name="gift" size={56} className="animate-pop" />
              <p className="mt-2 text-[1.125rem] font-bold">{fill(t.popGiftHas, { name: t.tryName })}</p>
              <p className="mt-0.5 text-balance text-[1rem] font-bold text-coral">{gift}</p>
              <p className="mt-1 text-[0.8125rem] text-muted">{t.popGiftAsk}</p>
              <span className="mt-3 flex w-full items-center justify-center rounded-[0.875rem] bg-[linear-gradient(150deg,#ffa183,#ff6b4a)] py-2.5 text-[0.875rem] font-bold text-white">{t.popGiftGive}</span>
              <span className="mt-1.5 text-[0.8125rem] font-semibold text-muted">{t.popGiftLater}</span>
            </Phone>
          )}
        </div>
      </div>

      <div className="mt-4 flex w-full max-w-[19rem] items-center gap-2">
        {beat > 0 && (
          <button type="button" onClick={() => setBeat(beat - 1)} className="press grid size-12 shrink-0 place-items-center rounded-full bg-white/15" aria-label={t.back}>
            <ChevronLeft className="size-5 rotate-180" />
          </button>
        )}
        <button type="button" onClick={next} className="press h-12 flex-1 rounded-full bg-white text-[1rem] font-bold text-ink">
          {last ? t.tryGotIt : t.next}
        </button>
      </div>
    </div>
  );
}

const Phone = ({ children }: { children: ReactNode }) => <div className="relative flex w-full flex-col items-center">{children}</div>;

/** A button that opens the demo: its children are its face. */
export function TryItButton({ shop, className, children }: { shop: DemoShop; className?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  // one and the same closer for the demo's life: its listeners are not torn down on every render
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {open && <TryIt shop={shop} onClose={close} />}
    </>
  );
}
