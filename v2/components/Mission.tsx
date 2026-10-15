"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { Confetti } from "@/components/StampLand";
import { shown } from "@/lib/once";
import { fill, t } from "@/lib/t";

const GOAL = 5;

/**
 * A new owner's first steps, on their home, ticked by what really happens —
 * nothing to tap to tick them: the card is ready (it is, they are here), the
 * first customer's tampon, five customers. «Customers» are people other than
 * the owner (a card of their own is a try). Under the steps, the one thing to
 * do now. All three done: a bravo, once, and the steps are gone for good.
 */
export function Mission({ served, shopId }: { served: number; shopId: string }) {
  const steps = [
    { label: t.missionCard, done: true },
    { label: t.missionFirst, done: served >= 1 },
    { label: fill(t.missionFive, { n: GOAL }), done: served >= GOAL },
  ];
  const at = steps.findIndex((s) => !s.done);
  const all = at === -1;
  // the bravo is the last time it shows: written down the moment it does
  const claimed = useRef(false);
  useEffect(() => {
    if (!all || claimed.current) return;
    claimed.current = true;
    shown("mission", shopId);
  }, [all, shopId]);

  // waiting for the first customer, the whole card is the way to the code (owners tapped it, and nothing happened)
  const toCode = at === 1;
  const look = "mt-[1.6dvh] block shrink-0 rounded-[1.25rem] bg-surface px-3.5 py-3 shadow-card";
  const body = (
    <>
      {all && <Confetti count={70} />}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[0.9375rem] font-bold">{all ? t.missionDone : t.missionTitle}</h2>
        <span className="num text-[0.8125rem] font-bold text-muted">
          {steps.filter((s) => s.done).length}/{steps.length}
        </span>
      </div>
      <ol className="mt-2 grid grid-cols-3 gap-1.5">
        {steps.map((s, i) => (
          <li key={s.label} className={`flex items-center gap-1.5 rounded-full py-1 pe-2 ps-1 text-[0.75rem] font-bold leading-tight ${s.done ? "bg-mint-soft text-mint" : i === at ? "bg-brand-soft text-brand" : "bg-canvas text-muted"}`}>
            <span className={`grid size-5 shrink-0 place-items-center rounded-full ${s.done ? "bg-mint text-white" : i === at ? "shadow-[inset_0_0_0_2px_var(--color-brand)]" : "shadow-[inset_0_0_0_2px_var(--color-line)]"}`}>
              {s.done && <Check className="size-3" strokeWidth={3.4} />}
            </span>
            <span className="min-w-0 truncate">{s.label}</span>
          </li>
        ))}
      </ol>
      {/* the one thing to do now */}
      {all ? (
        <p className="mt-2 text-[0.8125rem] leading-snug text-muted">{t.missionDoneBody}</p>
      ) : toCode ? (
        <span className="mt-2 block text-[0.8125rem] font-semibold leading-snug text-brand">{t.missionFirstHow} ←</span>
      ) : (
        <p className="mt-2 text-[0.8125rem] leading-snug text-muted">{fill(t.missionFiveHow, { n: GOAL - served })}</p>
      )}
    </>
  );
  return toCode ? (
    <Link href="/shop/qr" className={`press ${look}`} aria-label={t.missionTitle}>
      {body}
    </Link>
  ) : (
    <section className={look} aria-label={t.missionTitle}>
      {body}
    </section>
  );
}
