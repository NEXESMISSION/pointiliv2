"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setClockDays } from "@/app/actions-clock";
import { daysN, fill, t } from "@/lib/t";
import { signal } from "@/lib/track";

const DAYS = [7, 15, 30];

/**
 * The days of the card's clock, chosen on its own page (/shop/clock): 7, 15, 30, or typed (7 to 365), what
 * it does said under the choice, then one button — «شعّل العدّاد» when it is off (the founder, 7 Nov 2026:
 * «off on the owner's side by default, they need to turn it on so it works for them»), «سجّل» when it only
 * changes. Nothing is chosen to begin with when it is off: the owner picks, then turns it on.
 */
export function ClockDays({ current, onDone }: { current: number | null; onDone?: () => void }) {
  const router = useRouter();
  const [days, setDays] = useState<number | null>(current);
  const [typed, setTyped] = useState(current && !DAYS.includes(current) ? String(current) : "");
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  const bad = typed !== "" && !(Number(typed) >= 7 && Number(typed) <= 365);
  const ready = days !== null && !bad && days !== current;

  const save = () =>
    start(async () => {
      if (days === null) return;
      const res = await setClockDays(days).catch(() => ({ ok: false }));
      setError(!res.ok);
      if (!res.ok) return;
      signal(current ? "clock_days" : "clock_on", String(days));
      onDone?.();
      router.refresh();
    });

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {DAYS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => {
              setDays(d);
              setTyped("");
            }}
            aria-pressed={days === d && !typed}
            className={`press min-h-[3.25rem] rounded-[1rem] px-1 py-2 text-[0.9375rem] font-bold leading-tight ${days === d && !typed ? "bg-brand text-white shadow-[0_10px_22px_-10px_rgb(108_71_255/0.8)]" : "bg-canvas text-ink"}`}
          >
            {daysN(d)}
          </button>
        ))}
      </div>
      <label className="mt-2.5 flex items-center justify-center gap-2.5">
        <span className="text-[0.875rem] font-semibold text-muted">{t.wizResetOther}</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={3}
          value={typed}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 3);
            setTyped(v);
            if (Number(v) >= 7 && Number(v) <= 365) setDays(Number(v));
            else if (v === "") setDays(current && DAYS.includes(current) ? current : null);
            else setDays(null);
          }}
          placeholder="10"
          aria-label={t.wizResetOther}
          aria-invalid={bad}
          className={`num h-10 w-[4.5rem] rounded-[0.75rem] bg-canvas text-center text-[16px] font-bold outline-none placeholder:font-normal placeholder:text-faint ${bad ? "shadow-[inset_0_0_0_2px_var(--color-coral)]" : typed ? "shadow-[inset_0_0_0_2px_var(--color-brand)]" : "focus:shadow-[inset_0_0_0_2px_var(--color-brand)]"}`}
        />
        <span className={`text-[0.75rem] ${bad ? "font-semibold text-coral" : "text-faint"}`}>{t.wizResetRange}</span>
      </label>
      {/* what it does, said before it is turned on */}
      <p className="mt-2.5 min-h-[2.5rem] text-center text-[0.8125rem] leading-snug text-body">{days ? fill(t.wizResetEx, { days: daysN(days) }) : t.clockPick}</p>
      <button
        type="button"
        disabled={!ready || pending}
        onClick={save}
        className="press mt-2.5 h-12 w-full rounded-[1rem] bg-brand text-[1rem] font-bold text-white shadow-[0_12px_26px_-12px_rgb(108_71_255/0.85)] disabled:opacity-45 disabled:shadow-none"
      >
        {pending ? t.checking : current ? t.save : t.clockTurnOn}
      </button>
      {error && <p className="mt-2 text-center text-[0.8125rem] font-semibold text-coral">{t.errNetwork}</p>}
    </div>
  );
}
