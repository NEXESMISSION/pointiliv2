"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, LoaderCircle } from "lucide-react";
import { useBrowser } from "@/components/Client";
import { IosGuide, OpenOutside } from "@/components/InstallApp";
import { InstallGuide } from "@/components/InstallGuide";
import { Btn, Middle } from "@/components/ui";
import { standalone, tapInstall, useCanInstall, useInApp, useInstalled, useInstallStage, useInstallWay, useOwnInstall } from "@/lib/pwa";
import { signal } from "@/lib/track";
import { t } from "@/lib/t";

/**
 * pointili.online/app — the install, as a link (the founder, 15 Nov 2026: «a link I can send that
 * installs the app or leads to the install page directly, better than the button if the customer
 * did not find it»). Sent on WhatsApp, said on the phone, printed: whoever opens it lands on the
 * one thing it does, for the phone in their hand.
 *
 *  - Android: one big button, and it is Chrome's own install dialog (lib/pwa: tapInstall — at once
 *    when Chrome has offered, «لحظة…» until it does, the Android app's download when it never does);
 *  - an iPhone: the film of the taps, open by itself (Safari's, or the drawn one in Chrome);
 *  - Facebook's or Instagram's browser, where nothing installs: out of it first, to this same page;
 *  - a computer: the link as a QR, for the phone's camera;
 *  - Pointili already on the phone: said so; opened inside the app itself: its home.
 *
 * No browser lets a link install by itself — Chrome opens its dialog only on a tap — so this is as
 * short as the way gets: the link, one tap, «Installer». Counted: the page opened (pwa_link, with
 * which of the above it found), then the install's own steps with where = "link".
 */
export function InstallPage({ qr, address }: { qr: string; address: string }) {
  const browser = useBrowser();
  const way = useInstallWay();
  const inApp = useInApp();
  const can = useCanInstall();
  const installed = useInstalled();
  const stage = useInstallStage();
  const router = useRouter();
  const [guide, setGuide] = useState(false);
  const counted = useRef(false);
  // this page is the install button: the site's floating one keeps away
  useOwnInstall();

  // known on the phone only (the server cannot tell which phone asks), so the first paint keeps the room
  const inside = browser && standalone();
  const android = way === "android";
  const ios = way === "ios" || way === "ios-chrome";
  // only Android's Chrome can tell that Pointili is already there (lib/pwa: getInstalledRelatedApps, appinstalled)
  const here = android && installed;
  const computer = browser && !inside && !inApp && !way;

  // opened inside the installed app (a link it caught, or Pointili's own Android app): nothing left to install
  useEffect(() => {
    if (inside) router.replace("/");
  }, [inside, router]);

  useEffect(() => {
    if (!browser || counted.current) return;
    counted.current = true;
    signal("pwa_link", inside ? "app" : inApp ? "in-app" : (way ?? "computer"));
  }, [browser, inside, inApp, way]);

  // an iPhone has no install dialog: the film is the whole way, so it opens by itself
  useEffect(() => {
    if (!ios) return;
    const id = window.setTimeout(() => setGuide(true), 350);
    return () => window.clearTimeout(id);
  }, [ios]);

  const waiting = stage === "waiting";
  const late = stage === "ready";
  let action: React.ReactNode = <span className="block h-[3.5rem]" aria-hidden />;
  if (!browser || inside || here) {
    // the room kept while the phone is unknown (or the app's home loads); nothing to do once installed
    if (here) action = null;
  } else if (inApp) {
    action = <OpenOutside where="link" path="/app" className="w-full" />;
  } else if (android) {
    action = (
      <>
        {/* it breathes the moment one tap installs (Chrome has offered); «لحظة…» while a tap waits for it */}
        <Btn type="button" onClick={() => void tapInstall("link")} aria-busy={waiting} className={(can || late) && !waiting ? "animate-breathe" : ""}>
          {waiting ? <LoaderCircle className="size-5 animate-spin" strokeWidth={2.4} /> : <Download className="size-5" strokeWidth={2.4} />}
          {/* «حطّها» under the title that already says what (the install sheet's own pair) */}
          {waiting ? t.installWaiting : late ? t.installReady : t.installPopupYes}
        </Btn>
        {/* what the browser asks next, in its own word (French, the way most phones here are set) */}
        <p className="mt-3 text-[0.9375rem] text-muted">
          {t.appLinkThen}{" "}
          <bdi dir="ltr" className="rounded-full bg-brand-soft px-2.5 py-0.5 font-bold text-brand-deep ring-1 ring-inset ring-[#D9CFFF]">
            Installer
          </bdi>
        </p>
      </>
    );
  } else if (ios) {
    action = (
      <Btn type="button" onClick={() => setGuide(true)}>
        <Download className="size-5" strokeWidth={2.4} /> {t.installPopupYes}
      </Btn>
    );
  } else if (computer) {
    action = (
      <div className="flex flex-col items-center">
        {/* the QR on white with nothing drawn around it: the camera reads it best that way */}
        <div className="rounded-[1.5rem] bg-white p-[clamp(0.75rem,2dvh,1.125rem)] shadow-card ring-1 ring-line">
          <div role="img" aria-label={t.appLinkScan} className="size-[clamp(8.5rem,30dvh,12.5rem)] [&>svg]:block [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: qr }} />
        </div>
        <bdi dir="ltr" className="mt-3 text-[1.0625rem] font-bold text-brand">
          {address}
        </bdi>
      </div>
    );
  }

  return (
    <Middle className="items-center text-center">
      {/* the app's own icon, as it will sit on the phone's screen */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icon-192.png"
        alt=""
        width={192}
        height={192}
        style={{ width: "5.5rem", height: "5.5rem" }}
        className="animate-float rounded-[1.375rem] shadow-[0_18px_36px_-16px_rgb(74_42_214/0.55)] ring-1 ring-line"
      />
      <h1 className="mt-[3dvh] text-balance text-[1.625rem] font-bold leading-tight">{here ? t.installHereTitle : t.installApp}</h1>
      <p className="mt-1.5 max-w-xs text-balance text-[1.0625rem] leading-relaxed text-body">{here ? t.installHereBody : computer ? t.appLinkScan : t.installAppHint}</p>
      {action && <div className="mt-[3.5dvh] w-full max-w-sm">{action}</div>}
      {guide && way === "ios" && <InstallGuide way="ios" where="link" onClose={() => setGuide(false)} />}
      {guide && way === "ios-chrome" && <IosGuide where="link" onClose={() => setGuide(false)} />}
    </Middle>
  );
}
