"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import { installApp, isIphone, outsideHref, startPwa, useCanInstall, useInApp } from "@/lib/pwa";
import { signal } from "@/lib/track";
import { fill, t } from "@/lib/t";

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

/**
 * «حلّ Pointili في Chrome» (Safari on an iPhone): shown only inside
 * Facebook's or Instagram's own browser, where the ads open — nothing installs
 * there and the account stays shut inside that app. It opens `path` in the
 * phone's own browser; /me asks for the number and password once, then
 * offers to install. On an iPhone the jump needs iOS 17: if the page is
 * still here a moment later, the way by hand is said. Shown and tapped are
 * counted. `look`: a full row (the account page) or one quiet line (under the
 * counter's tip).
 */
export function OpenOutside({ where, path = "/me", look = "row", className = "" }: { where: string; path?: string; look?: "row" | "line"; className?: string }) {
  const inApp = useInApp();
  const [stuck, setStuck] = useState(false);
  const counted = useRef(false);
  useEffect(() => {
    if (!inApp || counted.current) return;
    counted.current = true;
    signal("pwa_out_shown", where);
  }, [inApp, where]);
  if (!inApp) return null;

  const iphone = isIphone();
  const label = fill(t.openOutside, { browser: iphone ? "Safari" : "Chrome" });
  const go = () => {
    signal("pwa_out_tap", where);
    window.location.href = outsideHref(path);
    if (iphone) setTimeout(() => document.visibilityState === "visible" && setStuck(true), 1500);
  };

  if (look === "line") {
    return (
      <div className={className}>
        <button type="button" onClick={go} className="press flex w-full items-center justify-center gap-1.5 py-1 text-[0.875rem] font-bold text-brand">
          <ExternalLink className="size-4" /> {label}
        </button>
        {stuck && <p className="text-center text-[0.8125rem] leading-snug text-muted">{t.openOutsideStuck}</p>}
      </div>
    );
  }
  return (
    <button type="button" onClick={go} className={`press flex w-full items-center gap-3 rounded-[1.375rem] bg-surface p-4 text-start shadow-card ${className}`}>
      <span className="grid size-10 shrink-0 place-items-center rounded-[0.875rem] bg-brand text-white">
        <ExternalLink className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[1.0312rem] font-bold">{label}</span>
        <span className="block text-[0.8438rem] leading-snug text-muted">{stuck ? t.openOutsideStuck : t.openOutsideHint}</span>
      </span>
    </button>
  );
}
