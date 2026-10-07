"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import { Icon3D } from "@/components/ui";
import { seenBefore, shown } from "@/lib/once";
import { installApp, isIphone, outsideHref, startPwa, useCanInstall, useInApp, useIosBrowser } from "@/lib/pwa";
import { signal } from "@/lib/track";
import { fill, t } from "@/lib/t";

/** In the layout: the worker, Android's install prompt kept, the installed app's visits counted. */
export function Pwa() {
  useEffect(() => startPwa(), []);
  return null;
}

/**
 * «حطّ Pointili في تليفونك»: where Android's Chrome offers to install, its
 * own dialog; in an iPhone's own browser (no such dialog there), the guide
 * that shows the three taps. Never in Facebook's browser, never once
 * installed. `look`: a small pill (the wallet, a header), a full row (the
 * account page) or a word in the front door's footer. Its showing is counted
 * once, with where it was.
 */
export function InstallApp({ where, look = "pill", className = "" }: { where: string; look?: "pill" | "row" | "link"; className?: string }) {
  const can = useCanInstall();
  const ios = useIosBrowser();
  const [guide, setGuide] = useState(false);
  const counted = useRef(false);
  useEffect(() => {
    if (!(can || ios) || counted.current) return;
    counted.current = true;
    signal(can ? "pwa_shown" : "pwa_ios_shown", where);
  }, [can, ios, where]);
  if (!can && !ios) return null;

  const go = () => {
    if (can) return void installApp(where);
    signal("pwa_ios_open", where);
    setGuide(true);
  };
  const sheet = guide && <IosGuide where={where} onClose={() => setGuide(false)} />;

  if (look === "link") {
    // a third word in a footer row: a dot before it, the same quiet type
    return (
      <>
        <span className="size-1 rounded-full bg-[#CFC5B6]" aria-hidden />
        <button type="button" onClick={go} className={`inline-flex items-center gap-1 font-bold text-[#B00D17] ${className}`}>
          <Download className="size-3.5" /> {t.installApp}
        </button>
        {sheet}
      </>
    );
  }
  if (look === "row") {
    return (
      <>
        <button type="button" onClick={go} className={`press flex w-full items-center gap-3 rounded-[1.375rem] bg-surface p-4 text-start shadow-card ${className}`}>
          <span className="grid size-10 shrink-0 place-items-center rounded-[0.875rem] bg-brand text-white">
            <Download className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[1.0312rem] font-bold">{t.installApp}</span>
            <span className="block truncate text-[0.8438rem] text-muted">{t.installAppHint}</span>
          </span>
        </button>
        {sheet}
      </>
    );
  }
  return (
    <>
      <button type="button" onClick={go} className={`press inline-flex h-10 items-center gap-2 rounded-full bg-brand px-4 text-[0.9062rem] font-bold text-white ${className}`}>
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
        {stuck && (
          <p className="text-center text-[0.8125rem] leading-snug text-muted">
            <Mixed text={t.openOutsideStuck} />
          </p>
        )}
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
        <span className="block text-[0.8438rem] leading-snug text-muted">{stuck ? <Mixed text={t.openOutsideStuck} /> : t.openOutsideHint}</span>
      </span>
    </button>
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
  const ios = useIosBrowser();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
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
  if (!can) return <IosGuide where={`popup · ${where}`} onClose={() => setOpen(false)} />;

  const close = () => {
    setLeaving(true);
    setTimeout(() => setOpen(false), 220);
  };
  const later = () => {
    signal("pwa_later", where);
    close();
  };
  const yes = () => {
    close();
    void installApp(`popup · ${where}`);
  };
  return (
    <div className={`fixed inset-0 z-50 flex items-end justify-center bg-[rgb(20_16_40/0.5)] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-opacity duration-200 ${leaving ? "opacity-0" : "animate-fade"}`} role="dialog" aria-modal="true" aria-label={t.installApp} onClick={later}>
      <div className="w-full max-w-sm rounded-[1.75rem] bg-surface p-5 text-center text-ink shadow-[0_30px_70px_-25px_rgb(20_16_40/0.6)]" style={{ animation: "news-in 420ms cubic-bezier(0.2,0.8,0.2,1) both" }} onClick={(e) => e.stopPropagation()}>
        <style>{`@keyframes news-in { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }`}</style>
        <Icon3D name="phone" size={64} className="mx-auto animate-float" />
        <h2 className="mt-2 text-balance text-[1.375rem] font-bold leading-tight">{t.installApp}</h2>
        <p className="mx-auto mt-1.5 max-w-[17rem] text-balance text-[0.9375rem] leading-snug text-body">{t.installPopupBody}</p>
        <button type="button" onClick={yes} className="press mt-4 flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-[1.25rem] bg-brand text-[1.0625rem] font-bold text-white">
          <Download className="size-5" /> {t.installPopupYes}
        </button>
        <button type="button" onClick={later} className="press mt-1 h-10 w-full text-[0.9375rem] font-semibold text-muted">
          {t.installPopupLater}
        </button>
      </div>
    </div>
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
    <div className="fixed inset-0 z-50 flex animate-fade items-end justify-center bg-[rgb(20_16_40/0.5)] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]" role="dialog" aria-modal="true" aria-label={t.iosGuideTitle} onClick={onClose}>
      <style>{`@keyframes ios-ring { 0%, 100% { stroke-opacity: 1; } 50% { stroke-opacity: 0.25; } } .ios-ring { animation: ios-ring 1.4s ease-in-out infinite; }`}</style>
      <div className="w-full max-w-sm rounded-[1.75rem] bg-surface p-4 text-center text-ink shadow-[0_30px_70px_-25px_rgb(20_16_40/0.6)]" onClick={(e) => e.stopPropagation()}>
        <p className="text-[0.8125rem] font-bold text-muted">
          {t.iosGuideTitle} · <bdi className="num">{step + 1}/3</bdi>
        </p>
        <div key={step} className="mt-2.5 animate-fade overflow-hidden rounded-[1.25rem] bg-canvas ring-1 ring-line" dir="ltr">
          {now.pic}
        </div>
        <h2 className="mt-3 text-[1.25rem] font-bold leading-tight">
          <Mixed text={now.title} />
        </h2>
        <p className="mx-auto mt-1 max-w-[19rem] text-balance text-[0.875rem] leading-snug text-body">
          <Mixed text={now.hint} />
        </p>
        <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
          {steps.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-5 bg-brand" : "w-1.5 bg-line"}`} />
          ))}
        </div>
        <button type="button" onClick={next} className="press mt-3 h-[3.25rem] w-full rounded-[1.25rem] bg-brand text-[1.0625rem] font-bold text-white">
          {last ? t.iosDone : t.iosNext}
        </button>
      </div>
    </div>
  );
}

/**
 * «Latin words» inside an Arabic line — the phone's own labels — sealed left
 * to right with their own quotes: on the Arabic side the closing » would
 * otherwise turn into a second «.
 */
function Mixed({ text }: { text: string }) {
  const parts = text.split(/(«[^»]*[A-Za-z][^»]*»)/);
  return <>{parts.map((p, i) => (i % 2 ? <bdi key={i} dir="ltr">{p}</bdi> : p))}</>;
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
