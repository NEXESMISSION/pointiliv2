"use client";

import Link, { useLinkStatus } from "next/link";
import type { ReactNode } from "react";

/**
 * A link that says it heard you (the founder, 18 Oct 2026: «when i hit on
 * something show the waiting thing… better then multiple click»).
 *
 * Nothing in this app has ever shown a pending state, so a tap on a slow
 * phone looked exactly like a tap that missed, and people tapped again. Here
 * the icon turns into a turning ring the moment the navigation starts, by
 * Next's own `useLinkStatus` — no state of our own to get wrong, and it
 * clears itself when the next screen paints.
 *
 * `prefetch` is on: these are the two or three places a customer ever goes,
 * and the whole point is that arriving is instant and the ring is never seen.
 */
export function Go({ href, icon, children, className = "" }: { href: string; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Link href={href} prefetch className={`press ${className}`}>
      <Inside icon={icon}>{children}</Inside>
    </Link>
  );
}

function Inside({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  const { pending } = useLinkStatus();
  return (
    <>
      {icon && (
        <span className="grid size-5 shrink-0 place-items-center" aria-hidden>
          {pending ? <span className="size-[1.125rem] animate-spin rounded-full border-2 border-current border-t-transparent opacity-80" /> : icon}
        </span>
      )}
      <span className={pending ? "opacity-70" : undefined}>{children}</span>
    </>
  );
}
