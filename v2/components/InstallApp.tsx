"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ExternalLink, LoaderCircle, Send, X } from "lucide-react";
import { handoffPath } from "@/app/actions";
import { Sheet, SheetGo } from "@/components/Client";
import { FabHint } from "@/components/FabHint";
import { InstallGuide, Mixed, preloadGuide, useAppStartsSignedIn } from "@/components/InstallGuide";
import { Icon3D } from "@/components/ui";
import { seenBefore, seenHere, shown, type Note } from "@/lib/once";
import { fabAway, installApp, isIphone, outsideHref, putFabAway, tapInstall, useCanInstall, useInApp, useInstalled, useInstallStage, useInstallWay, useOwnInstall, type InstallWay } from "@/lib/pwa";
import { signal } from "@/lib/track";
import { fill, t } from "@/lib/t";

/** This phone's guide: the filmed one (an iPhone's Safari, Android), or the drawn one for Chrome on an iPhone. */
function GuideFor({ way, where, onClose, onDone }: { way: Exclude<InstallWay, null>; where: string; onClose: () => void; onDone?: () => void }) {
  if (way === "ios-chrome") return <IosGuide where={where} onClose={onClose} />;
  return <InstallGuide way={way} where={where} onClose={onClose} onDone={onDone} />;
}

/**
 * «حطّ Pointili في تليفونك»: on Android, Chrome's own install dialog — at
 * once when Chrome has offered it, else the moment it does (lib/pwa:
 * tapInstall, «لحظة…» on the button meanwhile), never the filmed guide; on an
 * iPhone, the guide that shows the taps. Never in Facebook's browser, never
 * once installed (or found already on the phone). `look`: a small pill (a
 * header), a full row (the account page) or a word in the front door's
 * footer. Its showing is counted once, with where it was.
 */
export function InstallApp({ where, look = "pill", className = "" }: { where: string; look?: "pill" | "row" | "link"; className?: string }) {
  const can = useCanInstall();
  const way = useInstallWay();
  const installed = useInstalled();
  const stage = useInstallStage();
  const [guide, setGuide] = useState(false);
  const counted = useRef(false);
  const live = !installed && (can || !!way);
  const ios = way === "ios" || way === "ios-chrome";
  // a row or a pill is a button in plain sight: the site's floating one stays away (a footer's word is not)
  useOwnInstall(look !== "link" && live);
  useEffect(() => {
    if (!live || counted.current) return;
    counted.current = true;
    signal(can ? "pwa_shown" : "pwa_ios_shown", where);
  }, [live, can, where]);
  if (!live) return null;

  const go = () => {
    if (can && !ios) return void installApp(where);
    if (way === "android") return void tapInstall(where);
    signal("pwa_ios_open", where);
    setGuide(true);
  };
  const sheet = guide && ios && way && <GuideFor way={way} where={where} onClose={() => setGuide(false)} />;
  // on Android: waiting for Chrome (a turning circle), or ready for one more tap
  const waiting = !ios && stage === "waiting";
  const ready = !ios && stage === "ready";
  const label = waiting ? t.installWaiting : ready ? t.installReady : t.installApp;
  const Mark = waiting ? LoaderCircle : Download;
  const spin = waiting ? "animate-spin" : "";

  if (look === "link") {
    // a third word in a footer row: a dot before it, the same quiet type
    return (
      <>
        <span className="size-1 rounded-full bg-[#CFC5B6]" aria-hidden />
        <button type="button" onClick={() => void go()} aria-busy={waiting} className={`inline-flex items-center gap-1 font-bold text-[#B00D17] ${className}`}>
          <Mark className={`size-3.5 ${spin}`} /> {label}
        </button>
        {sheet}
      </>
    );
  }
  if (look === "row") {
    return (
      <>
        <button type="button" onClick={() => void go()} aria-busy={waiting} className={`press flex w-full items-center gap-3 rounded-[1.375rem] bg-surface p-4 text-start shadow-card ${className}`}>
          <span className={`grid size-10 shrink-0 place-items-center rounded-[0.875rem] bg-brand text-white ${ready ? "animate-breathe" : ""}`}>
            <Mark className={`size-5 ${spin}`} />
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block truncate text-[1.0625rem] font-bold ${ready ? "text-brand" : ""}`}>{label}</span>
            <span className="block truncate text-[0.8125rem] text-muted">{t.installAppHint}</span>
          </span>
        </button>
        {sheet}
      </>
    );
  }
  return (
    <>
      <button type="button" onClick={() => void go()} aria-busy={waiting} className={`press inline-flex h-10 items-center gap-2 rounded-full bg-brand px-4 text-[0.9375rem] font-bold text-white ${ready ? "animate-breathe" : ""} ${className}`}>
        <Mark className={`size-[1.125rem] ${spin}`} /> {label}
      </button>
      {sheet}
    </>
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
export function OpenOutside({ where, path = "/me?install=1", look = "row", className = "" }: { where: string; path?: string; look?: "row" | "line"; className?: string }) {
  const inApp = useInApp();
  const { go, send, stuck, browser } = useWayOut(where, path);
  const counted = useRef(false);
  useEffect(() => {
    if (!inApp || counted.current) return;
    counted.current = true;
    signal("pwa_out_shown", where);
  }, [inApp, where]);
  if (!inApp) return null;

  const label = fill(t.openOutside, { browser });

  if (look === "line") {
    return (
      <div className={className}>
        <button type="button" onClick={send} className="press flex w-full items-center justify-center gap-1.5 py-1 text-[0.8125rem] font-bold text-brand">
          <Send className="size-4" /> {t.waSendSelf}
        </button>
        <button type="button" onClick={() => void go()} className="press flex w-full items-center justify-center gap-1.5 py-1 text-[0.8125rem] font-semibold text-muted">
          <ExternalLink className="size-4" /> {label}
        </button>
        {stuck && (
          <p className="text-center text-[0.8125rem] leading-snug text-muted">
            <Mixed text={t.openOutsideStuck} />
          </p>
        )}
      </div>
    );
  }
  return (
    <div className={className}>
      <button type="button" onClick={send} className="press flex w-full items-center gap-3 rounded-[1.375rem] bg-surface p-4 text-start shadow-card">
        <span className="grid size-10 shrink-0 place-items-center rounded-[0.875rem] bg-brand text-white">
          <Send className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[1.0625rem] font-bold">{t.waSendSelf}</span>
          <span className="block text-[0.8125rem] leading-snug text-muted">{t.waSendHint}</span>
        </span>
      </button>
      <button type="button" onClick={() => void go()} className="press mt-1.5 flex w-full items-center gap-3 rounded-[1.375rem] px-4 py-2.5 text-start">
        <span className="grid size-7 shrink-0 place-items-center text-muted">
          <ExternalLink className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.9375rem] font-bold text-body">{label}</span>
          <span className="block text-[0.8125rem] leading-snug text-muted">{stuck ? <Mixed text={t.openOutsideStuck} /> : t.openOutsideHint}</span>
        </span>
      </button>
    </div>
  );
}

/**
 * The two ways out of Facebook's or Instagram's browser, for OpenOutside and the install sheet there. `go`:
 * the phone's own browser (Safari on an iPhone, else Chrome) opens `path` signed in — a one-time sign-in
 * rides along; on an iPhone the jump needs iOS 17, so a page still here a moment later says the way by hand
 * (`stuck`). `send`: the address to oneself on WhatsApp — an app, so opening it leaves Facebook's browser by
 * itself, and the address stays behind in a chat, which «open in Chrome» never does (the one more people
 * take: someone who closes Facebook an hour later has lost nothing). Both counted, with where.
 */
function useWayOut(where: string, path: string) {
  const [stuck, setStuck] = useState(false);
  const iphone = isIphone();
  const go = async () => {
    signal("pwa_out_tap", where);
    // never in the WhatsApp link below, which stays in a chat
    const to = await handoffPath(path).catch(() => path);
    window.location.href = outsideHref(to);
    if (iphone) setTimeout(() => document.visibilityState === "visible" && setStuck(true), 1500);
  };
  const send = () => {
    signal("pwa_out_wa", where);
    window.location.href = `https://wa.me/?text=${encodeURIComponent(`${t.waShareText}\nhttps://${location.host}${path}`)}`;
  };
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const app = /Instagram/i.test(ua) ? "Instagram" : /FBAN|FBAV|FB_IAB/i.test(ua) ? "Facebook" : t.thisBrowser;
  return { go, send, stuck, browser: iphone ? "Safari" : "Chrome", app };
}

/**
 * The install sheet inside Facebook's or Instagram's browser, where nothing installs (and where 39 of the
 * 41 owners of the November campaign signed up): one ask, to open Pointili in the phone's own browser
 * signed in, on /me?install=1 where the install comes up by itself — or to send it to oneself on WhatsApp.
 * `early`: asked before any customer, so the second ask is due after the first one — in the browser the owner
 * goes on in, not in this one (&early=1 rides along). Stuck on an old iPhone, the way is WhatsApp: Instagram's
 * own «Open in browser» would open this page signed out.
 */
function OutsideSheet({ where, early, onClose }: { where: string; early: boolean; onClose: () => void }) {
  const { go, send, stuck, browser, app } = useWayOut(where, early ? "/me?install=1&early=1" : "/me?install=1");
  const later = () => {
    signal("pwa_later", where);
    onClose();
  };
  return (
    <Sheet
      label={t.installApp}
      icon={<Icon3D name="phone" size={64} className="mx-auto animate-float" />}
      title={t.installApp}
      under={stuck ? t.installOutsideStuck : fill(t.installOutsideBody, { app, browser })}
      onClose={later}
      action={
        <>
          <SheetGo onClick={() => void go()}>
            <ExternalLink className="size-5" /> {fill(t.openOutside, { browser })}
          </SheetGo>
          <button type="button" onClick={send} className="press mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-[1.25rem] bg-brand-soft text-[0.9375rem] font-bold text-brand">
            <Send className="size-[1.125rem]" /> {t.waSendSelf}
          </button>
        </>
      }
      dismiss={t.installPopupLater}
    />
  );
}

/**
 * The second ask, after the first customer: only when the first came before any customer («early»), so an owner
 * whose first customer came before he was ever asked is not asked twice in a row — and once («done»). Kept in
 * the browser, keyed by the shop: the way out of Instagram carries «early» to the browser the owner goes on in
 * (/me?install=1&early=1), where it is written unless that browser already asked again.
 */
const AGAIN = (shop: string) => `pl-install-again:${shop}`;
function againDue(shop: string): boolean {
  try {
    return localStorage.getItem(AGAIN(shop)) === "early";
  } catch {
    return false; // no storage: asked once is enough
  }
}
function markAsk(shop: string, state: "early" | "done") {
  try {
    if (state === "early" && localStorage.getItem(AGAIN(shop)) === "done") return;
    localStorage.setItem(AGAIN(shop), state);
  } catch {
    /* private mode */
  }
}

/**
 * The install sheet, once per person: «حطّ Pointili في تليفونك» where
 * Android's Chrome offers it — and on an iPhone, where nothing can be
 * offered, the guide to the three taps instead. Never once installed.
 * Written down the moment it opens, unless `force`d:
 * the owner just came out of Facebook's browser to install (/me?install=1).
 * The page decides `show` from the person's list; on Android the sheet waits
 * for Chrome's offer, which comes a moment after the page. Shown, the yes,
 * the no and the install are all counted, with where.
 *
 * In Facebook's or Instagram's browser it is the way out instead (OutsideSheet). `orAfter`: shown too once
 * that note has been seen on this phone — a home the back button brings back carries the list as it was
 * before the code was shown. `earlyFor`: this first ask comes before the shop's first customer, so a second
 * one is due after it (`again`, once, see againDue; `who` is then the shop). `under`: the words under the
 * title, the page's own reason.
 */
export function InstallPopup({
  where,
  who,
  show,
  force = false,
  orAfter,
  earlyFor,
  again = false,
  under,
}: {
  where: string;
  who: string;
  show: boolean;
  force?: boolean;
  orAfter?: Note;
  earlyFor?: string;
  again?: boolean;
  under?: string;
}) {
  const can = useCanInstall();
  const way = useInstallWay();
  const inApp = useInApp();
  const ios = way === "ios" || way === "ios-chrome";
  const [open, setOpen] = useState(false);
  const done = useRef(false);
  const at = `popup · ${where}${again ? " · again" : ""}`;
  useEffect(() => {
    if (!(can || ios || inApp) || done.current) return;
    if (!(show || force || (!!orAfter && seenHere(orAfter, who)))) return;
    if (!force && (again ? !againDue(who) : seenBefore("install", who))) return;
    const id = setTimeout(() => {
      done.current = true;
      if (again) markAsk(who, "done");
      else {
        shown("install", who);
        if (earlyFor) markAsk(earlyFor, "early");
      }
      signal(inApp ? "pwa_out_shown" : can ? "pwa_shown" : "pwa_ios_shown", at);
      setOpen(true);
    }, force ? 400 : 1200);
    return () => clearTimeout(id);
  }, [can, ios, inApp, show, force, orAfter, earlyFor, again, who, at]);

  if (!open) return null;
  if (inApp) return <OutsideSheet where={at} early={!!earlyFor} onClose={() => setOpen(false)} />;
  // an iPhone: no dialog to open, so the sheet is the guide itself
  if (!can) return way ? <GuideFor way={way} where={at} onClose={() => setOpen(false)} /> : null;

  const later = () => {
    signal("pwa_later", at);
    setOpen(false);
  };
  const yes = () => {
    setOpen(false);
    void installApp(at);
  };
  return (
    <Sheet
      label={t.installApp}
      icon={<Icon3D name="phone" size={64} className="mx-auto animate-float" />}
      title={t.installApp}
      under={under ?? t.installPopupBody}
      onClose={later}
      action={
        <SheetGo onClick={yes}>
          <Download className="size-5" /> {t.installPopupYes}
        </SheetGo>
      }
      dismiss={t.installPopupLater}
    />
  );
}

/**
 * The floating button (the founder, 24 Oct 2026: «a floating button on the
 * owner's or the customer's main page, with a nice animation, telling them
 * if they want to install»). «حطّ Pointili في تليفونك» rises a moment after
 * the page. Its little phone takes the app in, over and over, and a shine
 * crosses it now and then. A tap opens Android's own dialog where Chrome
 * offers one, else this phone's guide (fetched while the button rises, so it
 * opens at once). «×» puts it away for three days, «فهمت» at the guide's
 * end for one. It never shows on a computer, in Facebook's browser, or once
 * installed. `lift`: how far above the screen's own bottom margin it floats,
 * clear of the page's buttons. Shown, tapped and put away are counted.
 */
export function InstallFab({ where, lift }: { where: string; lift: string }) {
  const way = useInstallWay();
  const can = useCanInstall();
  const installed = useInstalled();
  const stage = useInstallStage();
  const [up, setUp] = useState(false);
  const [going, setGoing] = useState(false);
  const [guide, setGuide] = useState(false);
  const ios = way === "ios" || way === "ios-chrome";
  useOwnInstall();
  useEffect(() => {
    if (!way || fabAway()) return;
    const id = setTimeout(() => {
      // only an iPhone's Safari has a film to show; Android goes straight to Chrome's dialog
      if (way === "ios") void preloadGuide("ios").catch(() => {});
      signal("pwa_fab_shown", where);
      setUp(true);
    }, 1400);
    return () => clearTimeout(id);
  }, [way, where]);

  const away = (days: number) => {
    putFabAway(days);
    setGoing(true);
  };
  const go = async () => {
    signal("pwa_fab_tap", where);
    if (can && !ios) {
      if (await installApp(`fab · ${where}`)) away(30);
      return;
    }
    // Android before Chrome has offered: «لحظة…», then its dialog (installed, the button goes by itself)
    if (way === "android") return void tapInstall(`fab · ${where}`);
    setGuide(true);
  };
  const waiting = !ios && stage === "waiting";
  const ready = !ios && stage === "ready";

  return (
    <>
      {up && way && !installed && (
        <div className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4" style={{ bottom: `calc(max(1.25rem, env(safe-area-inset-bottom)) + ${lift})` }}>
          {/* the first time on this phone: a small note over it, «جديد!» */}
          {!going && <FabHint where={where} />}
          <div
            onAnimationEnd={(e) => going && e.target === e.currentTarget && setUp(false)}
            className={`pointer-events-auto relative flex max-w-full items-center overflow-hidden rounded-full bg-[linear-gradient(150deg,#8f75ff,#6c47ff_50%,#4a2ad6)] text-white shadow-[0_12px_28px_-12px_rgb(74_42_214/0.8)] ${going ? "animate-[fab-out_220ms_ease-in_forwards]" : "animate-[fab-in_640ms_cubic-bezier(0.34,1.56,0.64,1)_both]"}`}
          >
            {/* a shine across it, now and then */}
            <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.32),transparent)] opacity-0 motion-safe:animate-[fab-shine_5.5s_ease-in-out_1.6s_infinite]" />
            <button type="button" onClick={() => void go()} aria-busy={waiting} className="press relative flex h-12 min-w-0 items-center gap-2.5 pe-1.5 ps-1.5">
              <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-white text-brand">
                <span aria-hidden className="absolute inset-0 rounded-full bg-white/60 motion-safe:animate-[fab-ring_2.6s_ease-out_infinite]" />
                {waiting ? <LoaderCircle className="relative size-5 animate-spin" strokeWidth={2.4} /> : <FabMark />}
              </span>
              <span className="truncate text-[0.9375rem] font-bold">{waiting ? t.installWaiting : ready ? t.installReady : t.installApp}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                signal("pwa_fab_off", where);
                away(3);
              }}
              aria-label={t.fabHide}
              className="press relative me-1 grid size-9 shrink-0 place-items-center rounded-full text-white/75 active:bg-white/15"
            >
              <X className="size-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}
      {guide && ios && way && <GuideFor way={way} where={`fab · ${where}`} onClose={() => setGuide(false)} onDone={() => away(1)} />}
    </>
  );
}

/** The button's own mark: a phone, an arrow dropping into it, and the app's square landing at its foot. */
function FabMark() {
  return (
    <svg viewBox="0 0 24 24" className="relative size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5.5" y="2" width="13" height="20" rx="3" />
      <path d="M12 5.5v6.5m-3-3 3 3 3-3" className="motion-safe:animate-[fab-drop_2.6s_ease-in-out_infinite] [transform-box:fill-box]" />
      <rect x="10" y="15.5" width="4" height="3.5" rx="1" fill="currentColor" stroke="none" className="origin-center motion-safe:animate-[fab-tile_2.6s_ease-in-out_infinite] [transform-box:fill-box]" />
    </svg>
  );
}

/**
 * The iPhone's way, shown rather than told: three steps, each drawn as the
 * phone shows it — the share button in Safari's bar (at the top in Chrome),
 * «Sur l'écran d'accueil» in the list, then «Ajouter». The French words, the
 * way most phones here are set; the text under each names the English and
 * the Arabic too. Finishing it is counted.
 */
export function IosGuide({ where, onClose }: { where: string; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [chrome] = useState(() => typeof navigator !== "undefined" && /CriOS/i.test(navigator.userAgent));
  useAppStartsSignedIn(true);
  const steps = [
    { pic: <PicShare chrome={chrome} />, title: t.iosStep1, hint: chrome ? t.iosStep1HintChrome : t.iosStep1Hint },
    { pic: <PicSheet />, title: t.iosStep2, hint: t.iosStep2Hint },
    { pic: <PicAdd />, title: t.iosStep3, hint: t.iosStep3Hint },
  ];
  const last = step === steps.length - 1;
  const next = () => {
    if (!last) return setStep(step + 1);
    signal("pwa_ios_done", where);
    onClose();
  };
  const now = steps[step]!;
  return (
    <Sheet
      label={t.iosGuideTitle}
      icon={
        <>
          <style>{`@keyframes ios-ring { 0%, 100% { stroke-opacity: 1; } 50% { stroke-opacity: 0.25; } } .ios-ring { animation: ios-ring 1.4s ease-in-out infinite; }`}</style>
          <p className="text-[0.8125rem] font-bold text-muted">{t.iosGuideTitle}</p>
          {/* the phone's own screen, drawn: which step it is is told by the dots under it, not by «1/3» */}
          <div key={step} className="mt-2 animate-fade overflow-hidden rounded-[1.25rem] bg-canvas ring-1 ring-line" dir="ltr">
            {now.pic}
          </div>
        </>
      }
      title={<Mixed text={now.title} />}
      under={<Mixed text={now.hint} />}
      onClose={onClose}
      action={<SheetGo onClick={next}>{last ? t.iosDone : t.iosNext}</SheetGo>}
    >
      <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
        {steps.map((_, i) => (
          <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-5 bg-brand" : "w-1.5 bg-line"}`} />
        ))}
      </div>
    </Sheet>
  );
}

const BLUE = "#0A84FF";
const RING = "#6C47FF";
const FONT = "-apple-system, 'SF Pro Text', system-ui, sans-serif";

/** iOS's share mark: a box open at the top, an arrow out of it. */
function ShareMark({ x, y }: { x: number; y: number }) {
  return (
    <g fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={`M${x - 4} ${y - 3} H${x - 7} V${y + 9} H${x + 7} V${y - 3} H${x + 4}`} />
      <path d={`M${x} ${y + 4} V${y - 11} M${x - 4} ${y - 7} L${x} ${y - 11} L${x + 4} ${y - 7}`} />
    </g>
  );
}

/** Step 1: the page, and the bar with the share button ringed — at the bottom in Safari, in the address field in Chrome. */
function PicShare({ chrome }: { chrome: boolean }) {
  const top = chrome ? 62 : 16;
  const page = (
    <g>
      <rect x="22" y={top} width="140" height="10" rx="5" fill="#DCD6EE" />
      <rect x="22" y={top + 18} width="256" height="34" rx="9" fill="#ECE8F7" />
      <rect x="22" y={top + 60} width="200" height="8" rx="4" fill="#E4E0EF" />
    </g>
  );
  if (chrome) {
    return (
      <svg viewBox="0 0 300 150" className="block w-full" role="img" aria-label={t.iosStep1}>
        <rect width="300" height="150" fill="#FFFFFF" />
        <rect x="0" y="0" width="300" height="50" fill="#F6F6F8" />
        <rect x="14" y="10" width="272" height="30" rx="15" fill="#E9E9EE" />
        <text x="36" y="29.5" fontFamily={FONT} fontSize="12" fill="#3C3C43">
          pointili.online
        </text>
        <ShareMark x={262} y={25} />
        <circle className="ios-ring" cx="262" cy="24" r="17" fill="none" stroke={RING} strokeWidth="3" />
        {page}
      </svg>
    );
  }
  const icon = (d: string, x: number) => <path d={d} transform={`translate(${x} 132)`} fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />;
  return (
    <svg viewBox="0 0 300 150" className="block w-full" role="img" aria-label={t.iosStep1}>
      <rect width="300" height="150" fill="#FFFFFF" />
      {page}
      <rect x="0" y="92" width="300" height="58" fill="#F6F6F8" />
      <rect x="40" y="98" width="220" height="24" rx="12" fill="#E9E9EE" />
      <text x="150" y="114" textAnchor="middle" fontFamily={FONT} fontSize="11" fill="#3C3C43">
        pointili.online
      </text>
      {icon("M4 -6 L-2 0 L4 6", 30)}
      {icon("M-4 -6 L2 0 L-4 6", 90)}
      <ShareMark x={150} y={134} />
      {icon("M-8 -6 Q-4 -8 0 -6 Q4 -8 8 -6 V6 Q4 4 0 6 Q-4 4 -8 6 Z M0 -6 V6", 210)}
      {icon("M-6 -4 H4 V6 H-6 Z M-3 -7 H7 V3", 270)}
      <circle className="ios-ring" cx="150" cy="132" r="17" fill="none" stroke={RING} strokeWidth="3" />
    </svg>
  );
}

/** Step 2: the share list, «Sur l'écran d'accueil» lit and ringed. */
function PicSheet() {
  const rows: [string, string][] = [
    ["Copier", "M-5 -6 H3 V5 H-5 Z M-2 -9 H6 V2"],
    ["Ajouter aux favoris", "M-6 -6 Q-3 -8 0 -6 Q3 -8 6 -6 V6 Q3 4 0 6 Q-3 4 -6 6 Z"],
    ["Sur l’écran d’accueil", "M-7 -7 H7 V7 H-7 Z M0 -4 V4 M-4 0 H4"],
    ["Ajouter à la liste de lecture", "M-7 1 A3 3 0 1 0 -1 1 A3 3 0 1 0 -7 1 M1 1 A3 3 0 1 0 7 1 A3 3 0 1 0 1 1 M-1 1 H1"],
  ];
  return (
    <svg viewBox="0 0 300 150" className="block w-full" role="img" aria-label={t.iosStep2}>
      <rect width="300" height="150" fill="#9A97A6" />
      <rect x="10" y="8" width="280" height="160" rx="14" fill="#F2F2F7" />
      <rect x="135" y="13" width="30" height="4" rx="2" fill="#C7C7CC" />
      <rect x="20" y="24" width="260" height="120" rx="11" fill="#FFFFFF" />
      {rows.map(([label, d], i) => {
        const y = 24 + i * 30;
        const lit = i === 2;
        return (
          <g key={label}>
            {lit && <rect x="20" y={y} width="260" height="30" fill="#EEE9FF" />}
            {i > 0 && <line x1="32" x2="280" y1={y} y2={y} stroke="#E5E5EA" />}
            <text x="32" y={y + 19.5} fontFamily={FONT} fontSize="12" fontWeight={lit ? 600 : 400} fill="#111111">
              {label}
            </text>
            <path d={d} transform={`translate(262 ${y + 15})`} fill="none" stroke="#111111" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );
      })}
      <rect className="ios-ring" x="17" y="81" width="266" height="36" rx="9" fill="none" stroke={RING} strokeWidth="3" />
    </svg>
  );
}

/** Step 3: the last screen, Pointili's icon and name, «Ajouter» ringed. */
function PicAdd() {
  return (
    <svg viewBox="0 0 300 150" className="block w-full" role="img" aria-label={t.iosStep3}>
      <defs>
        <clipPath id="ios-app-icon">
          <rect x="28" y="63" width="44" height="44" rx="10" />
        </clipPath>
      </defs>
      <rect width="300" height="150" fill="#F2F2F7" />
      <rect x="0" y="0" width="300" height="40" fill="#F9F9F9" />
      <line x1="0" x2="300" y1="40" y2="40" stroke="#D1D1D6" />
      <text x="16" y="25" fontFamily={FONT} fontSize="12" fill={BLUE}>
        Annuler
      </text>
      <text x="150" y="25" textAnchor="middle" fontFamily={FONT} fontSize="11.5" fontWeight="600" fill="#111111">
        Sur l’écran d’accueil
      </text>
      <text x="284" y="25" textAnchor="end" fontFamily={FONT} fontSize="12" fontWeight="700" fill={BLUE}>
        Ajouter
      </text>
      <rect className="ios-ring" x="234" y="8" width="58" height="25" rx="8" fill="none" stroke={RING} strokeWidth="3" />
      <rect x="16" y="54" width="268" height="62" rx="11" fill="#FFFFFF" />
      <image href="/icon-192.png" x="28" y="63" width="44" height="44" clipPath="url(#ios-app-icon)" preserveAspectRatio="xMidYMid slice" />
      <text x="86" y="81" fontFamily={FONT} fontSize="13" fontWeight="600" fill="#111111">
        Pointili
      </text>
      <line x1="86" x2="272" y1="88" y2="88" stroke="#E5E5EA" />
      <text x="86" y="104" fontFamily={FONT} fontSize="10.5" fill="#8E8E93">
        https://www.pointili.online/
      </text>
    </svg>
  );
}
