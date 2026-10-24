"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ExternalLink, Send, X } from "lucide-react";
import { handoffPath } from "@/app/actions";
import { Sheet, SheetGo } from "@/components/Client";
import { InstallGuide, Mixed, preloadGuide, useAppStartsSignedIn } from "@/components/InstallGuide";
import { Icon3D } from "@/components/ui";
import { seenBefore, shown } from "@/lib/once";
import { installApp, isIphone, outsideHref, startPwa, useCanInstall, useInApp, useInstalled, useInstallWay, type InstallWay } from "@/lib/pwa";
import { signal } from "@/lib/track";
import { fill, t } from "@/lib/t";

/** In the layout: the worker, Android's install prompt kept, the installed app's visits counted. */
export function Pwa() {
  useEffect(() => startPwa(), []);
  return null;
}

/** This phone's guide: the filmed one (an iPhone's Safari, Android), or the drawn one for Chrome on an iPhone. */
function GuideFor({ way, where, onClose, onDone }: { way: Exclude<InstallWay, null>; where: string; onClose: () => void; onDone?: () => void }) {
  if (way === "ios-chrome") return <IosGuide where={where} onClose={onClose} />;
  return <InstallGuide way={way} where={where} onClose={onClose} onDone={onDone} />;
}

/**
 * «حطّ Pointili في تليفونك»: where Android's Chrome offers to install, its
 * own dialog; elsewhere on a phone (an iPhone, or Android before Chrome
 * offers), the guide that shows the taps. Never in Facebook's browser, never
 * once installed. `look`: a small pill (a header), a full row (the account
 * page) or a word in the front door's footer. Its showing is counted once,
 * with where it was.
 */
export function InstallApp({ where, look = "pill", className = "" }: { where: string; look?: "pill" | "row" | "link"; className?: string }) {
  const can = useCanInstall();
  const way = useInstallWay();
  const [guide, setGuide] = useState(false);
  const counted = useRef(false);
  useEffect(() => {
    if (!(can || way) || counted.current) return;
    counted.current = true;
    signal(can ? "pwa_shown" : "pwa_ios_shown", where);
  }, [can, way, where]);
  if (!can && !way) return null;

  const go = () => {
    if (can) return void installApp(where);
    signal("pwa_ios_open", where);
    setGuide(true);
  };
  const sheet = guide && way && <GuideFor way={way} where={where} onClose={() => setGuide(false)} />;

  if (look === "link") {
    // a third word in a footer row: a dot before it, the same quiet type
    return (
      <>
        <span className="size-1 rounded-full bg-[#CFC5B6]" aria-hidden />
        <button type="button" onClick={() => void go()} className={`inline-flex items-center gap-1 font-bold text-[#B00D17] ${className}`}>
          <Download className="size-3.5" /> {t.installApp}
        </button>
        {sheet}
      </>
    );
  }
  if (look === "row") {
    return (
      <>
        <button type="button" onClick={() => void go()} className={`press flex w-full items-center gap-3 rounded-[1.375rem] bg-surface p-4 text-start shadow-card ${className}`}>
          <span className="grid size-10 shrink-0 place-items-center rounded-[0.875rem] bg-brand text-white">
            <Download className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[1.0625rem] font-bold">{t.installApp}</span>
            <span className="block truncate text-[0.8125rem] text-muted">{t.installAppHint}</span>
          </span>
        </button>
        {sheet}
      </>
    );
  }
  return (
    <>
      <button type="button" onClick={() => void go()} className={`press inline-flex h-10 items-center gap-2 rounded-full bg-brand px-4 text-[0.9375rem] font-bold text-white ${className}`}>
        <Download className="size-[1.125rem]" /> {t.installApp}
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
  // the other browser opens signed in: a one-time sign-in rides along (never in the WhatsApp link below, which stays in a chat)
  const go = async () => {
    signal("pwa_out_tap", where);
    const to = await handoffPath(path).catch(() => path);
    window.location.href = outsideHref(to);
    if (iphone) setTimeout(() => document.visibilityState === "visible" && setStuck(true), 1500);
  };

  // The other way out, and the one more people take: WhatsApp is an app, so
  // opening it leaves Facebook's browser by itself — and it leaves the address
  // behind in a chat, which is what «open in Chrome» never does. Someone who
  // closes Facebook an hour later has lost nothing.
  const send = () => {
    signal("pwa_out_wa", where);
    window.location.href = `https://wa.me/?text=${encodeURIComponent(`${t.waShareText}\nhttps://${location.host}${path}`)}`;
  };

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
 * The install sheet, once per person: «حطّ Pointili في تليفونك» where
 * Android's Chrome offers it — and on an iPhone, where nothing can be
 * offered, the guide to the three taps instead. Never in Facebook's browser,
 * never once installed. Written down the moment it opens, unless `force`d:
 * the owner just came out of Facebook's browser to install (/me?install=1).
 * The page decides `show` from the person's list; on Android the sheet waits
 * for Chrome's offer, which comes a moment after the page. Shown, the yes,
 * the no and the install are all counted, with where.
 */
export function InstallPopup({ where, who, show, force = false }: { where: string; who: string; show: boolean; force?: boolean }) {
  const can = useCanInstall();
  const way = useInstallWay();
  const ios = way === "ios" || way === "ios-chrome";
  const [open, setOpen] = useState(false);
  const done = useRef(false);
  useEffect(() => {
    if (!(can || ios) || done.current || !(show || force)) return;
    if (!force && seenBefore("install", who)) return;
    const id = setTimeout(() => {
      done.current = true;
      shown("install", who);
      signal(can ? "pwa_shown" : "pwa_ios_shown", `popup · ${where}`);
      setOpen(true);
    }, force ? 400 : 1200);
    return () => clearTimeout(id);
  }, [can, ios, show, force, who, where]);

  if (!open) return null;
  // an iPhone: no dialog to open, so the sheet is the guide itself
  if (!can) return way ? <GuideFor way={way} where={`popup · ${where}`} onClose={() => setOpen(false)} /> : null;

  const later = () => {
    signal("pwa_later", where);
    setOpen(false);
  };
  const yes = () => {
    setOpen(false);
    void installApp(`popup · ${where}`);
  };
  return (
    <Sheet
      label={t.installApp}
      icon={<Icon3D name="phone" size={64} className="mx-auto animate-float" />}
      title={t.installApp}
      under={t.installPopupBody}
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

const FAB_OFF = "pl-fab-off";
const DAY = 86_400_000;

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
  const [up, setUp] = useState(false);
  const [going, setGoing] = useState(false);
  const [guide, setGuide] = useState(false);
  useEffect(() => {
    if (!way) return;
    try {
      if (Number(localStorage.getItem(FAB_OFF) ?? 0) > Date.now()) return;
    } catch {
      /* no storage: it shows */
    }
    const id = setTimeout(() => {
      if (way !== "ios-chrome") void preloadGuide(way).catch(() => {});
      signal("pwa_fab_shown", where);
      setUp(true);
    }, 1400);
    return () => clearTimeout(id);
  }, [way, where]);

  const away = (days: number) => {
    try {
      localStorage.setItem(FAB_OFF, String(Date.now() + days * DAY));
    } catch {
      /* gone for this visit only */
    }
    setGoing(true);
  };
  const go = async () => {
    signal("pwa_fab_tap", where);
    if (can) {
      if (await installApp(`fab · ${where}`)) away(30);
      return;
    }
    setGuide(true);
  };

  return (
    <>
      {up && way && !installed && (
        <div className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4" style={{ bottom: `calc(max(1.25rem, env(safe-area-inset-bottom)) + ${lift})` }}>
          <div
            onAnimationEnd={(e) => going && e.target === e.currentTarget && setUp(false)}
            className={`pointer-events-auto relative flex max-w-full items-center overflow-hidden rounded-full bg-[linear-gradient(150deg,#8f75ff,#6c47ff_50%,#4a2ad6)] text-white shadow-[0_12px_28px_-12px_rgb(74_42_214/0.8)] ${going ? "animate-[fab-out_220ms_ease-in_forwards]" : "animate-[fab-in_640ms_cubic-bezier(0.34,1.56,0.64,1)_both]"}`}
          >
            {/* a shine across it, now and then */}
            <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.32),transparent)] opacity-0 motion-safe:animate-[fab-shine_5.5s_ease-in-out_1.6s_infinite]" />
            <button type="button" onClick={() => void go()} className="press relative flex h-12 min-w-0 items-center gap-2.5 pe-1.5 ps-1.5">
              <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-white text-brand">
                <span aria-hidden className="absolute inset-0 rounded-full bg-white/60 motion-safe:animate-[fab-ring_2.6s_ease-out_infinite]" />
                <FabMark />
              </span>
              <span className="truncate text-[0.9375rem] font-bold">{t.installApp}</span>
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
      {guide && way && <GuideFor way={way} where={`fab · ${where}`} onClose={() => setGuide(false)} onDone={() => away(1)} />}
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
