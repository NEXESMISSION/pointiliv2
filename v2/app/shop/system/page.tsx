import { redirect } from "next/navigation";
import { SystemBoard } from "@/components/SystemBoard";
import { Screen } from "@/components/ui";
import { onPack, P, type ShopSystems } from "@/lib/packs";
import { getMe } from "@/lib/session";
import { call } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata = { title: P.title, robots: { index: false } };

/**
 * «النظام متاعي» (supabase/packs-2026-11-09.sql): the reward and the extras of a shop on a pack. A shop
 * already open the day the packs came («old») has its settings as they always were, and comes back there.
 */
export default async function ShopSystem() {
  const me = await getMe();
  if (!me) redirect("/login?next=/shop/system");
  if (!me.shop) redirect("/shop/setup");
  if (!me.shop.goal) redirect("/shop/card");
  const systems = await call<ShopSystems>("my_systems");
  if (!onPack(systems)) redirect("/shop/settings");
  return (
    <Screen>
      <SystemBoard shop={{ goal: me.shop.goal, gift: me.shop.gift, wheel_on: me.shop.wheel_on, store_on: me.shop.store_on, items_on: me.shop.items_on }} systems={systems} />
    </Screen>
  );
}
