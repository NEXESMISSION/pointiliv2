"use client";

import { useEffect, useRef } from "react";
import { Download } from "lucide-react";
import { installApp, startPwa, useCanInstall } from "@/lib/pwa";
import { signal } from "@/lib/track";
import { t } from "@/lib/t";

/** In the layout: the worker, Android's install prompt kept, the installed app's visits counted. */
export function Pwa() {
  useEffect(() => startPwa(), []);
  return null;
}

/**
 * «حطّ Pointili في تليفونك»: shown only where Android's Chrome offers to
 * install (never on an iPhone, never once installed). `look`: a small pill
 * (the front door, a header) or a full row (the account page). Its showing
 * is counted once, with where it was.
 */
export function InstallApp({ where, look = "pill", className = "" }: { where: string; look?: "pill" | "row" | "link"; className?: string }) {
  const can = useCanInstall();
  const counted = useRef(false);
  useEffect(() => {
    if (!can || counted.current) return;
    counted.current = true;
    signal("pwa_shown", where);
  }, [can, where]);
  if (!can) return null;

  if (look === "link") {
    // a third word in a footer row: a dot before it, the same quiet type
    return (
      <>
        <span className="size-1 rounded-full bg-[#CFC5B6]" aria-hidden />
        <button type="button" onClick={() => void installApp(where)} className={`inline-flex items-center gap-1 font-bold text-[#B00D17] ${className}`}>
          <Download className="size-3.5" /> {t.installApp}
        </button>
      </>
    );
  }
  if (look === "row") {
    return (
      <button type="button" onClick={() => void installApp(where)} className={`press flex w-full items-center gap-3 rounded-[1.375rem] bg-surface p-4 text-start shadow-card ${className}`}>
        <span className="grid size-10 shrink-0 place-items-center rounded-[0.875rem] bg-brand text-white">
          <Download className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[1.0312rem] font-bold">{t.installApp}</span>
          <span className="block truncate text-[0.8438rem] text-muted">{t.installAppHint}</span>
        </span>
      </button>
    );
  }
  return (
    <button type="button" onClick={() => void installApp(where)} className={`press inline-flex h-10 items-center gap-2 rounded-full bg-brand px-4 text-[0.9062rem] font-bold text-white ${className}`}>
      <Download className="size-[1.125rem]" /> {t.installApp}
    </button>
  );
}
