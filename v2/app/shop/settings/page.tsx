import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, LogOut, QrCode } from "lucide-react";
import { logout } from "@/app/actions";
import { Pass } from "@/components/Pass";
import { Top } from "@/components/Top";
import { Icon3D, LinkBtn, Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { call } from "@/lib/supabase";
import { kindIcon, t } from "@/lib/t";

export const metadata = { title: "المحل" };

/** Everything an owner may need besides the counter: three numbers, three links, the way out. */
export default async function ShopSettings() {
  const me = await getMe();
  if (!me?.shop) redirect("/shop/new");
  const n = await call<{ customers: number; today: number; gifts: number }>("shop_numbers");
  const tiles = [
    { icon: "people", value: n?.customers ?? 0, label: t.numCustomers },
    { icon: "fire", value: n?.today ?? 0, label: t.numToday },
    { icon: "gift", value: n?.gifts ?? 0, label: t.numGifts },
  ];
  const links = [
    { href: "/shop/card", icon: "ticket", label: t.editCard },
    { href: "/shop/setup?edit=1", icon: kindIcon(me.shop.kind), label: t.editShop },
    { href: "/me", icon: "wave", label: t.account },
  ];

  return (
    <Screen>
      <Top back="/shop" title={me.shop.name} />
      <div className="mt-5">
        <Pass shop={me.shop} stamps={0} small />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {tiles.map((x) => (
          <div key={x.label} className="rounded-[22px] bg-surface px-2 py-3.5 text-center shadow-card">
            <Icon3D name={x.icon} size={30} className="mx-auto" />
            <p className="num mt-1 text-[24px] font-bold leading-tight">{x.value}</p>
            <p className="truncate text-[12.5px] text-muted">{x.label}</p>
          </div>
        ))}
      </div>

      <ul className="mt-4 divide-y divide-line overflow-hidden rounded-[22px] bg-surface shadow-card">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-canvas/60">
              <span className="grid size-10 place-items-center rounded-[13px] bg-canvas">
                <Icon3D name={l.icon} size={24} />
              </span>
              <span className="flex-1 text-[16px] font-semibold">{l.label}</span>
              <ChevronLeft className="size-5 text-faint" />
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-auto space-y-3 pt-8">
        <LinkBtn href="/shop">
          <QrCode className="size-5" /> {t.openCounter}
        </LinkBtn>
        <form action={logout}>
          <button type="submit" className="press flex h-[50px] w-full items-center justify-center gap-2 text-[16px] font-semibold text-coral">
            <LogOut className="size-5" /> {t.logout}
          </button>
        </form>
      </div>
    </Screen>
  );
}
