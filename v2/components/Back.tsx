"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { t } from "@/lib/t";

/**
 * The way back, the same on every screen.
 *
 * It goes back the way the person came — the browser's own history — which is
 * what a back button is for. When there is no history (the page was opened
 * from a camera, a message or a search result) it falls back to a sensible
 * home instead of leaving a dead button on the screen.
 *
 * The chevron points right because the whole app is right-to-left: in Arabic,
 * back is that way.
 */
export function Back({ home = "/", className = "" }: { home?: string; className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label={t.back}
      onClick={() => (typeof window !== "undefined" && window.history.length > 1 ? router.back() : router.push(home))}
      className={`press grid size-11 shrink-0 place-items-center rounded-full bg-surface shadow-card ${className}`}
    >
      <ChevronRight className="size-5" />
    </button>
  );
}
