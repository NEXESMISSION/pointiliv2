"use client";

import Link from "@/components/Link";
import { useEffect, useState } from "react";
import { Icon3D } from "@/components/ui";
import { seenHere, shown } from "@/lib/once";
import { signal } from "@/lib/track";
import { t } from "@/lib/t";

/**
 * Once in an owner's life, on their home: the card's clock is here (6 Nov 2026) — so many days with no
 * tampon and a card goes back to zero, the customer seeing the days left on their card. Said plainly that it
 * is OFF for them until they turn it on themselves (the founder, 7 Nov 2026). «نشوف ونشعلو» opens its page
 * (/shop/clock): the days, and «شعّل العدّاد». The same look as LinksTip, centred.
 *
 * `show` comes from the person's list of notes seen (and a shop with a clock already set never gets
 * it); it is written there the moment it shows, so it never comes back, here or on another phone.
 */
export function ResetTip({ who, show }: { who: string; show: boolean }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!show || seenHere("reset_tip", who)) return;
    const id = setTimeout(() => {
      if (seenHere("reset_tip", who)) return;
      shown("reset_tip", who);
      setOpen(true);
      signal("reset_tip");
    }, 900);
    return () => clearTimeout(id);
  }, [show, who]);

  const close = () => setOpen(false);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid animate-fade place-items-center px-4" role="dialog" aria-modal="true" aria-label={t.resetTipTitle}>
      <span className="absolute inset-0 bg-[rgb(20_16_40/0.6)]" aria-hidden />
      {/* a tap anywhere around closes it too */}
      <button type="button" className="absolute inset-0 cursor-default" onClick={close} tabIndex={-1} aria-hidden />
      <div className="relative w-full max-w-md rounded-[1.5rem] bg-surface p-4 text-ink shadow-[0_24px_60px_-20px_rgb(0_0_0/0.6)]" style={{ animation: "rt-in 420ms cubic-bezier(0.2,0.8,0.2,1) both" }}>
        <style>{`@keyframes rt-in { 0% { transform: translateY(14px) scale(0.98); opacity: 0; } 100% { transform: none; opacity: 1; } }`}</style>
        <div className="flex items-center gap-3">
          <Icon3D name="hourglass" size={50} className="shrink-0 animate-float" />
          <div className="min-w-0">
            <span className="inline-block rounded-full bg-coral-soft px-2 py-0.5 text-[0.75rem] font-bold text-coral">✨ {t.newBadge}</span>
            <h2 className="mt-0.5 text-[1.1875rem] font-bold leading-snug">{t.resetTipTitle}</h2>
          </div>
        </div>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-body">{t.resetTipBody}</p>
        <div className="mt-3.5 flex gap-2">
          <Link
            href="/shop/clock"
            onClick={() => {
              signal("reset_tip_try");
              close();
            }}
            className="press grid h-11 flex-1 place-items-center rounded-[0.875rem] bg-brand text-[0.9375rem] font-bold text-white shadow-[0_10px_22px_-10px_rgb(108_71_255/0.8)]"
          >
            {t.resetTipGo}
          </Link>
          <button type="button" onClick={close} className="press h-11 flex-1 rounded-[0.875rem] bg-ink/[0.06] text-[0.9375rem] font-bold text-body">
            {t.resetTipLater}
          </button>
        </div>
      </div>
    </div>
  );
}
