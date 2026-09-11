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
        className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 pt-1 text-[11px] font-medium transition-colors ${active ? "text-brand-600" : "text-muted hover:text-ink"}`}
        aria-current={active ? "page" : undefined}
      >
        <Icon className="size-[22px]" strokeWidth={active ? 2.3 : 1.8} />
        <span className="max-w-full truncate">{item.label}</span>
        {!!item.badge && <span className="absolute right-[calc(50%-1.25rem)] top-0.5 grid min-w-4 place-items-center rounded-full bg-danger-500 px-1 text-[10px] leading-4 text-white">{item.badge}</span>}
      </Link>
    );
  };
  return (
    <nav className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-safe backdrop-blur print:hidden ${hideOnDesktop ? "lg:hidden" : ""}`} aria-label="Main">
      <div className="mx-auto flex h-16 max-w-md items-stretch px-2">
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
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-white lg:flex print:!hidden">
      <div className="px-4 pb-4 pt-5">{header}</div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3" aria-label="Main">
        {items.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors ${active ? "bg-canvas text-ink" : "text-muted hover:bg-canvas/70 hover:text-ink"}`}
            >
              <Icon className={`size-[18px] ${active ? "text-brand-600" : ""}`} />
              <span className="flex-1">{item.label}</span>
              {!!item.badge && <span className="grid min-w-5 place-items-center rounded-full bg-danger-500 px-1.5 text-xs leading-5 text-white">{item.badge}</span>}
            </Link>
          );
        })}
      </nav>
      {footer && <div className="border-t border-line p-3">{footer}</div>}
    </aside>
  );
}
