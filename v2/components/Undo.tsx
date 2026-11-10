"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Undo2, X } from "lucide-react";
import { unstamp } from "@/app/actions";
import { fill, t } from "@/lib/t";
import { signal } from "@/lib/track";

const clock = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis" }).format(new Date(iso));

/**
 * A tampon taken back, asked first — the same sheet wherever the owner finds the
 * tampon (10 Nov 2026: «more ways for the owner to cancel a tampon»): in
 * «التاريخ», on a customer's card, on the counter right after the scan. Whose,
 * when and for what, what goes with it (a gift it won), and two buttons. The
 * database decides (public.unstamp): within a day, the last tampon on that card,
 * its gift not handed over — anything else is said plainly, nothing is touched.
 */
export function UndoSheet({ moment, who, at, item = null, where, onClose, onDone }: { moment: number; who: string | null; at: string; item?: string | null; where: string; onClose: () => void; onDone: () => void }) {
  const router = useRouter();
  const [state, setState] = useState<"ask" | "busy" | "late" | "error">("ask");
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [onClose]);

  const go = async () => {
    setState("busy");
    const res = await unstamp(moment).catch(() => ({ ok: false, error: "network" }));
    if (res.ok) {
      signal("unstamp", where);
      navigator.vibrate?.(40);
      onDone();
      // the home's numbers and lists, as they are now
      router.refresh();
      return;
    }
    setState(res.error === "too_late" || res.error === "not_last" || res.error === "not_found" ? "late" : "error");
  };

  // drawn on the body: a sheet inside a list or a dark counter is still centred and whole
  return createPortal(
    <div className="fixed inset-0 z-[60] flex animate-fade items-end justify-center bg-ink/45" role="dialog" aria-modal="true" aria-label={fill(t.undoAsk, { who: who ?? t.someone })} onClick={onClose}>
      <div className="safe-b w-full max-w-md rounded-t-[1.75rem] bg-canvas px-[clamp(1rem,5vw,1.5rem)] pb-4 pt-3 text-center text-ink" style={{ animation: "undo-up 340ms cubic-bezier(0.2,0.8,0.2,1) both" }} onClick={(e) => e.stopPropagation()}>
        <style>{`@keyframes undo-up { from { transform: translateY(100%); } to { transform: none; } }`}</style>
        <div className="flex items-center justify-between">
          <span className="size-10" />
          <span className="mx-auto block h-1.5 w-10 rounded-full bg-line" aria-hidden />
          <button type="button" onClick={onClose} className="press grid size-10 place-items-center rounded-full bg-surface shadow-card" aria-label={t.back}>
            <X className="size-5" />
          </button>
        </div>
        <span className="mx-auto mt-1 grid size-16 animate-pop place-items-center rounded-full bg-coral-soft text-coral">
          <Undo2 className="size-8" strokeWidth={2.4} />
        </span>
        <p className="mt-3 text-balance text-[1.25rem] font-bold">{fill(t.undoAsk, { who: who ?? t.someone })}</p>
        <p className="mt-1 text-[0.875rem] text-muted">
          <span className="num">{clock(at)}</span>
          {item && (
            <>
              {" · "}
              <bdi className="font-bold text-brand">{item}</bdi>
            </>
          )}
        </p>
        <p className={`mx-auto mt-3 max-w-sm text-balance text-[0.9375rem] leading-relaxed ${state === "late" || state === "error" ? "font-semibold text-coral" : "text-body"}`}>
          {state === "late" ? t.undoLate : state === "error" ? t.errNetwork : t.undoBody}
        </p>
        <div className="mt-4 space-y-2">
          {state !== "late" && (
            <button type="button" onClick={() => void go()} disabled={state === "busy"} className="press flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-[1.125rem] bg-coral text-[1rem] font-bold text-white shadow-[0_14px_30px_-14px_rgb(255_107_74/0.8)] disabled:opacity-70">
              <Undo2 className="size-5" /> {state === "busy" ? t.checking : t.undoYes}
            </button>
          )}
          <button type="button" onClick={onClose} className="press h-12 w-full rounded-[1rem] bg-surface text-[0.9375rem] font-bold text-body shadow-card">
            {state === "late" ? t.ok : t.undoNo}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** The small «فسّخ» on a tampon that can still be taken back; the sheet opens on a tap. */
export function UndoButton({ moment, who, at, item = null, where, onDone, className = "", tone = "light" }: { moment: number; who: string | null; at: string; item?: string | null; where: string; onDone: () => void; className?: string; tone?: "light" | "dark" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={fill(t.undoAsk, { who: who ?? t.someone })}
        className={`press flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-[0.8125rem] font-bold ${tone === "dark" ? "bg-white/15 text-white" : "bg-coral-soft text-coral"} ${className}`}
      >
        <Undo2 className="size-3.5" strokeWidth={2.6} /> {t.undo}
      </button>
      {open && (
        <UndoSheet
          moment={moment}
          who={who}
          at={at}
          item={item}
          where={where}
          onClose={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            onDone();
          }}
        />
      )}
    </>
  );
}
