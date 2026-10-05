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
 * The sheet is drawn on the page's body, not where its button sits: a button
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
        <div className="fixed inset-0 z-50 flex animate-fade items-end justify-center bg-ink/45" role="dialog" aria-modal="true" aria-label={gift ? fill(t.giftCodeTitle, { gift }) : t.myCodeTitle} onClick={() => setOpen(false)}>
          <div className="safe-b w-full max-w-md rounded-t-[1.75rem] bg-canvas px-[clamp(1rem,5vw,1.5rem)] pb-5 pt-3 text-center text-ink" style={{ animation: "code-up 380ms cubic-bezier(0.2,0.8,0.2,1) both" }} onClick={(e) => e.stopPropagation()}>
            <style>{`@keyframes code-up { from { transform: translateY(100%); } to { transform: none; } }`}</style>
            <div className="flex items-center justify-between">
              <span className="size-10" />
              <span className="mx-auto block h-1.5 w-10 rounded-full bg-line" aria-hidden />
              <button type="button" onClick={() => setOpen(false)} className="press grid size-10 place-items-center rounded-full bg-surface shadow-card" aria-label={t.back}>
                <X className="size-5" />
              </button>
            </div>
            {gift ? (
              <h2 className="mt-1 flex items-center justify-center gap-2 text-balance text-[1.375rem] font-bold leading-tight">
                <Icon3D name="gift" size={34} className="shrink-0" /> {fill(t.giftCodeTitle, { gift })}
              </h2>
            ) : (
              <h2 className="mt-1 text-[1.375rem] font-bold">{t.myCodeTitle}</h2>
            )}
            <div
              className={`mx-auto mt-[2dvh] aspect-square w-[min(68vw,36dvh,17rem)] rounded-[1.75rem] bg-white p-[6%] [&>svg]:size-full ${gift ? "shadow-[0_0_0_4px_#ff6b4a]" : "shadow-[0_20px_44px_-20px_rgb(20_16_40/0.45)]"}`}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            <p dir="ltr" className="num mt-[2dvh] text-[2.25rem] font-bold tracking-[0.18em]">
              {code.slice(0, 3)} {code.slice(3)}
            </p>
            <p className="mx-auto mt-1 max-w-[18rem] text-[0.9375rem] leading-relaxed text-muted">{gift ? t.giftCodeHint : t.myCodeHint}</p>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
