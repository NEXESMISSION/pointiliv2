"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { signal } from "@/lib/track";
import { t } from "@/lib/t";

const KEY = "pl-fab-hint";
/** Shown on this phone already (no storage: taken as shown, so it never nags page after page). */
const told = (): boolean => {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return true;
  }
};

/**
 * The news of the install button (the founder, 4 Nov 2026: «a nice simple
 * notification for users for the new install button»): the first time a
 * floating install button rises on a phone, a small dark note pops over it —
 * «جديد! Pointili في تليفونك», one tap and it is on the home screen — with
 * its point down at the button. It goes by itself after a few seconds, or at
 * a tap, and never comes back on that phone (installing is the phone's
 * business, so the phone remembers, whoever is signed in). It sits in the
 * button's own fixed box (InstallFab, AndroidInstall), so it moves with it.
 */
export function FabHint({ where }: { where: string }) {
  const [up, setUp] = useState(false);
  const [going, setGoing] = useState(false);

  useEffect(() => {
    if (told()) return;
    // once the button has risen and settled
    const id = window.setTimeout(() => {
      if (told()) return;
      try {
        localStorage.setItem(KEY, String(Date.now()));
      } catch {
        /* told once all the same */
      }
      signal("pwa_hint", where);
      setUp(true);
    }, 1100);
    return () => window.clearTimeout(id);
  }, [where]);

  useEffect(() => {
    if (!up) return;
    const id = window.setTimeout(() => setGoing(true), 9000);
    return () => window.clearTimeout(id);
  }, [up]);

  if (!up) return null;
  return (
    <div className="pointer-events-none absolute inset-x-4 bottom-full mb-3 flex justify-center">
      <button
        type="button"
        onClick={() => setGoing(true)}
        onAnimationEnd={(e) => {
          if (going && e.target === e.currentTarget) setUp(false);
        }}
        className={`pointer-events-auto relative max-w-[21.5rem] rounded-[1.125rem] bg-ink px-4 py-3 text-start text-white shadow-lift ${going ? "animate-[fab-hint-out_200ms_ease-in_forwards]" : "animate-[fab-hint-in_520ms_cubic-bezier(0.34,1.56,0.64,1)_both]"}`}
      >
        <span className="flex items-start gap-2.5">
          <span className="text-[1.25rem] leading-none" aria-hidden>
            ✨
          </span>
          <span className="min-w-0 flex-1">
            <b className="block text-[0.9375rem] font-bold leading-tight">{t.fabHintTitle}</b>
            <span className="mt-0.5 block text-[0.75rem] leading-snug text-white/75">{t.fabHintBody}</span>
          </span>
          <X className="mt-0.5 size-4 shrink-0 text-white/55" aria-label={t.fabHintOk} />
        </span>
        {/* its point, down at the button */}
        <span aria-hidden className="absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 rounded-[2px] bg-ink" />
      </button>
    </div>
  );
}
