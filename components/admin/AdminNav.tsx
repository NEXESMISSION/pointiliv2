"use client";

import type { ReactNode } from "react";
import { Activity, CreditCard, Ellipsis, LayoutDashboard, Receipt, Server, Store, Users } from "lucide-react";
import { BottomNav, SideNav, type NavItem } from "@/components/nav/Nav";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui/Badge";

const side: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/businesses", label: "Businesses", icon: Store },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { href: "/admin/payments", label: "Payments", icon: Receipt },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/activity", label: "Activity", icon: Activity },
  { href: "/admin/system", label: "System", icon: Server },
];

const bottom: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/businesses", label: "Businesses", icon: Store },
  { href: "/admin/subscriptions", label: "Plans", icon: CreditCard },
  { href: "/admin/payments", label: "Payments", icon: Receipt },
  { href: "/admin/more", label: "More", icon: Ellipsis },
];

export function AdminSideNav({ footer }: { footer?: ReactNode }) {
  return (
    <SideNav
      items={side}
      header={
        <div className="flex items-center gap-2">
          <Logo size={28} />
          <Badge tone="brand">Admin</Badge>
        </div>
      }
      footer={footer}
    />
  );
}

export function AdminBottomNav() {
  return <BottomNav items={bottom} />;
}
