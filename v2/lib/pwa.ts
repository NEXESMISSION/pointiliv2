"use client";

import { useEffect, useSyncExternalStore } from "react";
import { signal } from "@/lib/track";

/**
 * Pointili on the phone's home screen, like any app (Android's own install
 * prompt): the prompt is kept when Chrome offers it, a button anywhere can
 * open it, and every step is counted in the traffic — the button shown, the
 * tap, yes or no, the app installed, and each visit opened from it.
 */
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferred: InstallPrompt | null = null;
let installed = false;
let started = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** Opened from the home screen (the installed app), not from the browser. */
export function standalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** Once per page load, from the layout: the worker, the prompt kept, the counts. */
export function startPwa() {
  if (started || typeof window === "undefined") return;
  started = true;
  if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js").catch(() => {});
  // the prompt Chrome gave before this ran, kept by the layout's first script
  const early = (window as Window & { __pwaPrompt?: InstallPrompt }).__pwaPrompt;
  if (early) deferred = early;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPrompt;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installed = true;
    notify();
    signal("pwa_installed");
  });
  // a visit opened from the installed app (counted once per sitting)
  try {
    if (standalone() && !sessionStorage.getItem("pl-app")) {
      sessionStorage.setItem("pl-app", "1");
      signal("pwa_open");
    }
  } catch {
    /* no storage: not counted */
  }
}

/** Chrome's install prompt, if it offered one: the button shows only then. */
export function useCanInstall(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => !!deferred,
    () => false,
  );
}

/** Pointili was just installed from this page (Chrome said so): whatever asked for it can go. */
export function useInstalled(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => installed,
    () => false,
  );
}

/*
 * The floating install buttons (InstallFab on the owner's home and the
 * wallet, AndroidInstall on the other pages): «×» on either puts both away
 * for the same days.
 */
const FAB_OFF = "pl-fab-off";
const DAY = 86_400_000;
export function fabAway(): boolean {
  try {
    return Number(localStorage.getItem(FAB_OFF) ?? 0) > Date.now();
  } catch {
    return false; // no storage: it shows
  }
}
export function putFabAway(days: number) {
  try {
    localStorage.setItem(FAB_OFF, String(Date.now() + days * DAY));
  } catch {
    /* gone for this visit only */
  }
}

/*
 * A page showing its own install button (the owner's home and the wallet
 * float one, the account page has a row): the site's floating one keeps out
 * of its way, so there are never two.
 */
let own = 0;
export function useOwnInstall(on = true) {
  useEffect(() => {
    if (!on) return;
    own++;
    notify();
    return () => {
      own--;
      notify();
    };
  }, [on]);
}
export function useHasOwnInstall(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => own > 0,
    () => false,
  );
}

/** The tap: Chrome's own dialog, and its answer counted. True when the person said yes. */
export async function installApp(where: string): Promise<boolean> {
  if (!deferred) return false;
  const prompt = deferred;
  signal("pwa_click", where);
  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  signal(outcome === "accepted" ? "pwa_accepted" : "pwa_dismissed", where);
  deferred = null;
  notify();
  return outcome === "accepted";
}

/**
 * Facebook's or Instagram's own browser, where the ads open: nothing can be
 * installed from it, and the account stays shut inside that app — the next
 * day, in Chrome, the owner is a stranger. (2026-10-07: 90% of the ad's
 * visits came this way, and 21 of the 27 shops never came back.)
 */
export function inAppBrowser(): boolean {
  return typeof navigator !== "undefined" && /FBAN|FBAV|FB_IAB|Instagram/i.test(navigator.userAgent);
}

export const isIphone = (): boolean => typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);

/** The same address in the phone's own browser: Chrome on Android (an intent), Safari on an iPhone (iOS 17 and later). */
export function outsideHref(path: string): string {
  const host = location.host;
  if (isIphone()) return `x-safari-https://${host}${path}`;
  return `intent://${host}${path}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(`https://${host}${path}`)};end`;
}

export const isAndroid = (): boolean => typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

/**
 * How this phone puts Pointili on its home screen, when a guide can show it:
 * an iPhone's Safari (the filmed guide), Chrome on an iPhone (its share
 * button is up in the address bar: the drawn one), or Android's browser.
 * Null on a computer, in Facebook's browser, or once installed.
 */
export type InstallWay = "ios" | "ios-chrome" | "android" | null;
const wayNow = (): InstallWay => {
  if (inAppBrowser() || standalone()) return null;
  if (isIphone()) return /CriOS/i.test(navigator.userAgent) ? "ios-chrome" : "ios";
  return isAndroid() ? "android" : null;
};
export function useInstallWay(): InstallWay {
  return useSyncExternalStore(
    () => () => {},
    wayNow,
    () => null,
  );
}

/** In one of those browsers — known on the phone only, never on the server, so the page renders the same first. */
export function useInApp(): boolean {
  return useSyncExternalStore(
    () => () => {},
    inAppBrowser,
    () => false,
  );
}
