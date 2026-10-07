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
export function PushAsk({ shop, title, body, compact }: { shop: string; title?: string; body?: string; compact?: boolean }) {
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
    <div className={`flex shrink-0 items-center gap-3 rounded-[1.375rem] bg-surface shadow-card ${compact ? "mt-2 w-full p-3 text-start" : "mt-3 p-3.5"}`} role="region" aria-label={title ?? t.pushAskTitle}>
      <span className={`grid shrink-0 place-items-center rounded-full bg-brand-soft text-brand ${compact ? "size-9" : "size-11"}`}>
        <BellRing className={compact ? "size-4" : "size-5"} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block font-bold leading-snug ${compact ? "text-[0.875rem]" : "text-[0.9688rem]"}`}>{title ?? t.pushAskTitle}</span>
        <span className={`mt-0.5 block leading-snug text-muted ${compact ? "text-[0.75rem]" : "text-[0.8125rem]"}`}>{body ?? fill(t.pushAskBody, { shop })}</span>
        <span className="mt-2 flex gap-1.5">
          <button type="button" disabled={state === "busy"} onClick={() => void yes()} className={`press rounded-full bg-brand font-bold text-white disabled:opacity-60 ${compact ? "h-8 px-3 text-[0.8125rem]" : "h-9 px-4 text-[0.875rem]"}`}>
            {state === "busy" ? t.checking : t.pushAskYes}
          </button>
          <button type="button" disabled={state === "busy"} onClick={() => done("later")} className={`press rounded-full font-semibold text-muted ${compact ? "h-8 px-2.5 text-[0.8125rem]" : "h-9 px-3 text-[0.875rem]"}`}>
            {t.pushAskNo}
          </button>
        </span>
      </span>
    </div>
  );
}
