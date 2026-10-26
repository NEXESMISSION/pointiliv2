"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { tuneIn } from "@/lib/radio";

/**
 * The page keeps itself: nobody pulls it down to see a tampon land (the
 * founder, 18 Oct 2026: «i dont need to refresh to see updates»).
 *
 * Two ways, because one of them always fails somewhere:
 *  - the radio: the database pings «pointili:p:<the person>» on every moment
 *    of theirs, and the page asks the server again at once. That is the one
 *    that matters — their phone is open on the counter while the shop scans.
 *  - coming back to the tab: a phone that slept, a socket that died quietly, a
 *    browser that froze the page in the background. Looking again on return
 *    costs one request and covers every case the radio misses.
 *
 * A refresh is never asked for twice within a second, so a shop scanning three
 * things in a row does not make three round trips.
 */
export function Live({ me }: { me: string }) {
  const router = useRouter();
  const last = useRef(0);

  useEffect(() => {
    const look = () => {
      const now = Date.now();
      if (now - last.current < 1000) return;
      last.current = now;
      router.refresh();
    };

    // the radio's library comes after the page (lib/radio): the channel opens when it is here
    let gone = false;
    let stop: (() => void) | null = null;
    void tuneIn().then((sb) => {
      if (gone || !sb) return;
      const channel = sb.channel(`pointili:p:${me}`).on("broadcast", { event: "ping" }, look).subscribe();
      stop = () => void sb.removeChannel(channel);
    });

    const awake = () => document.visibilityState === "visible" && look();
    document.addEventListener("visibilitychange", awake);
    window.addEventListener("focus", awake);
    return () => {
      gone = true;
      document.removeEventListener("visibilitychange", awake);
      window.removeEventListener("focus", awake);
      stop?.();
    };
  }, [me, router]);

  return null;
}
