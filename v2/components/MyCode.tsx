"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { QrCode } from "lucide-react";
import { FullSheet } from "@/components/Client";
import { Icon3D } from "@/components/ui";
import { signal } from "@/lib/track";
import { fill, t } from "@/lib/t";

const never = () => () => {};
/** In the browser (the page's body is there to hold a sheet), not while the server draws the page. */
const useBrowser = () => useSyncExternalStore(never, () => true, () => false);

/**
 * The customer's own code, one tap away: its QR for the shop's camera, and its
 * 6 digits to say out loud (or the phone number does the same). The whole
 * screen, white and bright, so a phone held up at a counter reads across it.
 *
 * With `gift`, the same code is the gift's: «ورّي الكود هذا في الكاسة» — the
 * shop scans it (or types it), sees the gift waiting, and hands it over. The
 * gift says so in words and in the coral above it, not in a thick frame
 * around the QR: a border in a colour that belongs to nothing else only made
 * the code harder to read (the founder, 18 Oct 2026).
 *
 * The button that opens it is `children` (a banner, a button), or the small
 * pill; `startOpen` opens it at once (from the scan that just won it).
 *
 * It is drawn on the page's body, not where its button sits: a button may live
 * in a box that slid or popped in (the animation leaves a transform on it, and
 * a transformed box holds its `fixed` children inside itself) or that clips
 * what overflows — the sheet would be cut to that box, in its colours.
 */
export function MyCode({ code, svg, gift, startOpen = false, className, children }: { code: string; svg: string; gift?: string | null; startOpen?: boolean; className?: string; children?: ReactNode }) {
  const [open, setOpen] = useState(startOpen);
  const browser = useBrowser();
  useEffect(() => {
    if (!open) return;
    signal(gift ? "gift_code" : "my_code");
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
      {open &&
        browser &&
        createPortal(
          <FullSheet onClose={() => setOpen(false)} label={gift ? fill(t.giftCodeTitle, { gift }) : t.myCodeTitle}>
            {gift ? (
              <>
                <Icon3D name="gift" size={56} className="animate-float" />
                <p className="mt-1 text-[0.9375rem] font-semibold text-coral">{t.giftCodeKicker}</p>
                <h2 className="mt-0.5 text-balance text-[1.625rem] font-bold leading-tight">{gift}</h2>
              </>
            ) : (
              <h2 className="text-[1.625rem] font-bold">{t.myCodeTitle}</h2>
            )}
            {/* the person's own code and its QR: on white, nothing drawn around it, and never in a visit's video */}
            <div
              data-clarity-mask="true"
              className="mt-[3dvh] aspect-square w-[min(78vw,44dvh,20rem)] bg-white [&>svg]:size-full"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            <p dir="ltr" data-clarity-mask="true" className="num mt-[3dvh] text-[2.5rem] font-bold leading-none tracking-[0.18em]">
              {code.slice(0, 3)} {code.slice(3)}
            </p>
            <p className="mx-auto mt-2.5 max-w-[18rem] text-balance text-[0.9375rem] leading-relaxed text-muted">{gift ? t.giftCodeHint : t.myCodeHint}</p>
          </FullSheet>,
          document.body,
        )}
    </>
  );
}
