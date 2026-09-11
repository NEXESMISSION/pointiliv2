"use client";

import type { ReactNode } from "react";
import { Activity, ChartColumn, CreditCard, Ellipsis, Gift, LayoutDashboard, Printer, QrCode, Receipt, Settings, Ticket, Users } from "lucide-react";
import { BottomNav, SideNav, type NavItem } from "@/components/nav/Nav";

const SIDE: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/qr", label: "Open QR", icon: QrCode },
  { href: "/counter-qr", label: "Counter QR", icon: Printer },
  { href: "/redeem", label: "Redeem reward", icon: Ticket },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/analytics", label: "Analytics", icon: ChartColumn },
  { href: "/loyalty", label: "Loyalty card", icon: CreditCard },
  { href: "/rewards", label: "Rewards", icon: Gift },
  { href: "/billing", label: "Billing", icon: Receipt },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MerchantSideNav({ header, footer }: { header: ReactNode; footer: ReactNode }) {
  return <SideNav items={SIDE} header={header} footer={footer} />;
}

export function MerchantNav() {
  return (
    <BottomNav
      items={[
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/qr", label: "QR", icon: QrCode },
        { href: "/customers", label: "Customers", icon: Users },
        { href: "/more", label: "More", icon: Ellipsis },
      ]}
    />
  );
}
