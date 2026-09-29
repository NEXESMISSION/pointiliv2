"use client";

import type { ReactNode } from "react";
import { Activity, ChartLine, CreditCard, House, Plus, Server, Store, Users, Wallet } from "lucide-react";
import { BottomNav, CenterAction, SideNav, type NavItem } from "@/components/nav/Nav";
import { useT } from "@/components/i18n/Provider";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui/Badge";

export function AdminSideNav({ footer }: { footer?: ReactNode }) {
  const { t } = useT();
  const n = t.nav.admin;
  const side: NavItem[] = [
    { href: "/admin", label: n.home, icon: House, exact: true, fill: true },
    { href: "/admin/businesses", label: n.businesses, icon: Store, fill: true },
    { href: "/admin/subscriptions", label: t.admin.subscriptions.title, icon: CreditCard },
    { href: "/admin/customers", label: n.customers, icon: Users },
    { href: "/admin/activity", label: n.activity, icon: Activity },
    { href: "/admin/traffic", label: n.traffic, icon: ChartLine },
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

/** Home, the shops, a new shop in the middle, the money, the traffic. */
export function AdminBottomNav() {
  const { t } = useT();
  const n = t.nav.admin;
  const bottom: NavItem[] = [
    { href: "/admin", label: n.home, icon: House, exact: true, fill: true },
    { href: "/admin/businesses", label: n.businesses, icon: Store, fill: true },
    { href: "/admin/subscriptions", label: n.money, icon: Wallet, fill: true },
    { href: "/admin/traffic", label: n.traffic, icon: ChartLine },
  ];
  return <BottomNav items={bottom} center={<CenterAction href="/admin/businesses/new" label={n.newShop} icon={Plus} />} />;
}
