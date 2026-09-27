"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CreditCard, Ellipsis, House, QrCode, Settings, Users } from "lucide-react";
import { BottomNav, SideNav, type NavItem } from "@/components/nav/Nav";
import { useT } from "@/components/i18n/Provider";

export function MerchantSideNav({ header, footer }: { header: ReactNode; footer: ReactNode }) {
  const { t } = useT();
  const items: NavItem[] = [
    { href: "/dashboard", label: t.nav.merchant.home, icon: House, exact: true },
    { href: "/qr", label: t.nav.merchant.showQr, icon: QrCode },
    { href: "/customers", label: t.nav.merchant.customers, icon: Users },
    { href: "/loyalty", label: t.nav.merchant.card, icon: CreditCard },
    { href: "/settings", label: t.nav.merchant.settings, icon: Settings },
  ];
  return <SideNav items={items} header={header} footer={footer} />;
}

/** Three targets, nothing else: Home, the QR, everything else. */
export function MerchantNav() {
  const { t } = useT();
  return (
    <BottomNav
      items={[
        { href: "/dashboard", label: t.nav.merchant.home, icon: House, exact: true },
        { href: "/more", label: t.nav.merchant.more, icon: Ellipsis },
      ]}
      center={
        <Link href="/qr" aria-label={t.nav.merchant.showQr} className="-mt-4 grid size-14 place-items-center rounded-2xl bg-brand-600 text-white shadow-brand ring-4 ring-white transition active:scale-95">
          <QrCode className="size-6" />
        </Link>
      }
    />
  );
}
