import { Bell } from "lucide-react";
import Link from "@/components/Link";
import { B } from "@/lib/bell";

/**
 * 🔔 at the top of the owner's pages (13 Nov 2026): the founder's news, kept (/shop/inbox). The count
 * of what is not read yet sits on it in coral, and the bell rings twice a moment after the page — once
 * read, it is a quiet white button like the help beside it.
 */
export function OwnerBell({ unread }: { unread: number }) {
  const n = Math.max(0, unread | 0);
  return (
    <Link
      href="/shop/inbox"
      aria-label={n ? `${B.aria} · ${n}` : B.aria}
      className="press relative grid size-11 shrink-0 place-items-center rounded-full bg-surface shadow-card"
    >
      <Bell className={`size-5 text-brand ${n ? "bell-ring" : ""}`} strokeWidth={2.2} />
      {n > 0 && (
        <span
          className="num absolute -end-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-coral px-1 text-[0.6875rem] font-bold leading-none text-white ring-2 ring-canvas"
          style={{ animation: "bell-badge 420ms cubic-bezier(0.2,0.9,0.3,1.3) 0.5s both" }}
          aria-hidden
        >
          {n > 9 ? "9+" : n}
        </span>
      )}
    </Link>
  );
}
