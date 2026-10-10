"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ScanLine, X } from "lucide-react";
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
 */
export function CardTap({ shop, gift, stamps, goal, ready, children }: { shop: string; gift: string; stamps: number; goal: number; ready: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    signal("card_tap");
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={say.open} className="press block w-full rounded-[1.75rem] text-start">
        {children}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex animate-fade items-end justify-center bg-ink/45" role="dialog" aria-modal="true" aria-label={say.open} onClick={() => setOpen(false)}>
          <div className="safe-b w-full max-w-md rounded-t-[1.75rem] bg-canvas px-[clamp(1rem,5vw,1.5rem)] pb-4 pt-3 text-center text-ink" style={{ animation: "card-up 380ms cubic-bezier(0.2,0.8,0.2,1) both" }} onClick={(e) => e.stopPropagation()}>
            <style>{`@keyframes card-up { from { transform: translateY(100%); } to { transform: none; } }`}</style>
            <div className="flex items-center justify-between">
              <span className="size-10" />
              <span className="mx-auto block h-1.5 w-10 rounded-full bg-line" aria-hidden />
              <button type="button" onClick={() => setOpen(false)} className="press grid size-10 place-items-center rounded-full bg-surface shadow-card" aria-label={t.back}>
                <X className="size-5" />
              </button>
            </div>
            <Icon3D name="gift" size={56} className="mx-auto animate-float" />
            <p className="mt-2 text-balance text-[1.375rem] font-bold">{ready ? fill(say.ready, { gift }) : fill(say.left, { n: stampsN(Math.max(goal - stamps, 0)), gift })}</p>
            <p className="mx-auto mt-2 max-w-xs text-balance text-[0.9688rem] text-muted">{ready ? say.readyHow : fill(say.how, { shop })}</p>
            {!ready && (
              <Link href="/scan" className="press mt-5 flex h-[3.25rem] items-center justify-center gap-2 rounded-[1.125rem] bg-brand text-[1rem] font-bold text-white shadow-[0_12px_26px_-12px_rgb(108_71_255/0.8)]">
                <ScanLine className="size-5" /> {say.scan}
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
