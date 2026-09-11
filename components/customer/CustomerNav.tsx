"use client";

import Link from "next/link";
import { CreditCard, Gift, House, ScanLine, User } from "lucide-react";
import { BottomNav } from "@/components/nav/Nav";

export function CustomerNav() {
  return (
    <BottomNav
      hideOnDesktop={false}
      items={[
        { href: "/customer", label: "Home", icon: House, exact: true },
        { href: "/customer/cards", label: "Cards", icon: CreditCard },
        { href: "/customer/rewards", label: "Rewards", icon: Gift },
        { href: "/customer/profile", label: "Profile", icon: User },
      ]}
      center={
        <Link href="/customer/scan" aria-label="Scan QR code" className="-mt-4 grid size-14 place-items-center rounded-2xl bg-brand-600 text-white shadow-brand ring-4 ring-white transition active:scale-95">
          <ScanLine className="size-6" />
        </Link>
      }
    />
  );
}
