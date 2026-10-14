"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Hourglass } from "lucide-react";
import { adminTrial } from "@/app/actions";

const PICKS = [1, 3, 7, 14];
const day = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Africa/Tunis" }).format(new Date(iso));

/**
 * More days of trial for a shop, by the founder's hand — not a subscription:
 * nothing paid, no year turned on. Added onto the trial still running (or from
 * now, when it is over); the owner is told once, in a plain popup.
 */
export function AdminTrial({ shopId, until, over, started = true }: { shopId: string; until: string; over: boolean; started?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [pick, setPick] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const give = (days: number) =>
    start(async () => {
      setError(null);
      const res = await adminTrial(shopId, days);
      if (!res.ok) return setError("ما تعدّاتش، عاود");
      setPick(null);
      router.refresh();
    });

  return (
    <div className="mt-4 border-t border-line pt-3">
      <p className="flex items-center gap-1.5 text-[0.8438rem] font-bold text-muted">
        <Hourglass className="size-4" /> التجربة
        <span className={`ms-auto font-semibold ${over ? "text-coral" : "text-body"}`}>{over ? `وفات ${day(until)}` : started ? `توفى ${day(until)}` : "تبدا مع أوّل حريف"}</span>
      </p>
      {pick === null ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[0.8125rem] text-muted">زيدو في التجربة:</span>
          {PICKS.map((d) => (
            <button key={d} type="button" disabled={pending} onClick={() => setPick(d)} className="h-8 rounded-full border border-line bg-surface px-3 text-[0.8125rem] font-semibold text-body hover:border-brand hover:text-brand disabled:opacity-60">
              +{d} {d === 1 ? "نهار" : "أيّام"}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-2 rounded-[0.75rem] bg-canvas p-2.5">
          <p className="min-w-0 flex-1 text-[0.8438rem] font-semibold text-ink">
            تزيدو {pick} {pick === 1 ? "نهار" : "أيّام"} تجربة؟ يطلعلو ميساج صغير مرّة وحدة.
          </p>
          <button type="button" onClick={() => setPick(null)} className="h-8 shrink-0 rounded-[0.5rem] bg-surface px-3 text-[0.8125rem] font-semibold">
            لا
          </button>
          <button type="button" disabled={pending} onClick={() => give(pick)} className="h-8 shrink-0 rounded-[0.5rem] bg-brand px-3 text-[0.8125rem] font-bold text-white disabled:opacity-60">
            {pending ? "…" : "زيد"}
          </button>
        </div>
      )}
      {error && <p className="mt-1.5 text-[0.8125rem] font-semibold text-coral">{error}</p>}
    </div>
  );
}
