"use client";

import { useState, useSyncExternalStore } from "react";
import { BellRing } from "lucide-react";
import { markSeen, pushSubscribe } from "@/app/actions";
import { signal } from "@/lib/track";
import { fill, t } from "@/lib/t";

const never = () => () => {};
/** This phone can take a word (a browser with push, not yet refused); false while the server draws the page. */
const useCanPush = () => useSyncExternalStore(never, () => "Notification" in window && "serviceWorker" in navigator && "PushManager" in window && Notification.permission !== "denied", () => false);

/** The key the browser needs to accept a subscription for this app, as bytes. */
function keyBytes(b64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Asked once, on a card with a tampon on it: «نفكّروك كي يقرب الكادو؟». Yes
 * brings the phone's own question, then the phone is written down and the
 * shop's reminders reach it (lib/push.ts). No, or a phone that cannot (a
 * browser without push, an iPhone not yet on the home screen — then it is
 * not even asked), and it is not asked again. Either answer is one-time
 * (people.seen), so another phone of the same person is asked afresh.
 */
export function PushAsk({ shop }: { shop: string }) {
  const can = useCanPush();
  const [state, setState] = useState<"ask" | "busy" | "gone">("ask");
  if (!can || state === "gone") return null;

  const done = (how: string) => {
    signal("push", how);
    void markSeen("push");
    setState("gone");
  };
  const yes = async () => {
    setState("busy");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return done("refused");
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(process.env.NEXT_PUBLIC_VAPID_KEY ?? "") }));
      const j = sub.toJSON();
      const ok = j.endpoint && j.keys?.p256dh && j.keys?.auth ? await pushSubscribe(j.endpoint, j.keys.p256dh, j.keys.auth) : false;
      done(ok ? "on" : "failed");
    } catch {
      done("failed");
    }
  };

  return (
    <div className="mt-3 flex shrink-0 items-center gap-3 rounded-[1.375rem] bg-surface p-3.5 shadow-card" role="region" aria-label={t.pushAskTitle}>
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
        <BellRing className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.9688rem] font-bold leading-snug">{t.pushAskTitle}</span>
        <span className="mt-0.5 block text-[0.8125rem] leading-snug text-muted">{fill(t.pushAskBody, { shop })}</span>
        <span className="mt-2 flex gap-1.5">
          <button type="button" disabled={state === "busy"} onClick={() => void yes()} className="press h-9 rounded-full bg-brand px-4 text-[0.875rem] font-bold text-white disabled:opacity-60">
            {state === "busy" ? t.checking : t.pushAskYes}
          </button>
          <button type="button" disabled={state === "busy"} onClick={() => done("later")} className="press h-9 rounded-full px-3 text-[0.875rem] font-semibold text-muted">
            {t.pushAskNo}
          </button>
        </span>
      </span>
    </div>
  );
}
