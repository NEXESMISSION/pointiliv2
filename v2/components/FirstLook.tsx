"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { HowStory } from "@/components/HowClip";
import { useScreen } from "@/components/Tracker";
import { seenBefore } from "@/lib/once";
import { pixelOnce } from "@/lib/pixel";
import { t } from "@/lib/t";
import { signal } from "@/lib/track";

/**
 * A new owner's third and last step: how it works, filmed for real, as three
 * slides to swipe (components/HowClip) — then the shop's own code at the
 * counter, where one short note says it is theirs and why it keeps changing
 * (?tip=1). Out before the end only by «تخطّى». The drawn demo of four beats
 * and the night's screen were the founder's «too many steps» (17 Oct 2026).
 */
export function FirstLook({ shop }: { shop: string }) {
  const router = useRouter();
  useScreen("start");
  // back here from the code (the phone's back button brings this page back as it was): home instead. A fresh
  // load is the server's to decide (app/shop/start), so only a page this phone already woke up on bounces
  useEffect(() => {
    if (seenBefore("coach", shop)) router.replace("/shop");
  }, [router, shop]);
  // the card is made: for Facebook's pixel, the owner is in for real
  useEffect(() => pixelOnce("CardCreated"), []);
  useEffect(() => router.prefetch("/shop/qr?tip=1"), [router]);
  const gone = useRef(false);
  const go = useCallback(
    (how: string) => {
      if (gone.current) return;
      gone.current = true;
      signal("start_done", how);
      router.push("/shop/qr?tip=1");
    },
    [router],
  );
  return <HowStory onDone={go} done={t.clipGo} skip={t.clipSkip} />;
}
