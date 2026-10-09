"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { useScreen } from "@/components/Tracker";
import { t } from "@/lib/t";

const LAST = "pl-points";

/**
 * The question before the code, in a shop that counts points: how many is
 * this one worth.
 *
 * It is asked FIRST — there is no code on the screen to be scanned by
 * mistake, and the server will not make one without an answer either — so a
 * scan can never be worth the wrong number.
 *
 * Most counters give the same amount most of the time, so the last one is
 * remembered on this phone and offered ready to send: a café giving five a
 * coffee presses one button all day. Typing a different number is right
 * there when the round is bigger.
 */
/** What this counter gave last — read where the field is first made, not in
 *  an effect afterwards, so the number is there on the first paint. */
function lastGiven(): string {
  if (typeof window === "undefined") return "";
  try {
    const kept = Number(window.localStorage.getItem(LAST));
    return Number.isFinite(kept) && kept >= 1 ? String(Math.floor(kept)) : "";
  } catch {
    // a phone that keeps nothing: the field simply starts empty
    return "";
  }
}

export function HowMany({ onPick }: { onPick: (n: number) => void }) {
  const [said, setSaid] = useState(lastGiven);
  const box = useRef<HTMLInputElement>(null);
  useScreen("counter-points");

  useEffect(() => {
    box.current?.focus();
  }, []);

  const n = Math.floor(Number(said));
  const ok = Number.isFinite(n) && n >= 1 && n <= 10000;

  const send = () => {
    if (!ok) return;
    try {
      localStorage.setItem(LAST, String(n));
    } catch {
      /* nothing kept: it is only a convenience */
    }
    onPick(n);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className="flex min-h-0 flex-1 flex-col justify-center px-5 py-6"
    >
      <p className="text-center text-[1.375rem] font-bold leading-tight">{t.howManyAsk}</p>
      <p className="mt-1.5 text-center text-[0.9375rem] text-white/75">{t.howManyHint}</p>

      <div className="mx-auto mt-5 w-full max-w-[16rem]">
        <input
          ref={box}
          value={said}
          onChange={(e) => setSaid(e.target.value.replace(/\D/g, "").slice(0, 5))}
          inputMode="numeric"
          enterKeyHint="go"
          aria-label={t.howManyAsk}
          placeholder="5"
          // in px, not rem: the page's root shrinks on a small phone, and
          // anything under 16px makes iOS zoom in on the first tap
          className="num h-[4.5rem] w-full rounded-[1.25rem] bg-white/95 text-center text-[2.5rem] font-bold text-ink shadow-[0_14px_30px_-14px_rgb(0_0_0/0.45)] outline-none focus:ring-4 focus:ring-white/40"
          style={{ fontSize: "2.5rem", minHeight: "4.5rem" }}
        />
        <button
          type="submit"
          disabled={!ok}
          className="press mt-2.5 flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-[1.25rem] bg-white text-[1.0625rem] font-bold shadow-[0_14px_30px_-14px_rgb(0_0_0/0.5)] disabled:opacity-45"
          style={{ color: "var(--color-ink)" }}
        >
          <Check className="size-5" strokeWidth={3} /> {t.howManyGo}
        </button>
      </div>
    </form>
  );
}
