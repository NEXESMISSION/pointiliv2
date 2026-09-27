"use client";

import type { ReactNode } from "react";
import { Activity, CreditCard, Ellipsis, LayoutDashboard, Receipt, Server, Store, Users } from "lucide-react";
import { BottomNav, SideNav, type NavItem } from "@/components/nav/Nav";
import { useT } from "@/components/i18n/Provider";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui/Badge";

export function AdminSideNav({ footer }: { footer?: ReactNode }) {
  const { t } = useT();
  const n = t.nav.admin;
  const side: NavItem[] = [
    { href: "/admin", label: n.dashboard, icon: LayoutDashboard, exact: true },
    { href: "/admin/businesses", label: n.businesses, icon: Store },
    { href: "/admin/subscriptions", label: t.admin.subscriptions.title, icon: CreditCard },
    { href: "/admin/payments", label: n.payments, icon: Receipt },
    { href: "/admin/customers", label: n.customers, icon: Users },
    { href: "/admin/activity", label: n.activity, icon: Activity },
    { href: "/admin/system", label: n.system, icon: Server },
  ];

  return (
    <SideNav
      items={side}
      header={
        <div className="flex items-center gap-2">
          <Logo size={28} />
          <Badge tone="brand">{t.admin.badge}</Badge>
        </div>
      }
      footer={footer}
    />
  );
}

export function AdminBottomNav() {
  const { t } = useT();
  const n = t.nav.admin;
  const bottom: NavItem[] = [
    { href: "/admin", label: n.dashboard, icon: LayoutDashboard, exact: true },
    { href: "/admin/businesses", label: n.businesses, icon: Store },
    { href: "/admin/subscriptions", label: n.plans, icon: CreditCard },
    { href: "/admin/payments", label: n.payments, icon: Receipt },
    { href: "/admin/more", label: n.more, icon: Ellipsis },
  ];
  return <BottomNav items={bottom} />;
}
