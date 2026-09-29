"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useT } from "@/components/i18n/Provider";

/** `fill`: the icon is drawn filled when its tab is on (a house, a person, a shop). */
export type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean; badge?: number; fill?: boolean };

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

/** The big round action in the middle of the tab bar: scan, show the QR, open a shop. */
export function CenterAction({ href, label, icon: Icon }: { href: string; label: string; icon: LucideIcon }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="press grid size-16 place-items-center rounded-[22px] bg-[linear-gradient(150deg,var(--color-brand-400),var(--color-brand-600)_55%,var(--color-brand-800))] text-white shadow-[0_12px_24px_-8px_var(--color-brand-600),inset_0_1px_0_rgb(255_255_255/0.35)]"
    >
      <Icon className="size-[30px]" strokeWidth={2.2} />
    </Link>
  );
}

/** The floating glass tab bar, the way a phone app has it (hidden from lg up when a sidebar exists). */
export function BottomNav({ items, center, hideOnDesktop = true }: { items: NavItem[]; center?: ReactNode; hideOnDesktop?: boolean }) {
  const pathname = usePathname();
  const { t } = useT();
  const half = Math.ceil(items.length / 2);
  const render = (item: NavItem) => {
    const active = isActive(pathname, item);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`press relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11.5px] font-medium transition-colors ${active ? "text-brand-600" : "text-faint hover:text-muted"}`}
        aria-current={active ? "page" : undefined}
      >
        <Icon className="size-[25px]" strokeWidth={active ? 2.1 : 1.8} fill={active && item.fill ? "currentColor" : "none"} />
        <span className="max-w-full truncate">{item.label}</span>
        {!!item.badge && <span className="absolute end-[calc(50%-1.4rem)] top-0 grid min-w-4 place-items-center rounded-full bg-coral-500 px-1 text-[10px] leading-4 text-white">{item.badge}</span>}
      </Link>
    );
  };
  return (
    <nav className={`pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3.5 pb-[calc(0.9rem+env(safe-area-inset-bottom))] print:hidden ${hideOnDesktop ? "lg:hidden" : ""}`} aria-label={t.nav.mainAria}>
      <div className="glass pointer-events-auto mx-auto flex h-[72px] max-w-md items-center rounded-[28px] px-1.5 shadow-[0_10px_30px_-8px_rgb(20_10_60/0.25),inset_0_0_0_1px_rgb(255_255_255/0.6)]">
        {center ? (
          <>
            {items.slice(0, half).map(render)}
            <div className="flex shrink-0 justify-center px-2">{center}</div>
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
  const { t } = useT();
  return (
    <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 flex-col bg-surface shadow-[1px_0_0_var(--color-line)] lg:flex print:!hidden">
      <div className="px-5 pb-5 pt-6">{header}</div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3" aria-label={t.nav.mainAria}>
        {items.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex h-11 items-center gap-3 rounded-2xl px-3 text-[15px] font-medium transition-colors ${active ? "bg-brand-100 text-brand-700" : "text-muted hover:bg-surface-2 hover:text-ink"}`}
            >
              <Icon className="size-5" strokeWidth={active ? 2.1 : 1.8} fill={active && item.fill ? "currentColor" : "none"} />
              <span className="flex-1">{item.label}</span>
              {!!item.badge && <span className="grid min-w-5 place-items-center rounded-full bg-coral-500 px-1.5 text-xs leading-5 text-white">{item.badge}</span>}
            </Link>
          );
        })}
      </nav>
      {footer && <div className="p-3 shadow-[0_-1px_0_var(--color-line)]">{footer}</div>}
    </aside>
  );
}
