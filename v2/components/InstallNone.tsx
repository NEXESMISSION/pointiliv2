"use client";

import { Download, Smartphone, X } from "lucide-react";
import { dismissInstallNote, useInstallStage } from "@/lib/pwa";
import { signal } from "@/lib/track";
import { t } from "@/lib/t";

/** The Android app, the site itself signed by Pointili (android/, public/pointili.apk). */
export const APK = "/pointili.apk";

/**
 * An install tap on Android the browser did not answer (lib/pwa: tapInstall): one dark note at the
 * foot of the screen — never the filmed guide. Either Pointili is already on this phone (this very
 * browser opened as the installed app before: its own word, or its visitor id in the traffic): where
 * to find it, and the way back if it was deleted. Or the browser never offered in fifteen seconds —
 * a phone whose browser will not install (the owner of «سلطان العطور», 3–6 Nov 2026, Chrome and
 * Brave alike): the Android app itself, one tap to download, what Android asks on the way, and the
 * browser's own menu as the other way. It goes by itself after a while, or at «×». In the layout
 * (components/Pwa), so every install button on every page shares it.
 */
export function InstallNone() {
  const stage = useInstallStage();
  if (stage !== "none" && stage !== "already") return null;
  const here = stage === "already";
  return (
    <div className="pointer-events-none fixed inset-x-0 z-[70] flex justify-center px-4" style={{ bottom: "max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem))" }} role="status">
      <div className="pointer-events-auto flex w-full max-w-[24rem] animate-[fab-hint-in_520ms_cubic-bezier(0.34,1.56,0.64,1)_both] items-start gap-2.5 rounded-[1.125rem] bg-ink px-4 py-3 text-start text-white shadow-lift">
        <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ${here ? "bg-mint" : "bg-brand"}`} aria-hidden>
          {here ? <Smartphone className="size-4" strokeWidth={2.4} /> : <Download className="size-4" strokeWidth={2.6} />}
        </span>
        <div className="min-w-0 flex-1">
          <b className="block text-[0.9375rem] font-bold leading-tight">{here ? t.installHereTitle : t.installApkTitle}</b>
          <p className="mt-0.5 text-[0.8125rem] leading-snug text-white/90">{here ? t.installHereBody : t.installApkBody}</p>
          {!here && (
            <>
              {/* the app itself: a plain link, so the phone's own download takes it */}
              <a
                href={APK}
                download="Pointili.apk"
                onClick={() => signal("pwa_apk", "note")}
                className="press mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-[0.875rem] bg-brand text-[0.9375rem] font-bold text-white"
              >
                <Download className="size-[1.125rem]" strokeWidth={2.5} /> {t.installApkGo}
              </a>
              <p className="mt-1.5 text-[0.75rem] leading-snug text-white/70">
                {t.installApkAfter}{" "}
                <bdi dir="ltr" className="font-semibold text-white">
                  {t.installApkWord}
                </bdi>
              </p>
            </>
          )}
          {/* the menu's own French words sealed left to right, so the Arabic line keeps its order */}
          <p className="mt-1 text-[0.75rem] leading-snug text-white/60">
            {here ? t.installHereGone : t.installNoneBody}{" "}
            <bdi dir="ltr" className="font-semibold text-white/85">
              {t.installNoneWord}
            </bdi>
          </p>
        </div>
        <button type="button" onClick={dismissInstallNote} aria-label={t.fabHintOk} className="press -me-1 -mt-0.5 grid size-8 shrink-0 place-items-center rounded-full text-white/55 active:bg-white/10">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
