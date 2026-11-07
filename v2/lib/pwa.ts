"use client";

import { useEffect, useSyncExternalStore } from "react";
import { appOnThisPhone } from "@/app/actions-pwa";
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
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true || inOurApp();
}

/**
 * Inside Pointili's own Android app (android/webapp: the site in Android's WebView, which says
 * «PointiliApp» in its user agent): already installed — no install button, no «open in Chrome».
 */
export function inOurApp(): boolean {
  return typeof navigator !== "undefined" && /PointiliApp\//.test(navigator.userAgent);
}

const APP_HERE = "pl-app-here";
function markAppHere() {
  try {
    localStorage.setItem(APP_HERE, String(Date.now()));
  } catch {
    /* no storage: the server still knows (actions-pwa: appOnThisPhone) */
  }
}
function appHereLocally(): boolean {
  try {
    return !!localStorage.getItem(APP_HERE);
  } catch {
    return false;
  }
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
    markAppHere();
    notify();
    signal("pwa_installed");
  });
  // the installed app shares the storage of the browser that installed it (Android): opened as the
  // app, it leaves a word there, so that browser knows the app is on this phone
  if (standalone()) markAppHere();
  // already on this phone's home screen (installed another day): Chrome will never offer it again, so
  // every install button steps aside. Chrome on Android answers from the manifest's related_applications
  const nav = navigator as Navigator & { getInstalledRelatedApps?: () => Promise<{ platform: string }[]> };
  if (!standalone() && nav.getInstalledRelatedApps) {
    void nav
      .getInstalledRelatedApps()
      .then((apps) => {
        if (!apps.some((a) => a.platform === "webapp") || installed) return;
        installed = true;
        notify();
        signal("pwa_already");
      })
      .catch(() => {});
  }
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
  try {
    await prompt.prompt();
  } catch {
    // Chrome opens its dialog only on a fresh tap: this one came too late. The offer is kept, and the
    // button asks for one more tap
    late = true;
    notify();
    signal("pwa_refused", where);
    return false;
  }
  late = false;
  const { outcome } = await prompt.userChoice;
  signal(outcome === "accepted" ? "pwa_accepted" : "pwa_dismissed", where);
  deferred = null;
  notify();
  return outcome === "accepted";
}

/*
 * Chrome says it can install a few seconds after the page opens (seven on the live site, 5 Nov 2026),
 * and a tap before that opened the filmed guide instead of the install (the founder: «it opens the
 * popup of the steps, not what we want — a direct install»). On Android a tap now waits for Chrome's
 * word: «لحظة…» on the button, and Chrome's own dialog the moment the offer comes. A tap lets a page
 * open a dialog for about five seconds only, so an offer later than that turns the button «جاهز»: one
 * more tap installs. No offer at all in fifteen seconds (Chrome not ready, or not willing): a short
 * note says where the browser's own menu has it. iPhones keep their guide, the only way there.
 *
 * And Chrome never offers an app that is already on the phone. So a tap Chrome has not answered asks
 * first: did this very browser ever open as the installed app — the word it keeps, or the traffic's
 * visits with its visitor id (actions-pwa: the installed app shares the browser's storage)? Then the
 * note says at once that Pointili is already there, and where to find it. Never «the same account»
 * or «the same screen»: the owner of «سلطان العطور» is signed in on two Androids of one model (6 Nov
 * 2026), the app installed on one — the other has to keep waiting for its own browser's offer.
 */
let waiting = false;
let late = false;
let none = false;
let already = false;
const TAP_MS = 4500;
const WAIT_MS = 15000;
export type InstallStage = "idle" | "waiting" | "ready" | "none" | "already";
const stage = (): InstallStage => (waiting ? "waiting" : late && deferred ? "ready" : already ? "already" : none ? "none" : "idle");

/** Where a tap on an install button stands: waiting for Chrome, ready for one more tap, or nothing came. */
export function useInstallStage(): InstallStage {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    stage,
    () => "idle",
  );
}

/** The note at the foot («not ready» or «already on your phone»), put away by a tap. */
export function dismissInstallNote() {
  none = false;
  already = false;
  notify();
}

/** A note at the foot for a while, then gone by itself. */
let noteTimer = 0;
function showNote(kind: "none" | "already") {
  none = kind === "none";
  already = kind === "already";
  notify();
  window.clearTimeout(noteTimer);
  // the note with the app's download stays until it is used or put away a while: it has a button now
  noteTimer = window.setTimeout(dismissInstallNote, kind === "already" ? 14000 : 30000);
}

/** This browser's visitor id, as the traffic keeps it (lib/track: pt_v); none yet: null. */
function visitorHere(): string | null {
  try {
    return localStorage.getItem("pt_v");
  } catch {
    return null;
  }
}

/** What browser this is, said short, for the counts of a tap Chrome never answered. */
function browserSaid(): string {
  const ua = navigator.userAgent;
  return [
    (navigator as Navigator & { brave?: unknown }).brave ? "brave" : null,
    /; wv\)/.test(ua) ? "webview" : null,
    /GSA\//.test(ua) ? "google-app" : null,
    /SamsungBrowser|EdgA|OPR|YaBrowser|MiuiBrowser|HeyTapBrowser|UCBrowser|Firefox/.exec(ua)?.[0] ?? null,
    `chrome ${/Chrome\/(\d+)/.exec(ua)?.[1] ?? "?"}`,
    "getInstalledRelatedApps" in navigator ? "rel" : "no-rel",
    `${screen.width}x${screen.height}`,
  ]
    .filter(Boolean)
    .join(" ");
}

/** Android's tap on any install button: Chrome's dialog now, or as soon as Chrome offers it. */
export async function tapInstall(where: string): Promise<void> {
  if (deferred) {
    await installApp(where).catch(() => false);
    return;
  }
  if (waiting) return;
  // this browser opened as the installed app before: it is on this phone
  if (appHereLocally()) {
    signal("pwa_here", `${where} · local`);
    showNote("already");
    return;
  }
  signal("pwa_wait", where);
  waiting = true;
  late = false;
  none = false;
  already = false;
  notify();
  const t0 = Date.now();
  let onPhone = false;
  const came = await new Promise<boolean>((resolve) => {
    let done = false;
    const check = () => {
      if (deferred) finish(true);
    };
    const id = window.setTimeout(() => finish(false), WAIT_MS);
    function finish(ok: boolean) {
      if (done) return;
      done = true;
      window.clearTimeout(id);
      listeners.delete(check);
      resolve(ok);
    }
    listeners.add(check);
    // meanwhile: did this very browser open as the installed app before (its visitor id, lib/track)?
    // Then Chrome will not offer. A browser with no id yet has never been anywhere: nothing to ask
    const me = visitorHere();
    if (me)
      void appOnThisPhone(me)
        .then((yes) => {
          if (!yes || deferred) return;
          onPhone = true;
          finish(false);
        })
        .catch(() => {});
  });
  waiting = false;
  if (came && Date.now() - t0 < TAP_MS) {
    notify();
    await installApp(where).catch(() => false);
    return;
  }
  if (came) {
    late = true;
    signal("pwa_late", where);
    notify();
    return;
  }
  if (onPhone) {
    signal("pwa_here", `${where} · visits`);
    showNote("already");
    return;
  }
  signal("pwa_none", `${where} · ${browserSaid()}`);
  showNote("none");
}

/**
 * Facebook's or Instagram's own browser, where the ads open: nothing can be
 * installed from it, and the account stays shut inside that app — the next
 * day, in Chrome, the owner is a stranger. (2026-10-07: 90% of the ad's
 * visits came this way, and 21 of the 27 shops never came back.)
 *
 * And any Android app's own web view («; wv)» in its user agent): on 7 Nov 2026 a visitor from the
 * ad came through one that did not say Facebook, waited for an install that cannot come there, and
 * was offered a download it cannot take. Pointili's own app is the one web view that is at home.
 */
export function inAppBrowser(): boolean {
  if (typeof navigator === "undefined" || inOurApp()) return false;
  const ua = navigator.userAgent;
  return /FBAN|FBAV|FB_IAB|Instagram/i.test(ua) || (/Android/i.test(ua) && /; wv\)/.test(ua));
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
