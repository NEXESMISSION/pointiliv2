"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { ChevronLeft } from "lucide-react";

/**
 * Smart back: returns to the previous screen of THIS app visit, or to the
 * sensible parent when the page was opened directly (link, refresh, QR).
 *
 * The in-app trail lives in sessionStorage. Pages you should never land back on
 * — sign-in screens, a processed scan, the camera — are dropped from the trail
 * as soon as you move on, and home screens start a fresh trail.
 */
const KEY = "pd_trail";
const TRANSIENT = [/^\/login$/, /^\/register$/, /^\/customer\/(login|register|forgot-password|scan)$/, /^\/scan\//, /^\/app$/, /^\/customer\/rewards\/use\//];
const ROOTS = new Set(["/customer", "/dashboard", "/admin"]);

function read(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(trail: string[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(trail.slice(-40)));
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new Event("pd-trail"));
}

/** Mounted once in the root layout. */
export function NavTracker() {
  const pathname = usePathname();
  useEffect(() => {
    let trail = read();
    if (trail[trail.length - 1] === pathname) return;
    if (ROOTS.has(pathname)) trail = [pathname];
    else if (trail[trail.length - 2] === pathname) trail.pop();
    else {
      while (trail.length && TRANSIENT.some((re) => re.test(trail[trail.length - 1]!))) trail.pop();
      trail.push(pathname);
    }
    write(trail);
  }, [pathname]);
  return null;
}

function subscribe(cb: () => void) {
  window.addEventListener("pd-trail", cb);
  return () => window.removeEventListener("pd-trail", cb);
}

export function BackButton({ fallback, tone = "light", className = "" }: { fallback?: string; tone?: "light" | "dark"; className?: string }) {
  const router = useRouter();
  const canGoBack = useSyncExternalStore(subscribe, () => read().length > 1, () => false);
  if (!canGoBack && !fallback) return null;

  return (
    <button
      type="button"
      onClick={() => {
        const trail = read();
        if (trail.length > 1) {
          trail.pop();
          write(trail);
          router.push(trail[trail.length - 1]!);
        } else if (fallback) {
          router.push(fallback);
        }
      }}
      aria-label="Go back"
      className={`grid size-10 shrink-0 place-items-center rounded-full transition active:scale-95 ${tone === "dark" ? "bg-white/10 text-white backdrop-blur hover:bg-white/20" : "bg-white text-ink shadow-card hover:bg-canvas"} ${className}`}
    >
      <ChevronLeft className="size-6" />
    </button>
  );
}
