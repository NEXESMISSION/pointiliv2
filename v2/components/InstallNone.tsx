"use client";

import { EllipsisVertical, Smartphone, X } from "lucide-react";
import { dismissInstallNote, useInstallStage } from "@/lib/pwa";
import { t } from "@/lib/t";

/**
 * An install tap on Android the browser did not answer (lib/pwa: tapInstall): one short dark note at
 * the foot of the screen — never the filmed guide. Either Pointili is already on this phone (this
 * browser opened as the app before, or this account opened the app on a phone with this screen): where
 * to find it, and the way back if it was deleted. Or the browser never offered in fifteen seconds:
 * where its own menu has the install. It goes by itself after a few seconds, or at a tap. In the
 * layout (components/Pwa), so every install button on every page shares it.
 */
export function InstallNone() {
  const stage = useInstallStage();
  if (stage !== "none" && stage !== "already") return null;
  const here = stage === "already";
  return (
    <div className="pointer-events-none fixed inset-x-0 z-[70] flex justify-center px-4" style={{ bottom: "max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem))" }} role="status">
      <button
        type="button"
        onClick={dismissInstallNote}
        className="pointer-events-auto flex max-w-[24rem] animate-[fab-hint-in_520ms_cubic-bezier(0.34,1.56,0.64,1)_both] items-start gap-2.5 rounded-[1.125rem] bg-ink px-4 py-3 text-start text-white shadow-lift"
      >
        <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ${here ? "bg-mint" : "bg-white/15"}`} aria-hidden>
          {here ? <Smartphone className="size-4" strokeWidth={2.4} /> : <EllipsisVertical className="size-4" strokeWidth={2.6} />}
        </span>
        <span className="min-w-0 flex-1">
          <b className="block text-[0.9375rem] font-bold leading-tight">{here ? t.installHereTitle : t.installNoneTitle}</b>
          {here && <span className="mt-0.5 block text-[0.8125rem] leading-snug text-white/90">{t.installHereBody}</span>}
          {/* the menu's own French words sealed left to right, so the Arabic line keeps its order */}
          <span className="mt-0.5 block text-[0.75rem] leading-snug text-white/70">
            {here ? t.installHereGone : t.installNoneBody}{" "}
            <bdi dir="ltr" className="font-semibold text-white">
              {t.installNoneWord}
            </bdi>
          </span>
        </span>
        <X className="mt-0.5 size-4 shrink-0 text-white/55" aria-label={t.fabHintOk} />
      </button>
    </div>
  );
}
