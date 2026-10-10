import { redirect } from "next/navigation";
import { Items } from "@/components/Items";
import { getMe } from "@/lib/session";
import { call } from "@/lib/supabase";
import { t } from "@/lib/t";

export const metadata = { title: t.itemsWhatYouSell, robots: { index: false } };

/** What the shop sells: the list the owner writes, and the switch that makes the counter ask. */
export default async function ShopItems() {
  const me = await getMe();
  if (!me) redirect("/login?next=/shop/items");
  if (!me.shop) redirect("/shop/setup");
  const items = (await call<{ id: number; name: string }[]>("my_items")) ?? [];
  return <Items names={items.map((i) => i.name)} on={!!me.shop.items_on} kind={me.shop.kind} />;
}
