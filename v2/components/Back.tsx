import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { t } from "@/lib/t";

/**
 * The way back, the same on every screen: to the screen above this one.
 *
 * It used to go back the way the person came — the browser's own history —
 * which sounds right and is not: `history.length` is above 1 in almost any
 * tab (the page before this app, a redirect through the login, the tab's own
 * blank page), so a press could leave the app, or land back on a page that
 * redirects straight here again. Where a screen sits in the app is known at
 * the time it is written, so it is said: `home` (the founder, 18 Oct 2026:
 * «even the go back button should lead to something good and clean»).
 *
 * A link, not a button: it is pressable before any script has run, the phone
 * can open it in another tab, and the screen above is fetched before the
 * press.
 *
 * The chevron points right because the whole app is right-to-left: in Arabic,
 * back is that way.
 */
export function Back({ home = "/", className = "" }: { home?: string; className?: string }) {
  return (
    <Link
      href={home}
      aria-label={t.back}
      className={`press grid size-11 shrink-0 place-items-center rounded-full bg-surface shadow-card ${className}`}
    >
      <ChevronRight className="size-5" />
    </Link>
  );
}
