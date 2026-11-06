"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronLeft, Hourglass, PencilLine, PowerOff, Undo2 } from "lucide-react";
import { clockOff, restoreReset, setClockPaused } from "@/app/actions-clock";
import { Sheet, SheetGo } from "@/components/Client";
import { ClockDays } from "@/components/ClockDays";
import { Switch } from "@/components/Owner";
import { customersN, fill, stampsN, t } from "@/lib/t";
import { signal } from "@/lib/track";

type Clock = { days: number; paused: boolean; soon: number; taken: number; taken_stamps: number };

/**
 * The owner's hand on the card's clock (/shop/clock): the pause (a holiday, Ramadan, the shop closed —
 * no card goes back to zero, and back on it counts from today for everyone), what it takes in the next
 * days, what it took lately — given back in one tap, asked first — and the days changed or the clock
 * taken off (asked first too). Every change is said at once; the page is drawn again from the database.
 */
export function ClockControls({ clock }: { clock: Clock }) {
  const router = useRouter();
  const [paused, setPaused] = useState(clock.paused);
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);
  const [ask, setAsk] = useState<"restore" | "off" | null>(null);
  const [done, setDone] = useState<string | null>(null);
  // the days changed here, on this page (not the card's questions)
  const [changing, setChanging] = useState(false);

  const pause = (on: boolean) =>
    start(async () => {
      const res = await setClockPaused(on).catch(() => ({ ok: false }));
      setError(!res.ok);
      if (!res.ok) return;
      setPaused(on);
      signal(on ? "clock_paused" : "clock_resumed");
      router.refresh();
    });
  const go = () =>
    start(async () => {
      const res = await (ask === "restore" ? restoreReset() : clockOff()).catch(() => ({ ok: false, n: 0 }));
      if (!res.ok) return setError(true);
      signal(ask === "restore" ? "clock_restored" : "clock_off", String(res.n ?? ""));
      setDone(ask === "restore" ? fill(t.clockRestored, { n: customersN(res.n ?? 0) }) : null);
      setAsk(null);
      router.refresh();
    });

  const row = "flex items-center gap-3 px-3.5 py-3";
  return (
    <>
      <section className="mt-[1.6dvh] shrink-0 divide-y divide-line overflow-hidden rounded-[1.375rem] bg-surface shadow-card">
        {/* the pause: the one switch an owner needs before a holiday */}
        <div className={row}>
          <span className="min-w-0 flex-1">
            <b className="block text-[0.9375rem]">{t.clockPause}</b>
            <span className={`block text-[0.8125rem] leading-snug ${paused ? "font-semibold text-coral" : "text-muted"}`}>{paused ? t.clockPausedHint : t.clockPauseHint}</span>
          </span>
          <Switch on={paused} label={t.clockPause} disabled={pending} onClick={() => pause(!paused)} />
        </div>
        <button type="button" onClick={() => setChanging(!changing)} aria-expanded={changing} className={`press w-full text-start ${row} active:bg-canvas`}>
          <PencilLine className="size-5 shrink-0 text-brand" />
          <span className="min-w-0 flex-1 text-[0.9375rem] font-semibold">{t.clockChange}</span>
          <ChevronLeft className={`size-4 shrink-0 text-faint transition-transform ${changing ? "-rotate-90" : ""}`} />
        </button>
        {changing && (
          <div className="px-3.5 py-3">
            <ClockDays current={clock.days} onDone={() => setChanging(false)} />
          </div>
        )}
        <button type="button" onClick={() => setAsk("off")} className={`press w-full text-start ${row} active:bg-canvas`}>
          <PowerOff className="size-5 shrink-0 text-coral" />
          <span className="min-w-0 flex-1 text-[0.9375rem] font-semibold text-coral">{t.clockRemove}</span>
        </button>
      </section>

      {/* what it does these days: about to take, and taken lately — given back in one tap */}
      {!paused && clock.soon > 0 && (
        <p className="mt-[1.4dvh] flex shrink-0 items-center gap-2 rounded-[1rem] bg-coral-soft px-3.5 py-2.5 text-[0.8125rem] font-semibold text-coral">
          <Hourglass className="size-4 shrink-0" /> {fill(t.clockSoon, { n: customersN(clock.soon) })}
        </p>
      )}
      {clock.taken > 0 && !done && (
        <div className="mt-[1.4dvh] flex shrink-0 items-center gap-3 rounded-[1rem] bg-surface px-3.5 py-2.5 shadow-card">
          <span className="min-w-0 flex-1 text-[0.8125rem] font-semibold text-body">{fill(t.clockTaken, { n: customersN(clock.taken), stamps: stampsN(clock.taken_stamps) })}</span>
          <button type="button" onClick={() => setAsk("restore")} className="press flex h-9 shrink-0 items-center gap-1.5 rounded-[0.75rem] bg-brand-soft px-3 text-[0.8125rem] font-bold text-brand">
            <Undo2 className="size-4" /> {t.clockRestore}
          </button>
        </div>
      )}
      {done && <p className="mt-[1.4dvh] shrink-0 rounded-[1rem] bg-mint-soft px-3.5 py-2.5 text-[0.8125rem] font-semibold text-mint">{done}</p>}
      {error && <p className="mt-2 shrink-0 text-[0.8125rem] font-semibold text-coral">{t.errNetwork}</p>}

      {ask && (
        <Sheet
          tone={ask === "off" ? "coral" : "brand"}
          label={ask === "restore" ? t.clockRestore : t.clockRemove}
          title={ask === "restore" ? t.clockRestoreAsk : t.clockRemoveAsk}
          under={ask === "restore" ? t.clockRestoreBody : t.clockRemoveBody}
          hold={pending}
          onClose={() => !pending && setAsk(null)}
          dismiss={t.customerRemoveNo}
          action={
            <SheetGo tone={ask === "off" ? "coral" : "brand"} onClick={go}>
              {pending ? t.checking : ask === "restore" ? t.clockRestoreYes : t.clockRemoveYes}
            </SheetGo>
          }
        />
      )}
    </>
  );
}
