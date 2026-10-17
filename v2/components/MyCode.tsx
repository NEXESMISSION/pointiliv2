"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { QrCode, X } from "lucide-react";
import { Icon3D } from "@/components/ui";
import { signal } from "@/lib/track";
import { fill, t } from "@/lib/t";

const never = () => () => {};
/** In the browser (the page's body is there to hold a sheet), not while the server draws the page. */
const useBrowser = () => useSyncExternalStore(never, () => true, () => false);

/**
 * The customer's own code, one tap away: its QR for the shop's camera, and its
 * 6 digits to say out loud (or the phone number does the same). Brighter than
 * the page, so a phone held up at the counter reads it.
 *
 * With `gift`, the same code is the gift's: «ورّي الكود هذا في الكاسة» — the
 * shop scans it (or types it), sees the gift waiting, and hands it over. The
 * button that opens it is `children` (a banner, a button), or the small pill;
 * `startOpen` opens it at once (from the scan that just won it).
 *
 * Over the whole screen, white and bright, nothing behind it (the founder's
 * «simpler», 17 Oct 2026). It is drawn on the page's body, not where its button sits: a button
 * may live in a box that slid or popped in (the animation leaves a transform
 * on it, and a transformed box holds its `fixed` children inside itself) or
 * that clips what overflows — the sheet would be cut to that box, in its colours.
 */
export function MyCode({ code, svg, gift, startOpen = false, className, children }: { code: string; svg: string; gift?: string | null; startOpen?: boolean; className?: string; children?: ReactNode }) {
  const [open, setOpen] = useState(startOpen);
  const browser = useBrowser();
  useEffect(() => {
    if (!open) return;
    signal(gift ? "gift_code" : "my_code");
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [open, gift]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? "press flex h-11 items-center gap-2 rounded-full bg-surface pe-4 ps-3 text-[0.9375rem] font-bold text-ink shadow-card"}
      >
        {children ?? (
          <>
            <QrCode className="size-5 text-brand" /> {t.myCode}
          </>
        )}
      </button>
      {open && browser && createPortal(
        // the whole screen, white and bright, nothing behind it: a phone held up at the counter, the shop's camera reads it at once
        <div className="safe-t safe-b fixed inset-0 z-50 flex animate-fade flex-col bg-white px-[clamp(1rem,5vw,1.5rem)] text-center text-ink" role="dialog" aria-modal="true" aria-label={gift ? fill(t.giftCodeTitle, { gift }) : t.myCodeTitle}>
          <div className="flex shrink-0 justify-end pt-2">
            <button type="button" onClick={() => setOpen(false)} className="press grid size-11 place-items-center rounded-full bg-canvas" aria-label={t.back}>
              <X className="size-5" />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center pb-[4dvh]" style={{ animation: "code-in 420ms cubic-bezier(0.2,0.8,0.2,1) both" }}>
            <style>{`@keyframes code-in { from { transform: translateY(24px) scale(0.97); opacity: 0; } to { transform: none; opacity: 1; } }`}</style>
            {gift ? (
              <>
                <Icon3D name="gift" size={56} className="animate-float" />
                <p className="mt-1 text-[0.9375rem] font-semibold text-coral">{t.giftCodeKicker}</p>
                <h2 className="mt-0.5 text-balance text-[1.625rem] font-bold leading-tight">{gift}</h2>
              </>
            ) : (
              <h2 className="text-[1.625rem] font-bold">{t.myCodeTitle}</h2>
            )}
            {/* the person's own code and its QR: never in a visit's video */}
            <div
              data-clarity-mask="true"
              className={`mt-[3dvh] aspect-square w-[min(78vw,44dvh,20rem)] rounded-[2rem] bg-white p-[5%] [&>svg]:size-full ${gift ? "shadow-[0_0_0_5px_#ff6b4a,0_24px_50px_-24px_rgb(255_107_74/0.6)]" : "shadow-[0_0_0_5px_#6c47ff,0_24px_50px_-24px_rgb(108_71_255/0.6)]"}`}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            <p dir="ltr" data-clarity-mask="true" className="num mt-[3dvh] text-[2.5rem] font-bold leading-none tracking-[0.18em]">
              {code.slice(0, 3)} {code.slice(3)}
            </p>
            <p className="mx-auto mt-2.5 max-w-[18rem] text-balance text-[0.9375rem] leading-relaxed text-muted">{gift ? t.giftCodeHint : t.myCodeHint}</p>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
