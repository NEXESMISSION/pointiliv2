"use client";

import { useSyncExternalStore } from "react";
import { signal } from "@/lib/track";

/**
 * Pointili on the phone's home screen, like any app (Android's own install
 * prompt): the prompt is kept when Chrome offers it, a button anywhere can
 * open it, and every step is counted in the traffic — the button shown, the
 * tap, yes or no, the app installed, and each visit opened from it.
 */
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferred: InstallPrompt | null = null;
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

/** The tap: Chrome's own dialog, and its answer counted. */
export async function installApp(where: string) {
  if (!deferred) return;
  const prompt = deferred;
  signal("pwa_click", where);
  await prompt.prompt();
  const { outcome } = await prompt.userChoice;
  signal(outcome === "accepted" ? "pwa_accepted" : "pwa_dismissed", where);
  deferred = null;
  notify();
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

/** In one of those browsers — known on the phone only, never on the server, so the page renders the same first. */
export function useInApp(): boolean {
  return useSyncExternalStore(
    () => () => {},
    inAppBrowser,
    () => false,
  );
}
