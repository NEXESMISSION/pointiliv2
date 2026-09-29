"use client";

import type { ReactNode } from "react";
import { ChartColumn, CreditCard, House, QrCode, Settings, Users } from "lucide-react";
import { BottomNav, CenterAction, SideNav, type NavItem } from "@/components/nav/Nav";
import { useT } from "@/components/i18n/Provider";

export function MerchantSideNav({ header, footer }: { header: ReactNode; footer: ReactNode }) {
  const { t } = useT();
  const items: NavItem[] = [
    { href: "/dashboard", label: t.nav.merchant.home, icon: House, exact: true, fill: true },
    { href: "/qr", label: t.nav.merchant.showQr, icon: QrCode },
    { href: "/customers", label: t.nav.merchant.customers, icon: Users },
    { href: "/analytics", label: t.nav.merchant.numbers, icon: ChartColumn },
    { href: "/loyalty", label: t.nav.merchant.card, icon: CreditCard },
    { href: "/settings", label: t.nav.merchant.settings, icon: Settings },
  ];
  return <SideNav items={items} header={header} footer={footer} />;
}

/** Three targets, nothing else: Home, the QR in the middle, the numbers. */
export function MerchantNav() {
  const { t } = useT();
  return (
    <BottomNav
      items={[
        { href: "/dashboard", label: t.nav.merchant.home, icon: House, exact: true, fill: true },
        { href: "/analytics", label: t.nav.merchant.numbers, icon: ChartColumn },
      ]}
      center={<CenterAction href="/qr" label={t.nav.merchant.showQr} icon={QrCode} />}
    />
  );
}
