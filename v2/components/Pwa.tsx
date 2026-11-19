"use client";

import { useEffect } from "react";
import { handoffPath } from "@/app/actions";
import { AndroidInstall } from "@/components/AndroidInstall";
import { InstallNone } from "@/components/InstallNone";
import { inAppBrowser, isIphone, standalone, startPwa } from "@/lib/pwa";

/**
 * In the layout: the worker, Android's install prompt kept, the installed
 * app's visits counted, and the floating install button of Android's browser
 * (components/AndroidInstall: Chrome's own dialog, nothing heavier). A file of
 * its own, so every page does not carry the install guides and their button
 * for them (components/InstallApp, 26 Oct 2026).
 */
export function Pwa() {
  useEffect(() => startPwa(), []);
  useIphoneAppSignedIn();
  return (
    <>
      <AndroidInstall />
      {/* an install tap Chrome never answered: where its own menu has it (components/InstallNone) */}
      <InstallNone />
    </>
  );
}

/**
 * The iPhone's app opens signed in, however it was added (19 Nov 2026, the founder: «make sure they never lose
 * the login in the PWA, it's super important»). An iPhone gives the app on its home screen cookies of its own,
 * apart from Safari's: added through our guide it opened signed in (useAppStartsSignedIn), added from Safari's
 * own share menu it opened signed out — a customer who never typed a password (an account made at the counter)
 * was then shut out of their cards. So on an iPhone's Safari, signed in, every page names a one-time sign-in as
 * the address the app first opens (app/api/manifest, app/auth/handoff), a moment after the page and again every
 * six hours it stays open (each is good for a day). Nothing anywhere else: Android's app shares the browser's
 * cookies, and Chrome on an iPhone cannot add an app with a manifest of ours.
 */
function useIphoneAppSignedIn() {
  useEffect(() => {
    if (!isIphone() || /CriOS|FxiOS|EdgiOS|OPiOS/i.test(navigator.userAgent) || inAppBrowser() || standalone()) return;
    // signed out: the manifest as it is (the session cookie is readable: @supabase/ssr sets it so)
    if (!/(?:^|;\s*)sb-[^=]*auth-token/.test(document.cookie)) return;
    let gone = false;
    const point = () =>
      void handoffPath("/")
        .then((to) => {
          const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
          if (!gone && link && to.startsWith("/auth/handoff?")) link.href = `/api/manifest?start=${encodeURIComponent(to)}`;
        })
        .catch(() => {});
    const first = window.setTimeout(point, 2500);
    const again = window.setInterval(point, 6 * 3_600_000);
    return () => {
      gone = true;
      window.clearTimeout(first);
      window.clearInterval(again);
    };
  }, []);
}
