"use client";

import { useEffect, useState } from "react";
import { ScanLine } from "lucide-react";
import { Sheet, SheetGo } from "@/components/Client";
import { useScreen } from "@/components/Tracker";
import { Icon3D } from "@/components/ui";
import { seenBefore, shown } from "@/lib/once";
import { fill, t } from "@/lib/t";

/**
 * The shop's first gift won: how to hand it over, once in the owner's life —
 * there is one way, «سكاني»: the customer shows the code on their phone, the
 * camera reads it, and the screen asks «إيه، عطيه الكادو». Three short lines
 * and the button that starts it, in the same sheet as everything else
 * (components/Client).
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
  if (!open) return null;

  return (
    <Sheet
      label={t.firstGiftTitle}
      tone="coral"
      icon={<Icon3D name="gift" size={60} className="mx-auto animate-float" />}
      title={fill(t.firstGiftWon, { name: name ?? t.someone, gift })}
      under={t.firstGiftTitle}
      onClose={() => setOpen(false)}
      action={
        <SheetGo tone="coral" href="/shop/collect?by=scan">
          <ScanLine className="size-5" /> {t.firstGiftGo}
        </SheetGo>
      }
      dismiss={t.logoTipLater}
    >
      <ol className="mx-auto mt-3 max-w-[17rem] space-y-1.5 text-start">
        {t.firstGiftSteps.map((s, i) => (
          <li key={s} className="flex items-center gap-2.5">
            <span className="num grid size-6 shrink-0 place-items-center rounded-full bg-coral-soft text-[0.75rem] font-bold text-coral">{i + 1}</span>
            <span className="text-[0.9375rem] font-semibold">{s}</span>
          </li>
        ))}
      </ol>
    </Sheet>
  );
}
