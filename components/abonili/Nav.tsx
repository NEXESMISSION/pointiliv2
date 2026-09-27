"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DoorOpen, Layers, Settings2, Users, Wallet, type LucideIcon } from "lucide-react";
import { useAb } from "./AbProvider";

type Item = { href: string; label: string; icon: LucideIcon; exact?: boolean };

function useItems(): Item[] {
  const { a } = useAb();
  return [
    { href: "/abonili", label: a.nav.door, icon: DoorOpen, exact: true },
    { href: "/abonili/members", label: a.nav.members, icon: Users },
    { href: "/abonili/plans", label: a.nav.plans, icon: Layers },
    { href: "/abonili/money", label: a.nav.money, icon: Wallet },
    { href: "/abonili/settings", label: a.nav.settings, icon: Settings2 },
  ];
}

function isHere(path: string, it: Item) {
  return it.exact ? path === it.href : path === it.href || path.startsWith(`${it.href}/`);
}

/** Desktop: a rail down the side. */
export function RailNav() {
  const path = usePathname();
  return (
    <nav>
      {useItems().map((it) => (
        <Link key={it.href} href={it.href} className="ab-railitem" aria-current={isHere(path, it) ? "page" : undefined}>
          <it.icon aria-hidden />
          {it.label}
        </Link>
      ))}
    </nav>
  );
}

/** Phone: five tabs at the thumb. */
export function TabBar() {
  const path = usePathname();
  return (
    <nav className="ab-tabbar" aria-label="Abonili">
      {useItems().map((it) => (
        <Link key={it.href} href={it.href} className="ab-tab" aria-current={isHere(path, it) ? "page" : undefined}>
          <it.icon aria-hidden />
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
