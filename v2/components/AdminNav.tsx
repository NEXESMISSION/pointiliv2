"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Settings } from "lucide-react";

const TABS = [
  { href: "/admin", label: "المحلات" },
  { href: "/admin/subs", label: "الأبونمان" },
  { href: "/admin/stats", label: "الأرقام" },
];

/** How wide a console page is: a shop's whole page is read on a computer and takes the screen; the rest is a phone's column. */
export const wideAt = (path: string) => path.startsWith("/admin/shop/");

/**
 * The console's top bar: the mark, its three places (the shops, their
 * subscriptions, the numbers — the one open is dark), the tools (⚙) and the
 * way back to the app. As wide as the page under it.
 */
export function AdminNav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-line/80 bg-surface/95 backdrop-blur">
      <nav className={`mx-auto flex h-14 items-center gap-2 px-4 ${wideAt(path) ? "max-w-[92rem]" : "max-w-[46rem]"}`}>
        <Link href="/admin" aria-label="Pointili admin" className="flex shrink-0 items-center gap-2" dir="ltr">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand-mark.svg" alt="" width={28} height={20} style={{ width: "1.75rem", height: "1.25rem" }} />
          <span className="hidden text-[1.0625rem] font-bold text-ink sm:inline">Pointili</span>
        </Link>
        <span className="flex items-center gap-1">
          {TABS.map((tab) => {
            const on = path === tab.href;
            return (
              <Link key={tab.href} href={tab.href} aria-current={on ? "page" : undefined} className={`flex h-9 items-center rounded-full px-3.5 text-[0.875rem] font-semibold transition-colors ${on ? "bg-ink text-white" : "text-body hover:bg-canvas"}`}>
                {tab.label}
              </Link>
            );
          })}
        </span>
        <Link href="/admin/tools" aria-label="الأدوات" className="ms-auto grid size-10 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-canvas hover:text-ink">
          <Settings className="size-5" />
        </Link>
        <Link href="/" aria-label="ارجع للأبليكاسيون" className="grid size-10 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-canvas hover:text-ink">
          <ArrowUpRight className="size-5" />
        </Link>
      </nav>
    </header>
  );
}

/** The page's own column, as wide as the bar above it. */
export function AdminMain({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return <main className={`mx-auto px-4 pb-16 pt-4 ${wideAt(path) ? "max-w-[92rem] lg:px-6" : "max-w-[46rem]"}`}>{children}</main>;
}
