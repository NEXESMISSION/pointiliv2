"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { markSeen } from "@/app/actions";
import { HowClip } from "@/components/HowClip";
import { MorphGround, MorphHead } from "@/components/Morph";
import { useScreen } from "@/components/Tracker";
import { Btn } from "@/components/ui";
import { pixelOnce } from "@/lib/pixel";
import { t } from "@/lib/t";
import { signal } from "@/lib/track";

/** The three steps: all three lit. */
function Bars() {
  return (
    <div className="flex w-full gap-1.5" aria-label="3/3">
      {[1, 2, 3].map((i) => (
        <span key={i} className="h-1.5 flex-1 rounded-full bg-brand" />
      ))}
    </div>
  );
}

/**
 * A new owner's third and last step: how it works, filmed for real in a
 * café, a restaurant and a shop (components/HowClip) — then straight to the
 * shop's own code at the counter, by the button or when the clip ends. The
 * drawn demo of four beats, the night's screen and the counter's tip were
 * the founder's «too many steps» (17 Oct 2026): the card, the clip, the code.
 */
export function FirstLook() {
  const router = useRouter();
  useScreen("start");
  // the card is made: for Facebook's pixel, the owner is in for real — and the counter's welcome
  // (the tip, the bravo) is this clip's, so the counter opens on the code alone, now and later
  useEffect(() => {
    pixelOnce("CardCreated");
    void markSeen("coach").catch(() => {});
  }, []);
  useEffect(() => router.prefetch("/shop/qr"), [router]);
  const gone = useRef(false);
  const go = useCallback(
    (how: string) => {
      if (gone.current) return;
      gone.current = true;
      signal("start_done", how);
      router.push("/shop/qr");
    },
    [router],
  );

  return (
    <main className="safe-t safe-b mx-auto flex h-dvh w-full max-w-md flex-col overflow-x-clip overflow-y-auto px-[clamp(1rem,5vw,1.5rem)]">
      <MorphGround />
      <div className="shrink-0 pt-4 [@media(max-height:520px)]:hidden">
        <Bars />
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center-safe py-[1.6dvh]">
        <MorphHead title={t.clipTitle} sub={t.clipSub} />
        <HowClip className="mt-[1.8dvh] h-[min(62dvh,calc((100vw-2.5rem)*16/9))] shrink-0" onEnd={() => setTimeout(() => go("ended"), 600)} />
      </div>
      <div className="shrink-0 pb-3">
        <Btn type="button" onClick={() => go("button")}>
          {t.clipGo}
        </Btn>
      </div>
    </main>
  );
}
