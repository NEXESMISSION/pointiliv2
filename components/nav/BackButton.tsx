"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { ChevronLeft } from "lucide-react";
import { useT } from "@/components/i18n/Provider";

/**
 * Smart back: returns to the previous screen of THIS app visit, or to the
 * sensible parent when the page was opened directly (link, refresh, QR).
 *
 * The in-app trail lives in sessionStorage. Pages you should never land back on
 * — sign-in screens, a processed scan, the camera — are dropped from the trail
 * as soon as you move on, and home screens start a fresh trail.
 */
const KEY = "pd_trail";
const TRANSIENT = [
  /^\/login$/,
  /^\/register$/,
  /^\/customer\/(login|register|forgot-password|scan)$/,
  /^\/scan\//,
  /^\/join\//,
  /^\/app$/,
  /^\/customer\/rewards\/use\//,
  // the public site: once you are inside the app, "back" must never walk out of it
  /^\/(fr)?$/,
  /^\/(fr\/)?(how-it-works|pricing)$/,
];
/** A screen someone opens the app ON: landing here starts a fresh trail. */
const ROOTS = new Set(["/customer", "/dashboard", "/admin", "/qr"]);

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
  const { t } = useT();
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
      aria-label={t.common.backAria}
      data-back="1"
      className={`grid size-10 shrink-0 place-items-center rounded-full transition-colors active:opacity-70 ${tone === "dark" ? "bg-white/10 text-white backdrop-blur hover:bg-white/20" : "text-ink hover:bg-black/[0.05]"} ${className}`}
    >
      <ChevronLeft className="rtl:-scale-x-100 size-[22px]" strokeWidth={2.2} />
    </button>
  );
}
