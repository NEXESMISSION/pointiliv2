"use client";

import type { ReactNode } from "react";
import { ChartColumn, CreditCard, House, Plus, QrCode, Settings, Users } from "lucide-react";
import { BottomNav, CenterAction, SideNav, type NavItem } from "@/components/nav/Nav";
import { useT } from "@/components/i18n/Provider";

export function MerchantSideNav({ header, footer, points }: { header: ReactNode; footer: ReactNode; points?: boolean }) {
  const { t } = useT();
  const items: NavItem[] = [
    { href: "/dashboard", label: t.nav.merchant.home, icon: House, exact: true, fill: true },
    points ? { href: "/points", label: t.points.add, icon: Plus } : { href: "/qr", label: t.nav.merchant.showQr, icon: QrCode },
    { href: "/customers", label: t.nav.merchant.customers, icon: Users },
    { href: "/analytics", label: t.nav.merchant.numbers, icon: ChartColumn },
    { href: "/loyalty", label: t.nav.merchant.card, icon: CreditCard },
    { href: "/settings", label: t.nav.merchant.settings, icon: Settings },
  ];
  return <SideNav items={items} header={header} footer={footer} />;
}

/** Three targets, nothing else: Home, the QR in the middle (a points shop: «زيد نقاط»), the numbers. */
export function MerchantNav({ points }: { points?: boolean }) {
  const { t } = useT();
  return (
    <BottomNav
      items={[
        { href: "/dashboard", label: t.nav.merchant.home, icon: House, exact: true, fill: true },
        { href: "/analytics", label: t.nav.merchant.numbers, icon: ChartColumn },
      ]}
      center={points ? <CenterAction href="/points" label={t.points.add} icon={Plus} /> : <CenterAction href="/qr" label={t.nav.merchant.showQr} icon={QrCode} />}
    />
  );
}
