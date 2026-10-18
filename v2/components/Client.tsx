"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { t } from "@/lib/t";

/** a sheet is drawn on the body: nothing to subscribe to, false while the server renders */
const never = () => () => {};
const useBrowser = () => useSyncExternalStore(never, () => true, () => false);

/*
 * The customer's screens, one look (the founder, 18 Oct 2026: «all the UIs of
 * the client pages look super ugly… we need better cleaner popups… super
 * simple… even the go back button should lead to something good and clean»).
 *
 * Six popups had six shapes: a white full screen with an ✕, a bottom sheet in
 * another colour with its own keyframes, a card in the middle of a blur, two
 * more cards on a darker overlay with a third animation, and the wheel. Each
 * one was somebody's good idea on its own day, and together they read as five
 * different apps. So:
 *
 *  - everything asked is a <Sheet>: one container, one place, one way out;
 *  - the code held up at the counter is a <FullSheet>: the only thing that
 *    takes the whole screen, because a camera has to read it across a counter;
 *  - purple is what can be done, green is done, coral is a gift;
 *  - the shop's own colour only on its card and its mark, never on the app;
 *  - a QR sits on white with nothing drawn around it — a thick frame in a
 *    colour that belongs to nothing else only makes it harder to read;
 *  - back goes to the screen above, which is known, never to history, which
 *    is not.
 */

/**
 * One sheet for everything the customer is shown.
 *
 * It rises from the bottom, where a thumb is, and sits in the middle only on
 * a screen wide enough that the bottom is far away. The bar at the top says it
 * can be pushed back down; tapping away from it or pressing Escape does the
 * same, so nobody is ever held in it — unless `hold`, for the moment between
 * a turn of the wheel being drawn and the customer seeing what they won: a
 * tap away there would lose a prize the server has already given.
 *
 * `tone` tints the bar at the top and nothing else, so a gift and a warning
 * are the same shape and only the colour tells them apart.
 *
 * It takes a big child: about 25rem across, and it scrolls only if it is
 * taller than the screen — nothing is clipped above the fold, so a pointer or
 * a shadow may hang over the edge of whatever is inside.
 */
export function Sheet({
  title,
  under,
  tone = "brand",
  icon,
  hold = false,
  onClose,
  children,
  action,
  dismiss,
  label,
}: {
  title?: ReactNode;
  under?: ReactNode;
  tone?: "brand" | "mint" | "coral";
  icon?: ReactNode;
  hold?: boolean;
  onClose: () => void;
  children?: ReactNode;
  action?: ReactNode;
  dismiss?: string;
  label?: string;
}) {
  const browser = useBrowser();
  useEffect(() => {
    if (hold) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [hold, onClose]);

  const bar = tone === "mint" ? "bg-mint" : tone === "coral" ? "bg-coral" : "bg-brand";

  const panel = (
    <div
      className="fixed inset-0 z-50 flex animate-fade items-end justify-center bg-ink/45 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={hold ? undefined : onClose}
    >
      <div
        className="safe-b max-h-[92dvh] w-full max-w-md animate-rise overflow-y-auto overscroll-contain rounded-t-[1.75rem] bg-surface px-5 pb-5 pt-2.5 text-center text-ink sm:rounded-[1.75rem] sm:pb-6 sm:pt-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* the bar that says this can be pushed away — and, while it cannot, is not there */}
        {!hold && <span className={`mx-auto mb-3 block h-1 w-10 rounded-full opacity-25 sm:hidden ${bar}`} aria-hidden />}

        {/* above the title: the one icon, or a picture of what is being asked about */}
        {icon && <div className="mb-2">{icon}</div>}
        {title && <h2 className="text-balance text-[1.25rem] font-bold leading-tight">{title}</h2>}
        {under && <p className="mx-auto mt-1 max-w-[19rem] text-balance text-[0.9375rem] leading-relaxed text-muted">{under}</p>}

        {children}

        {(action || dismiss) && (
          <div className="mt-4">
            {action}
            {dismiss && (
              <button type="button" onClick={onClose} className="press mt-1 h-11 w-full text-[0.9375rem] font-semibold text-muted">
                {dismiss}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // drawn on the body, never where it was written: a sheet sits inside the page's
  // <main>, which is max-w-md, scrolls and clips, so «fixed» was measured against
  // that column — the sheet came up off-centre and cut (the founder, 18 Oct 2026:
  // «the popup dont get centred its croped»). CardWheel has always done this.
  return browser ? createPortal(panel, document.body) : null;
}

/** The one button inside a sheet: full width, nothing beside it. Purple for
 *  what can be done, coral when what it does is hand over a gift. A screen of
 *  this app goes through Link, so the sheet closes into it without the phone
 *  loading the whole app again. */
export function SheetGo({ children, tone = "brand", onClick, href }: { children: ReactNode; tone?: "brand" | "coral"; onClick?: () => void; href?: string }) {
  const cls = `press flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-[1.25rem] text-[1.0625rem] font-bold text-white ${tone === "coral" ? "bg-coral" : "bg-brand"}`;
  if (href) {
    return href.startsWith("/") ? (
      <Link href={href} className={cls}>
        {children}
      </Link>
    ) : (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

/**
 * The whole screen, white, nothing behind it: the one shape kept for a code
 * held up at a counter. A sheet would put it in the bottom half of a phone
 * behind a grey overlay, and the shop's camera has to read it from the other
 * side of a counter — so this stays, and only this.
 *
 * The way out is an ✕ where a thumb reaches it, not a tap on a screen whose
 * whole job is to be held still.
 */
export function FullSheet({ onClose, label, children }: { onClose: () => void; label?: string; children: ReactNode }) {
  const browser = useBrowser();
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const panel = (
    <div className="safe-t safe-b fixed inset-0 z-50 flex animate-fade flex-col bg-white px-[clamp(1rem,5vw,1.5rem)] text-center text-ink" role="dialog" aria-modal="true" aria-label={label}>
      <div className="flex shrink-0 justify-end pt-2">
        <button type="button" onClick={onClose} className="press grid size-11 place-items-center rounded-full bg-canvas" aria-label={t.closeIt}>
          <X className="size-5" />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 animate-rise flex-col items-center justify-center pb-[4dvh]">{children}</div>
    </div>
  );

  // on the body, for the same reason as Sheet: the page's <main> clips and scrolls
  return browser ? createPortal(panel, document.body) : null;
}
