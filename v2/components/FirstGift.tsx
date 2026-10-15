"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ScanLine } from "lucide-react";
import { useScreen } from "@/components/Tracker";
import { Icon3D } from "@/components/ui";
import { seenBefore, shown } from "@/lib/once";
import { fill, t } from "@/lib/t";

/**
 * The shop's first gift won: how to hand it over, once in the owner's life —
 * there is one way, «سكاني»: the customer shows the code on their phone, the
 * camera reads it, and the screen asks «إيه، عطيه الكادو». Three short lines
 * and the button that starts it.
 */
export function FirstGift({ shopId, name, gift }: { shopId: string; name: string | null; gift: string }) {
  const [open, setOpen] = useState(false);
  useScreen(open ? "first-gift" : null);
  useEffect(() => {
    if (seenBefore("first_gift", shopId)) return;
    const id = setTimeout(() => {
      shown("first_gift", shopId);
      setOpen(true);
    }, 700);
    return () => clearTimeout(id);
  }, [shopId]);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [open]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid animate-fade items-end justify-items-center bg-ink/45 p-4 backdrop-blur-[2px] sm:items-center" role="dialog" aria-modal="true" aria-label={t.firstGiftTitle} onClick={() => setOpen(false)}>
      <div className="w-full max-w-sm animate-rise rounded-[1.75rem] bg-surface p-5 text-center shadow-lift" onClick={(e) => e.stopPropagation()}>
        <Icon3D name="gift" size={60} className="mx-auto animate-float" />
        <h2 className="mt-2 text-balance text-[1.25rem] font-bold leading-tight">{fill(t.firstGiftWon, { name: name ?? t.someone, gift })}</h2>
        <p className="mt-1 text-[0.9375rem] font-semibold text-muted">{t.firstGiftTitle}</p>
        <ol className="mx-auto mt-3 max-w-[17rem] space-y-1.5 text-start">
          {t.firstGiftSteps.map((s, i) => (
            <li key={s} className="flex items-center gap-2.5">
              <span className="num grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-[0.75rem] font-bold text-brand">{i + 1}</span>
              <span className="text-[0.9375rem] font-semibold">{s}</span>
            </li>
          ))}
        </ol>
        <Link href="/shop/collect?by=scan" className="press mt-4 flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-[1.25rem] bg-[linear-gradient(150deg,#ffa183,#ff6b4a)] text-[1.0625rem] font-bold text-white">
          <ScanLine className="size-5" /> {t.firstGiftGo}
        </Link>
        <button type="button" onClick={() => setOpen(false)} className="press mt-1.5 h-11 w-full text-[0.9375rem] font-semibold text-muted">
          {t.logoTipLater}
        </button>
      </div>
    </div>
  );
}
