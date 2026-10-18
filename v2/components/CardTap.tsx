"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ScanLine } from "lucide-react";
import { Sheet, SheetGo } from "@/components/Client";
import { Icon3D } from "@/components/ui";
import { fill, stampsN, t } from "@/lib/t";
import { signal } from "@/lib/track";

const say = {
  open: "كيفاش ناخذ تامبون؟",
  left: "مازالولك {n} على {gift}",
  ready: "الكادو متاعك حاضر: {gift}",
  how: "كل مرّة تشري من {shop}، سكاني الكود اللي عند الكاسة، والتامبون يطيح وحدو على الكارط هاذي.",
  readyHow: "ورّي الكود متاعك للمحل (البوطون البرتقالي تحت الكارط)، وهو يعطيك الكادو.",
  scan: "سكاني الكود",
};

/**
 * The customer's card opens when tapped (customers kept tapping it: 42 taps
 * on nothing in 31 visits): how far the gift is, and how the next tampon is
 * taken — the shop's code at the counter, one tap to the scanner.
 *
 * The same sheet as everything else a customer is shown (components/Client).
 */
export function CardTap({ shop, gift, stamps, goal, ready, children }: { shop: string; gift: string; stamps: number; goal: number; ready: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (open) signal("card_tap");
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={say.open} className="press block w-full rounded-[1.75rem] text-start">
        {children}
      </button>
      {open && (
        <Sheet
          label={say.open}
          tone={ready ? "coral" : "brand"}
          icon={<Icon3D name="gift" size={56} className="mx-auto animate-float" />}
          title={ready ? fill(say.ready, { gift }) : fill(say.left, { n: stampsN(Math.max(goal - stamps, 0)), gift })}
          under={ready ? say.readyHow : fill(say.how, { shop })}
          onClose={() => setOpen(false)}
          action={
            !ready && (
              <SheetGo href="/scan">
                <ScanLine className="size-5" /> {say.scan}
              </SheetGo>
            )
          }
          dismiss={t.closeIt}
        />
      )}
    </>
  );
}
