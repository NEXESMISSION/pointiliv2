"use client";

import { useEffect, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useInstall } from "@/lib/install";

const DISMISS_KEY = "pd_install_dismissed_at";
const DISMISS_DAYS = 14;

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return Date.now() - at < DISMISS_DAYS * 86400000;
  } catch {
    return false;
  }
}

/** A quiet card on the customer home: install Pointili like a normal app. */
export function InstallBanner() {
  const { mode, install } = useInstall();
  const [hidden, setHidden] = useState(true);
  const [iosHelp, setIosHelp] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHidden(recentlyDismissed()), 0);
    return () => clearTimeout(t);
  }, []);

  if (hidden || (mode !== "android" && mode !== "ios")) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* private mode */
    }
    setHidden(true);
  };

  return (
    <>
      <div className="flex animate-rise items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-card">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50">
          <LogoMark size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-ink">Install Pointili</p>
          <p className="truncate text-[13px] text-muted">Your cards, one tap away</p>
        </div>
        <Button size="sm" onClick={() => (mode === "android" ? void install() : setIosHelp(true))}>
          Install
        </Button>
        <button type="button" onClick={dismiss} aria-label="Not now" className="grid size-9 place-items-center rounded-full text-faint hover:bg-canvas hover:text-muted">
          <X className="size-4" />
        </button>
      </div>
      <IosInstallHelp open={iosHelp} onClose={() => setIosHelp(false)} />
    </>
  );
}

/** A list row version (profile page). Renders nothing when installing isn't possible or already done. */
export function InstallRow() {
  const { mode, install } = useInstall();
  const [iosHelp, setIosHelp] = useState(false);
  if (mode !== "android" && mode !== "ios") return null;
  return (
    <>
      <button type="button" onClick={() => (mode === "android" ? void install() : setIosHelp(true))} className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-canvas/60">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
          <Download className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-medium text-ink">Install the app</span>
          <span className="block truncate text-[13px] text-muted">Open your cards from the home screen</span>
        </span>
      </button>
      <IosInstallHelp open={iosHelp} onClose={() => setIosHelp(false)} />
    </>
  );
}

function IosInstallHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Add Pointili to your Home Screen" footer={<Button onClick={onClose}>Got it</Button>}>
      <ol className="space-y-4">
        <li className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-canvas text-brand-600">
            <Share className="size-5" />
          </span>
          <span>
            Tap <b>Share</b> at the bottom of Safari
          </span>
        </li>
        <li className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-canvas text-brand-600">
            <SquarePlus className="size-5" />
          </span>
          <span>
            Choose <b>Add to Home Screen</b>, then <b>Add</b>
          </span>
        </li>
      </ol>
    </Modal>
  );
}
