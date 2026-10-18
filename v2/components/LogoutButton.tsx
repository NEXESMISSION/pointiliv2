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
export function LogoutButton({ className = "mt-[3dvh]", kind = "card" }: { className?: string; kind?: "card" | "rail" }) {
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
  // «rail»: the console's foot, where the way out is a row like the two above it,
  // and the word beside the mark only once the rail is standing (the founder,
  // 18 Oct 2026: «add a logout button in the admin i dont find it»)
  const look =
    kind === "rail"
      ? "flex h-10 w-full items-center gap-2.5 rounded-[0.75rem] px-3 text-[0.875rem] font-semibold text-coral transition-colors hover:bg-canvas disabled:opacity-70"
      : "flex h-[3.5rem] w-full items-center justify-center gap-2 rounded-[1.25rem] bg-surface text-[1.0625rem] font-semibold text-coral shadow-card disabled:opacity-70";
  return (
    <button type="button" onClick={() => void out()} disabled={busy} aria-label={t.logout} className={`press ${className} ${look}`}>
      <LogOut className={kind === "rail" ? "size-4 shrink-0" : "size-5"} />
      <span className={kind === "rail" ? "hidden lg:block" : ""}>{busy ? t.checking : t.logout}</span>
    </button>
  );
}

async function forget() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub?.endpoint) await pushUnsubscribe(sub.endpoint);
}
