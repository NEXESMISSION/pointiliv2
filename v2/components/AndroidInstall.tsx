"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Download, X } from "lucide-react";
import { FabHint } from "@/components/FabHint";
import { fabAway, installApp, isAndroid, putFabAway, useCanInstall, useHasOwnInstall, useInstalled } from "@/lib/pwa";
import { signal } from "@/lib/track";
import { t } from "@/lib/t";

/*
 * The pages it floats over: the front door, the reading pages, signing in,
 * the account and the wallet — where the foot of the screen is free. Not the
 * owner's screens, the counter, the camera, a card or a scan: their own
 * buttons sit at the foot.
 */
const HERE = /^\/(?:prix|faq|guide|pour(?:\/[^/]+)?|a-propos|comparatif|privacy|login|join|forgot|me|wallet)?\/?$/;

const TAPPABLE = "a[href], button, input:not([type=hidden]), select, textarea, [role=button]";

/** The band at the foot of the screen the button takes, with a little air over it. */
function band(): DOMRect {
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;left:0;right:0;bottom:0;height:calc(max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem)) + 3.75rem);visibility:hidden;pointer-events:none";
  document.body.append(probe);
  const r = probe.getBoundingClientRect();
  probe.remove();
  return r;
}

/**
 * A screen that fits without a scroll and has something to tap in that band
 * (the front door's footer on a short phone): the button would sit on it, so
 * it does not rise there. A page that scrolls moves its things past it.
 */
function crowded(): boolean {
  if (document.documentElement.scrollHeight > window.innerHeight + 2) return false;
  const foot = band();
  for (const el of document.querySelectorAll(TAPPABLE)) {
    if (el.closest("[data-fab]")) continue;
    const r = el.getBoundingClientRect();
    if (r.width && r.height && r.bottom > foot.top && r.top < foot.bottom) return true;
  }
  return false;
}

/** At the end of a page that scrolls: its last lines must not stay under the button. */
function atEnd(): boolean {
  const doc = document.documentElement;
  return doc.scrollHeight > window.innerHeight + 2 && window.scrollY + window.innerHeight >= doc.scrollHeight - band().height;
}

/**
 * «حطّ Pointili في تليفونك», floating, on Android's browser (the founder,
 * 4 Nov 2026: «a nice clean floating button in the browser to install the
 * app on Android»). It rises once the page has finished loading and Chrome
 * says the app can be installed; a tap opens Chrome's own install dialog,
 * nothing more, so it stays light enough for every page (no guide, no film).
 * It steps aside while a field is being typed in and at the end of a long
 * page, does not rise on a screen whose foot is taken (crowded), and never
 * shows where the page has its own install button (useOwnInstall), on a
 * computer, on an iPhone, in Facebook's browser or once installed. «×» puts it away for three
 * days, with the owner's and the wallet's. Shown, tapped and put away are
 * counted.
 */
export function AndroidInstall() {
  const path = usePathname() ?? "";
  const can = useCanInstall();
  const installed = useInstalled();
  const own = useHasOwnInstall();
  const [ready, setReady] = useState(false);
  const [going, setGoing] = useState(false);
  const [gone, setGone] = useState(false);
  const [typing, setTyping] = useState(false);
  const [end, setEnd] = useState(false);
  // the page whose foot was looked at and found free (none yet: it waits)
  const [free, setFree] = useState<string | null>(null);
  const counted = useRef(false);

  useEffect(() => {
    if (!isAndroid()) return;
    // the page loaded to its last picture, and a breath more
    let id = 0;
    const rise = () => {
      id = window.setTimeout(() => {
        if (!fabAway()) setReady(true);
      }, 900);
    };
    if (document.readyState === "complete") rise();
    else window.addEventListener("load", rise, { once: true });
    // a field being typed in: the keyboard needs the foot of the screen
    const field = (e: FocusEvent) => e.target instanceof HTMLElement && e.target.matches("input:not([type=checkbox]):not([type=radio]), textarea, select, [contenteditable]");
    const focus = (e: FocusEvent) => {
      if (field(e)) setTyping(true);
    };
    const blur = (e: FocusEvent) => {
      if (field(e)) setTyping(false);
    };
    const scroll = () => setEnd(atEnd());
    window.addEventListener("focusin", focus);
    window.addEventListener("focusout", blur);
    window.addEventListener("scroll", scroll, { passive: true });
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("load", rise);
      window.removeEventListener("focusin", focus);
      window.removeEventListener("focusout", blur);
      window.removeEventListener("scroll", scroll);
    };
  }, []);

  // each page looked at once it is up: is the foot of its screen free?
  useEffect(() => {
    if (!ready) return;
    const id = window.setTimeout(() => {
      setFree(crowded() ? null : path);
      setEnd(atEnd());
    }, 150);
    return () => window.clearTimeout(id);
  }, [ready, path]);

  const show = ready && can && !installed && !own && !gone && HERE.test(path) && free === path;
  const aside = typing || end;
  useEffect(() => {
    if (!show || counted.current) return;
    counted.current = true;
    signal("pwa_fab_shown", "site");
  }, [show]);
  if (!show) return null;

  const go = () => {
    signal("pwa_fab_tap", "site");
    void installApp("fab · site");
  };
  const away = () => {
    signal("pwa_fab_off", "site");
    putFabAway(3);
    setGoing(true);
  };

  return (
    <div
      data-fab
      className={`pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4 transition-[translate,opacity] duration-300 ease-out ${aside ? "translate-y-[150%] opacity-0" : ""}`}
      style={{ bottom: "max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem))" }}
    >
      {/* the first time on this phone: a small note over it, «جديد!» */}
      {!going && !aside && <FabHint where="site" />}
      <div
        onAnimationEnd={(e) => {
          if (going && e.target === e.currentTarget) setGone(true);
        }}
        className={`flex max-w-full items-center gap-1 rounded-full bg-surface/95 p-1.5 shadow-lift ring-1 ring-line backdrop-blur-md ${aside ? "" : "pointer-events-auto"} ${going ? "animate-[fab-out_220ms_ease-in_forwards]" : "animate-[fab-in_640ms_cubic-bezier(0.34,1.56,0.64,1)_both]"}`}
      >
        <button type="button" onClick={go} className="press flex min-w-0 items-center gap-2.5 rounded-full text-start">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand-mark.svg" alt="" width={24} height={18} style={{ width: "1.5rem", height: "1.125rem" }} />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[0.9375rem] font-bold text-ink">{t.installApp}</span>
            <span className="block truncate text-[0.75rem] text-muted">{t.installAppHint}</span>
          </span>
          {/* the install itself: a round purple button, a soft ring breathing out of it */}
          <span className="relative ms-1 grid size-10 shrink-0 place-items-center rounded-full bg-brand text-white shadow-[0_8px_18px_-8px_rgb(108_71_255/0.9)]">
            <span aria-hidden className="absolute inset-0 rounded-full bg-brand/45 motion-safe:animate-[fab-ring_2.6s_ease-out_infinite]" />
            <Download className="relative size-5" strokeWidth={2.5} />
          </span>
        </button>
        <button type="button" onClick={away} aria-label={t.fabHide} className="press grid size-8 shrink-0 place-items-center rounded-full text-faint active:bg-canvas">
          <X className="size-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
