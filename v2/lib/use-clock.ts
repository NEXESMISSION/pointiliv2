import { useSyncExternalStore } from "react";

const MINUTE = 60_000;

/**
 * The phone's clock, a minute at a time — null while the server draws the page (a time drawn on both
 * sides never agrees). For a client component that says how long is left (the card's clock): the
 * reading stays the same between two beats, so React never redraws faster than that.
 */
export const useClock = (): number | null =>
  useSyncExternalStore(
    (beat) => {
      const id = setInterval(beat, MINUTE);
      return () => clearInterval(id);
    },
    () => Math.floor(Date.now() / MINUTE) * MINUTE,
    () => null,
  );
