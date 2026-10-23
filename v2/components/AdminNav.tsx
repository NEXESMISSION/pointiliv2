"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "المحلات" },
  { href: "/admin/subs", label: "الأبونمان" },
];

/** The console's two places, in its top bar: the shops, and their subscriptions. The one open is dark. */
export function AdminNav() {
  const path = usePathname();
  return (
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
  );
}
