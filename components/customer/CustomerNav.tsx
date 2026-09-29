"use client";

import { House, ScanLine, User } from "lucide-react";
import { BottomNav, CenterAction } from "@/components/nav/Nav";
import { useT } from "@/components/i18n/Provider";

/** Home, the scan in the middle, the account. Cards and gifts live on Home. */
export function CustomerNav() {
  const { t } = useT();
  const n = t.nav.customer;
  return (
    <BottomNav
      hideOnDesktop={false}
      items={[
        { href: "/customer", label: n.home, icon: House, exact: true, fill: true },
        { href: "/customer/profile", label: n.profile, icon: User, fill: true },
      ]}
      center={<CenterAction href="/customer/scan" label={n.scanAria} icon={ScanLine} />}
    />
  );
}
