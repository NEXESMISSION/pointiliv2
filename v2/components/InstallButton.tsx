"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Download } from "lucide-react";
import { IosGuide } from "@/components/InstallApp";
import { InstallGuide, preloadGuide } from "@/components/InstallGuide";
import { installApp, useCanInstall, useInstalled, useInstallWay } from "@/lib/pwa";
import { signal } from "@/lib/track";
import { t } from "@/lib/t";

/**
 * «حطّ Pointili في تليفونك», always within reach for an owner (the founder, 5 Nov 2026: «add it in the
 * settings page, in the ؟ button and outside on the main page — a button that installs the app on
 * Android cleanly»). The floating ones (InstallFab, the site's AndroidInstall) rise only now and then,
 * and the owner's home floated it only once a customer had been served: an owner looked and found
 * no way to install.
 *
 * Where Chrome offers to install (Android, or a computer's Chrome), a tap opens Chrome's own dialog,
 * nothing more. On a phone before Chrome offers (or an iPhone), the guide that shows the taps. Nothing
 * at all on a computer Chrome has not offered, in Facebook's browser, or once installed — it never
 * takes room for nothing. `look`: a round purple button for a header (the owner's home, beside «؟»),
 * a line of the settings list, or a row of the help sheet. Shown (once per place) and tapped are counted.
 */
export function InstallButton({ where, look }: { where: string; look: "icon" | "setting" | "sheet" }) {
  const can = useCanInstall();
  const way = useInstallWay();
  const installed = useInstalled();
  const [guide, setGuide] = useState(false);
  const counted = useRef(false);
  const live = !installed && (can || !!way);
  useEffect(() => {
    if (!live || counted.current) return;
    counted.current = true;
    signal(can ? "pwa_shown" : "pwa_ios_shown", where);
  }, [live, can, where]);

  const go = () => {
    if (can) return void installApp(where);
    signal("pwa_ios_open", where);
    setGuide(true);
  };
  // the guide opens over whatever holds the button (the help sheet stays under it)
  const sheet =
    guide && way ? (
      way === "ios-chrome" ? <IosGuide where={where} onClose={() => setGuide(false)} /> : <InstallGuide way={way} where={where} onClose={() => setGuide(false)} />
    ) : null;
  if (!live) return sheet;
  // the guide's film, fetched while the finger is on its way
  const warm = () => {
    if (!can && way && way !== "ios-chrome") void preloadGuide(way).catch(() => {});
  };

  if (look === "icon") {
    return (
      <>
        <button
          type="button"
          onClick={go}
          onPointerDown={warm}
          aria-label={t.installApp}
          title={t.installApp}
          className="press grid size-11 shrink-0 place-items-center rounded-full bg-brand text-white shadow-[0_8px_18px_-8px_rgb(108_71_255/0.9)]"
        >
          <Download className="size-5" strokeWidth={2.4} />
        </button>
        {sheet}
      </>
    );
  }
  if (look === "setting") {
    // one line of «المحل», drawn like its neighbours (app/shop/settings: Row)
    return (
      <>
        <button type="button" onClick={go} onPointerDown={warm} className="press flex w-full items-center gap-3 px-3.5 py-[clamp(0.5rem,1.4dvh,0.8rem)] text-start active:bg-canvas">
          <span className="grid size-9 shrink-0 place-items-center rounded-[0.75rem] bg-brand text-white" aria-hidden>
            <Download className="size-[1.125rem]" strokeWidth={2.4} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.9375rem] font-bold">{t.installApp}</span>
            <span className="block truncate text-[0.8125rem] text-muted [@media(max-height:520px)]:hidden">{t.installAppHint}</span>
          </span>
          <ChevronLeft className="size-4 shrink-0 text-faint" />
        </button>
        {sheet}
      </>
    );
  }
  // a row of the help sheet, beside the filmed slides and the videos (components/Help)
  return (
    <>
      <button type="button" onClick={go} onPointerDown={warm} className="press flex h-[3.25rem] w-full items-center gap-3 rounded-[1.125rem] bg-surface px-3 text-start text-[0.9375rem] font-semibold shadow-card">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-white" aria-hidden>
          <Download className="size-4" strokeWidth={2.5} />
        </span>
        <span className="min-w-0 flex-1 truncate">{t.installApp}</span>
      </button>
      {sheet}
    </>
  );
}
