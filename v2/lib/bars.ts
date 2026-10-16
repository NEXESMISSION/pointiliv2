"use client";

import { useEffect } from "react";

/** two colours `#rrggbb` mixed, `a`'s share from 0 to 1 (enough for the phone's bars) */
export function mix(a: string, b: string, share: number): string {
  const rgb = (h: string) => {
    const x = h.replace("#", "");
    const v = x.length === 3 ? x.replace(/./g, "$&$&") : x.slice(0, 6);
    return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) || 0);
  };
  const [p, q] = [rgb(a), rgb(b)];
  return `#${p.map((c, i) => Math.round(c * share + q[i]! * (1 - share)).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * The phone's own bars, over a screen of its own colour. On the app added to
 * the home screen, the bar at the top (the clock, the battery) and, on an
 * Android, the one at the bottom take the page's theme colour: the light grey
 * of every page. Over the counter's colour or the camera's black they stood
 * as two grey bands, above and under the screen. While a screen like that is
 * up, the bars take its colours (`top` for the status bar, `bottom` for what
 * shows under the page), and the grey comes back when it closes. `null`: as
 * the page is.
 */
export function useBars(top: string | null, bottom: string | null = top) {
  useEffect(() => {
    if (!top) return;
    const metas = [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')];
    const made = metas.length ? null : Object.assign(document.createElement("meta"), { name: "theme-color" });
    if (made) document.head.append(made);
    const all = made ? [made] : metas;
    const before = all.map((m) => m.content);
    all.forEach((m) => (m.content = top));
    const html = document.documentElement;
    const was = html.style.backgroundColor;
    if (bottom) html.style.backgroundColor = bottom;
    return () => {
      all.forEach((m, i) => (m.content = before[i] ?? ""));
      made?.remove();
      html.style.backgroundColor = was;
    };
  }, [top, bottom]);
}
