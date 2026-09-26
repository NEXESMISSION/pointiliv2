"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CreditCard, Ellipsis, House, LayoutGrid, QrCode, Settings, Tag, Users } from "lucide-react";
import { BottomNav, SideNav, type NavItem } from "@/components/nav/Nav";
import { useT } from "@/components/i18n/Provider";
import type { SessionContext } from "@/lib/types";

type Systems = SessionContext["systems"];

/**
 * The nav shows the systems this business actually bought, and nothing else: a
 * salle running Abonili never sees the word "tampon", a café running Fidélité
 * never sees "abonnés". Defaults to Fidélité so a business from before Abonili
 * existed is untouched.
 */
function itemsFor(systems: Systems, t: ReturnType<typeof useT>["t"]): NavItem[] {
  const loyalty = systems?.loyalty ?? true;
  const memberships = systems?.memberships ?? false;
  const a = t.merchant.abonili;

  return [
    { href: homeHref(systems), label: t.nav.merchant.home, icon: House, exact: true },
    { href: "/qr", label: t.nav.merchant.showQr, icon: QrCode },
    ...(loyalty
      ? [
          { href: "/customers", label: t.nav.merchant.customers, icon: Users },
          { href: "/loyalty", label: t.nav.merchant.card, icon: CreditCard },
        ]
      : []),
    ...(memberships
      ? [
          { href: "/members", label: a.title, icon: Users },
          { href: "/formules", label: a.plansTitle, icon: Tag },
        ]
      : []),
    // with two systems the lobby is the way across; with one it does not exist
    ...(systems?.both ? [{ href: "/lobby", label: t.merchant.lobby.title, icon: LayoutGrid }] : []),
    { href: "/settings", label: t.nav.merchant.settings, icon: Settings },
  ];
}

/** Abonili alone has no loyalty dashboard to go home to. */
function homeHref(systems: Systems): string {
  return systems?.memberships && !systems?.loyalty ? "/members" : "/dashboard";
}

export function MerchantSideNav({ header, footer, systems }: { header: ReactNode; footer: ReactNode; systems: Systems }) {
  const { t } = useT();
  return <SideNav items={itemsFor(systems, t)} header={header} footer={footer} />;
}

/** Three targets, nothing else: Home, the QR, everything else. */
export function MerchantNav({ systems }: { systems: Systems }) {
  const { t } = useT();
  return (
    <BottomNav
      items={[
        { href: homeHref(systems), label: t.nav.merchant.home, icon: House, exact: true },
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
