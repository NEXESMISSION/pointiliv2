"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, PhoneCall, TriangleAlert } from "lucide-react";
import { phoneGive } from "@/app/actions";
import { Btn } from "@/components/ui";
import { signal } from "@/lib/track";
import { t } from "@/lib/t";

/**
 * The founder asked this owner for their real number (the one they signed up
 * with is plainly not theirs). Over every owner screen, and it does not go
 * away — no close, no tap outside — until a real number is given; then it
 * says the number is being checked and a call is coming, and lets them be.
 */
export function PhoneCheck() {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [gone, setGone] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    signal("phone_check");
    // nothing scrolls behind it
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = before;
    };
  }, []);

  if (gone) return null;
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const send = () =>
    start(async () => {
      const res = await phoneGive(digits);
      if (res.ok) {
        setError(null);
        setSent(true);
        signal("phone_given");
      } else setError(res.error === "same" ? t.phoneCheckSame : res.error === "too_many" ? t.errTooMany : res.error === "invalid" ? t.phoneCheckBad : t.errNetwork);
    });

  return (
    <div className="fixed inset-0 z-[70] flex animate-fade items-center justify-center bg-[rgb(20_16_40/0.6)] px-5 backdrop-blur-[3px]" role="alertdialog" aria-modal="true" aria-label={t.phoneCheckTitle}>
      <div className="w-full max-w-sm rounded-[1.75rem] bg-surface px-5 pb-5 pt-6 text-center text-ink shadow-card" style={{ animation: "pc-in 360ms cubic-bezier(0.2,0.8,0.2,1) both" }}>
        <style>{`@keyframes pc-in { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: none; } }`}</style>
        {sent ? (
          <>
            <span className="mx-auto grid size-16 animate-pop place-items-center rounded-full bg-mint-soft text-mint">
              <CheckCircle2 className="size-9" />
            </span>
            <h2 className="mt-3 text-[1.25rem] font-bold leading-tight">{t.phoneCheckSentTitle}</h2>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-balance text-[0.9375rem] leading-relaxed text-body">
              <PhoneCall className="size-4 shrink-0 text-brand" /> {t.phoneCheckSentBody}
            </p>
            <Btn type="button" className="mt-5" onClick={() => setGone(true)}>
              {t.phoneCheckOk}
            </Btn>
          </>
        ) : (
          <>
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-coral-soft text-coral">
              <TriangleAlert className="size-8" />
            </span>
            <h2 className="mt-3 text-balance text-[1.25rem] font-bold leading-tight">{t.phoneCheckTitle}</h2>
            <p className="mt-2 text-balance text-[0.9375rem] leading-relaxed text-body">{t.phoneCheckBody}</p>
            <form
              className="mt-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (digits.length === 8) send();
              }}
            >
              <span dir="ltr" className="flex h-[3.5rem] w-full items-center rounded-[1.125rem] bg-canvas shadow-[inset_0_0_0_1px_var(--color-line)] focus-within:shadow-[inset_0_0_0_2px_var(--color-brand)]">
                <span className="num ps-4 pe-3 text-[1.0625rem] font-semibold text-muted">+216</span>
                <input
                  value={digits.replace(/^(\d{2})(\d{1,3})?(\d{1,3})?$/, (_, a, b, c) => [a, b, c].filter(Boolean).join(" "))}
                  onChange={(e) => {
                    setValue(e.target.value);
                    setError(null);
                  }}
                  inputMode="tel"
                  autoComplete="tel-national"
                  autoFocus
                  placeholder="22 123 456"
                  aria-label={t.phoneCheckField}
                  className="num h-full min-w-0 flex-1 bg-transparent pe-4 text-[1.25rem] font-bold tracking-wide outline-none placeholder:font-semibold placeholder:text-faint"
                />
              </span>
              {error && <p className="mt-2 text-[0.8125rem] font-semibold text-coral">{error}</p>}
              <Btn type="submit" className="mt-3" disabled={pending || digits.length !== 8}>
                {pending ? t.checking : t.phoneCheckSend}
              </Btn>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
