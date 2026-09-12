"use client";

import Link from "next/link";
import { CreditCard, Gift, House, ScanLine, User } from "lucide-react";
import { BottomNav } from "@/components/nav/Nav";
import { useT } from "@/components/i18n/Provider";

export function CustomerNav() {
  const { t } = useT();
  const n = t.nav.customer;
  return (
    <BottomNav
      hideOnDesktop={false}
      items={[
        { href: "/customer", label: n.home, icon: House, exact: true },
        { href: "/customer/cards", label: n.cards, icon: CreditCard },
        { href: "/customer/rewards", label: n.rewards, icon: Gift },
        { href: "/customer/profile", label: n.profile, icon: User },
      ]}
      center={
        <Link href="/customer/scan" aria-label={n.scanAria} className="-mt-4 grid size-14 place-items-center rounded-2xl bg-brand-600 text-white shadow-brand ring-4 ring-white transition active:scale-95">
          <ScanLine className="size-6" />
        </Link>
      }
    />
  );
}
