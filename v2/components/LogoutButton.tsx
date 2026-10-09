"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { logout, pushUnsubscribe } from "@/app/actions";
import { t } from "@/lib/t";

/**
 * «اخرج»: before the account goes, this phone's word is taken back — the
 * reminders written to this browser's push subscription belonged to the
 * person leaving, and the next one to sign in here must not get them. A
 * phone that never gave a word, or one that is slow about it, never holds
 * the way out: two seconds, then out.
 */
export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  const out = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await Promise.race([forget(), new Promise((r) => setTimeout(r, 2000))]);
    } catch {
      // nothing to take back
    }
    await logout();
  };
  return (
    <button type="button" onClick={() => void out()} disabled={busy} className="press mt-[3dvh] flex h-[3.5rem] w-full items-center justify-center gap-2 rounded-[1.25rem] bg-surface text-[1.0625rem] font-semibold text-coral shadow-card disabled:opacity-70">
      <LogOut className="size-5" /> {busy ? t.checking : t.logout}
    </button>
  );
}

async function forget() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub?.endpoint) await pushUnsubscribe(sub.endpoint);
}
