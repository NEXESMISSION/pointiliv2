"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CreditCard, Ellipsis, House, LayoutGrid, QrCode, Settings, Tag, Users } from "lucide-react";
import { BottomNav, SideNav, type NavItem } from "@/components/nav/Nav";
import { useT } from "@/components/i18n/Provider";
import { systemHome, type SystemKey } from "@/lib/systems";
import type { SessionContext } from "@/lib/types";

type Systems = SessionContext["systems"];

/**
 * ONE SYSTEM'S MENU, NEVER BOTH.
 *
 * A shop can own Fidélité and Abonili at once, but nobody works in two at the
 * same moment: the owner came through one door in the lobby, and the shell
 * stays that door's until he goes back and picks the other. Mixing them gave a
 * gym owner "كارط الفيدليتي" in his sidebar, which is the complaint this is
 * built around.
 *
 * `system` is the door (proxy.ts remembers it). With only one system bought
 * there is no door to remember, so it falls back to whichever they own.
 */
function activeSystem(systems: Systems, system: SystemKey | null): SystemKey {
  if (system) return system;
  return systems?.memberships && !systems?.loyalty ? "abonili" : "fidelite";
}

function itemsFor(systems: Systems, system: SystemKey | null, t: ReturnType<typeof useT>["t"]): NavItem[] {
  const active = activeSystem(systems, system);
  const a = t.merchant.abonili;

  const own =
    active === "abonili"
      ? [
          { href: "/members", label: a.title, icon: Users, exact: true },
          { href: "/qr", label: t.nav.merchant.showQr, icon: QrCode },
          { href: "/formules", label: a.plansTitle, icon: Tag },
        ]
      : [
          { href: "/dashboard", label: t.nav.merchant.home, icon: House, exact: true },
          { href: "/qr", label: t.nav.merchant.showQr, icon: QrCode },
          { href: "/customers", label: t.nav.merchant.customers, icon: Users },
          { href: "/loyalty", label: t.nav.merchant.card, icon: CreditCard },
        ];

  return [
    ...own,
    // the way back across, and only when there is another side to cross to
    ...(systems?.both ? [{ href: "/lobby", label: t.merchant.lobby.switch, icon: LayoutGrid }] : []),
    { href: "/settings", label: t.nav.merchant.settings, icon: Settings },
  ];
}

export function MerchantSideNav({ header, footer, systems, system }: { header: ReactNode; footer: ReactNode; systems: Systems; system: SystemKey | null }) {
  const { t } = useT();
  return <SideNav items={itemsFor(systems, system, t)} header={header} footer={footer} />;
}

/** Three targets, nothing else: Home, the QR, everything else. */
export function MerchantNav({ systems, system }: { systems: Systems; system: SystemKey | null }) {
  const { t } = useT();
  const active = activeSystem(systems, system);
  return (
    <BottomNav
      items={[
        { href: systemHome(active), label: active === "abonili" ? t.merchant.abonili.title : t.nav.merchant.home, icon: House, exact: true },
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
