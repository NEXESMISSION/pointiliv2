"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean; badge?: number };

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

/** Mobile bottom navigation (hidden from lg up when a sidebar exists). */
export function BottomNav({ items, center, hideOnDesktop = true }: { items: NavItem[]; center?: ReactNode; hideOnDesktop?: boolean }) {
  const pathname = usePathname();
  const half = Math.ceil(items.length / 2);
  const render = (item: NavItem) => {
    const active = isActive(pathname, item);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-xs font-semibold transition ${active ? "text-brand-700" : "text-body hover:text-ink"}`}
        aria-current={active ? "page" : undefined}
      >
        <span className={`grid h-8 w-14 place-items-center rounded-full transition ${active ? "bg-brand-100" : ""}`}>
          <Icon className="size-[22px]" strokeWidth={active ? 2.5 : 2} />
        </span>
        <span className="max-w-full truncate">{item.label}</span>
        {!!item.badge && <span className="absolute right-[calc(50%-1.4rem)] top-1 grid min-w-4.5 place-items-center rounded-full bg-danger-500 px-1 text-[10px] leading-4.5 text-white">{item.badge}</span>}
      </Link>
    );
  };
  return (
    <nav
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white pb-safe shadow-[0_-6px_24px_-8px_rgb(16_24_40/0.12)] ${hideOnDesktop ? "lg:hidden" : ""}`}
      aria-label="Main"
    >
      <div className="mx-auto flex h-17 max-w-lg items-stretch px-1">
        {center ? (
          <>
            {items.slice(0, half).map(render)}
            <div className="flex flex-1 items-start justify-center">{center}</div>
            {items.slice(half).map(render)}
          </>
        ) : (
          items.map(render)
        )}
      </div>
    </nav>
  );
}

/** Desktop sidebar. */
export function SideNav({ items, header, footer }: { items: NavItem[]; header?: ReactNode; footer?: ReactNode }) {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line/80 bg-white lg:flex">
      <div className="px-5 pb-4 pt-6">{header}</div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3" aria-label="Main">
        {items.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex h-11 items-center gap-3 rounded-2xl px-3 text-[15px] font-medium transition ${active ? "bg-brand-50 text-brand-700" : "text-body hover:bg-canvas"}`}
            >
              <Icon className="size-5" />
              <span className="flex-1">{item.label}</span>
              {!!item.badge && <span className="grid min-w-5 place-items-center rounded-full bg-danger-500 px-1.5 text-xs leading-5 text-white">{item.badge}</span>}
            </Link>
          );
        })}
      </nav>
      {footer && <div className="border-t border-line/80 p-3">{footer}</div>}
    </aside>
  );
}
