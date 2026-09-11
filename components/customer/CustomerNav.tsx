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
        <Link
          href="/customer/scan"
          aria-label="Scan QR code"
          className="-mt-5 grid size-15 place-items-center rounded-full bg-brand-600 text-white shadow-brand ring-4 ring-white transition active:scale-95"
        >
          <ScanLine className="size-7" />
        </Link>
      }
    />
  );
}
