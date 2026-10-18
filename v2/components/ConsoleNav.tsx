"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useRef } from "react";
import { BarChart3, Banknote, Building2, FlaskConical, LayoutGrid, Megaphone, PhoneCall, Settings2, ShieldCheck, Users, type LucideIcon } from "lucide-react";

type Place = { href: string; label: string; icon: LucideIcon; exact?: boolean };

/**
 * The console's places, in plain Tunisian (18 Oct 2026: the founder found the
 * old names — «الكونسول», «الترافيك», «الريڤلاج» — hard to read), in four
 * groups: the start; the people (shops, the follow-up, the accounts); the
 * money and the visits; and the platform itself.
 */
const GROUPS: Place[][] = [
  [{ href: "/admin", label: "الرئيسية", icon: LayoutGrid, exact: true }],
  [
    { href: "/admin/shops", label: "المحلات", icon: Building2 },
    { href: "/admin/crm", label: "المتابعة", icon: PhoneCall },
    { href: "/admin/people", label: "الكونتات", icon: Users },
  ],
  [
    { href: "/admin/payments", label: "الفلوس", icon: Banknote },
    { href: "/admin/traffic", label: "الزيارات", icon: BarChart3 },
  ],
  [
    { href: "/admin/news", label: "الأخبار", icon: Megaphone },
    { href: "/admin/security", label: "الحماية", icon: ShieldCheck },
    { href: "/admin/settings", label: "الإعدادات", icon: Settings2 },
    { href: "/admin/tester", label: "حساب التجربة", icon: FlaskConical },
  ],
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
      {GROUPS.map((group, g) => (
        <Fragment key={g}>
          {/* a hairline between the groups, on the rail only */}
          {g > 0 && <span className="mx-3 my-2 hidden h-px bg-line lg:block" aria-hidden />}
          {group.map((x) => {
            const on = x.exact ? path === x.href : path.startsWith(x.href);
            return (
              <Link
                key={x.href}
                href={x.href}
                aria-current={on ? "page" : undefined}
                className={`flex h-10 items-center gap-3 whitespace-nowrap rounded-[0.75rem] px-3 text-[0.9375rem] transition-colors ${
                  on ? "bg-brand-soft font-bold text-brand" : "font-semibold text-body hover:bg-canvas hover:text-ink"
                }`}
              >
                <x.icon className={`size-[1.125rem] shrink-0 ${on ? "text-brand" : "text-muted"}`} strokeWidth={2.2} />
                {x.label}
              </Link>
            );
          })}
        </Fragment>
      ))}
    </nav>
  );
}
