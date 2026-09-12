"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Activity, CreditCard, Ellipsis, House, Printer, QrCode, Receipt, Settings, Users } from "lucide-react";
import { BottomNav, SideNav, type NavItem } from "@/components/nav/Nav";

const SIDE: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: House, exact: true },
  { href: "/qr", label: "Show QR", icon: QrCode },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/loyalty", label: "Loyalty card", icon: CreditCard },
  { href: "/counter-qr", label: "Counter QR", icon: Printer },
  { href: "/billing", label: "Billing", icon: Receipt },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MerchantSideNav({ header, footer }: { header: ReactNode; footer: ReactNode }) {
  return <SideNav items={SIDE} header={header} footer={footer} />;
}

/** Three targets, nothing else: Home, the QR, everything else. */
export function MerchantNav() {
  return (
    <BottomNav
      items={[
        { href: "/dashboard", label: "Home", icon: House, exact: true },
        { href: "/more", label: "More", icon: Ellipsis },
      ]}
      center={
        <Link href="/qr" aria-label="Show QR" className="-mt-4 grid size-14 place-items-center rounded-2xl bg-brand-600 text-white shadow-brand ring-4 ring-white transition active:scale-95">
          <QrCode className="size-6" />
        </Link>
      }
    />
  );
}
