"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { BarChart3, Building2, FlaskConical, LayoutGrid, Megaphone, Settings2, Users, Wallet } from "lucide-react";

const ITEMS = [
  { href: "/admin", label: "الكونسول", icon: LayoutGrid, exact: true },
  { href: "/admin/shops", label: "المحلات", icon: Building2 },
  { href: "/admin/people", label: "الكونتات", icon: Users },
  { href: "/admin/payments", label: "الخلاص", icon: Wallet },
  { href: "/admin/traffic", label: "الترافيك", icon: BarChart3 },
  { href: "/admin/news", label: "الأخبار", icon: Megaphone },
  { href: "/admin/settings", label: "الريڤلاج", icon: Settings2 },
  { href: "/admin/tester", label: "التجربة", icon: FlaskConical },
];

/** The console's one way around: every place it holds, the one you are in lit up. */
export function ConsoleNav() {
  const path = usePathname();
  const nav = useRef<HTMLElement>(null);

  // on a phone the places lie in a strip that scrolls sideways: bring the lit one into it
  // (sideways only — never moving the page up or down)
  useEffect(() => {
    const on = nav.current?.querySelector<HTMLElement>("[aria-current='page']");
    const strip = nav.current?.closest<HTMLElement>("[data-list]");
    if (!on || !strip || strip.scrollWidth <= strip.clientWidth) return;
    const s = strip.getBoundingClientRect();
    const r = on.getBoundingClientRect();
    const pad = 16;
    if (r.left < s.left) strip.scrollBy({ left: r.left - s.left - pad });
    else if (r.right > s.right) strip.scrollBy({ left: r.right - s.right + pad });
  }, [path]);

  return (
    <nav ref={nav} className="flex gap-1 lg:flex-col">
      {ITEMS.map((x) => {
        const on = x.exact ? path === x.href : path.startsWith(x.href);
        return (
          <Link
            key={x.href}
            href={x.href}
            aria-current={on ? "page" : undefined}
            className={`flex h-10 items-center gap-2.5 whitespace-nowrap rounded-[0.75rem] px-3 text-[0.9062rem] font-semibold transition-colors ${
              on ? "bg-brand text-white" : "text-body hover:bg-canvas hover:text-ink"
            }`}
          >
            <x.icon className="size-[1.125rem] shrink-0" strokeWidth={2.2} />
            {x.label}
          </Link>
        );
      })}
    </nav>
  );
}
