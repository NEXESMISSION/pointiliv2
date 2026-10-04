"use client";

import { useEffect, useState } from "react";
import { QrCode, X } from "lucide-react";
import { signal } from "@/lib/track";
import { t } from "@/lib/t";

/**
 * The customer's own code, one tap away in the wallet: its QR for the shop's
 * camera, and its 6 digits to say out loud (or the phone number does the
 * same). Brighter than the page, so a phone held up at the counter reads it.
 */
export function MyCode({ code, svg }: { code: string; svg: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    signal("my_code");
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="press flex h-11 items-center gap-2 rounded-full bg-surface pe-4 ps-3 text-[0.9375rem] font-bold text-ink shadow-card">
        <QrCode className="size-5 text-brand" /> {t.myCode}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex animate-fade items-end justify-center bg-ink/45" role="dialog" aria-modal="true" aria-label={t.myCodeTitle} onClick={() => setOpen(false)}>
          <div className="safe-b w-full max-w-md rounded-t-[1.75rem] bg-canvas px-[clamp(1rem,5vw,1.5rem)] pb-5 pt-3 text-center" style={{ animation: "code-up 380ms cubic-bezier(0.2,0.8,0.2,1) both" }} onClick={(e) => e.stopPropagation()}>
            <style>{`@keyframes code-up { from { transform: translateY(100%); } to { transform: none; } }`}</style>
            <div className="flex items-center justify-between">
              <span className="size-10" />
              <span className="mx-auto block h-1.5 w-10 rounded-full bg-line" aria-hidden />
              <button type="button" onClick={() => setOpen(false)} className="press grid size-10 place-items-center rounded-full bg-surface shadow-card" aria-label={t.back}>
                <X className="size-5" />
              </button>
            </div>
            <h2 className="mt-1 text-[1.375rem] font-bold">{t.myCodeTitle}</h2>
            <div className="mx-auto mt-[2dvh] aspect-square w-[min(68vw,36dvh,17rem)] rounded-[1.75rem] bg-white p-[6%] shadow-[0_20px_44px_-20px_rgb(20_16_40/0.45)] [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
            <p dir="ltr" className="num mt-[2dvh] text-[2.25rem] font-bold tracking-[0.18em]">
              {code.slice(0, 3)} {code.slice(3)}
            </p>
            <p className="mx-auto mt-1 max-w-[18rem] text-[0.9375rem] leading-relaxed text-muted">{t.myCodeHint}</p>
          </div>
        </div>
      )}
    </>
  );
}
