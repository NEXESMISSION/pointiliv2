"use client";

import { useState, useTransition } from "react";
import { adminSetClock } from "@/app/actions-clock";
import { Switch } from "@/components/Owner";

/**
 * The founder's switch for the card's clock, for every shop at once (settings.clock_on). Off — as it
 * starts — no owner sees it anywhere (the card's questions, «المحل», the note) and no card ever goes back
 * to zero, whatever a shop set. Turning it on asks first; every clock then counts from that day.
 */
export function AdminClock({ on: atFirst }: { on: boolean }) {
  const [on, setOn] = useState(atFirst);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  const flip = (next: boolean) =>
    start(async () => {
      const res = await adminSetClock(next).catch(() => ({ ok: false }));
      setError(!res.ok);
      if (res.ok) setOn(next);
      setAsking(false);
    });
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1">
          <b className="block text-[0.9062rem] text-ink">{on ? "يخدم للمحلات الكل" : "مطفي للكل"}</b>
          <span className="block text-[0.75rem] leading-snug text-muted">
            {on
              ? "مطفي عند كل محل حتى يشعلو مولاه وحدو ويختار عدد الأيام، ولا يوقّفو. الحرفاء يشوفو العدّاد في الكارط متاعهم."
              : "حتى محل ما يشوفو، وحتى كارط ما ترجع للصفر — حتى كان محل حدّد الأيام قبل."}
          </span>
        </span>
        <Switch on={on} label="الكارط ترجع للصفر" disabled={pending} onClick={() => (on ? flip(false) : setAsking(!asking))} />
      </div>
      {asking && (
        <div className="flex flex-wrap items-center gap-2 rounded-[0.75rem] bg-canvas p-2.5">
          <span className="min-w-0 flex-1 text-[0.8125rem] font-semibold text-ink">تخدّمو للمحلات الكل؟ كل عدّاد يبدا يحسب من اليوم، وحتى حد ما يخسر حاجة اليوم.</span>
          <button type="button" onClick={() => setAsking(false)} className="h-8 rounded-[0.5rem] bg-surface px-3 text-[0.8125rem] font-semibold text-body ring-1 ring-line">
            لا
          </button>
          <button type="button" disabled={pending} onClick={() => flip(true)} className="h-8 rounded-[0.5rem] bg-brand px-3 text-[0.8125rem] font-bold text-white disabled:opacity-60">
            {pending ? "…" : "إيه"}
          </button>
        </div>
      )}
      {error && <p className="text-[0.75rem] font-semibold text-coral">ما تعدّاتش، عاود.</p>}
    </div>
  );
}
