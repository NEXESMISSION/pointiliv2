import { redirect } from "next/navigation";
import { myLinks } from "@/app/actions-links";
import { LinksBoard } from "@/components/LinksBoard";
import { getMe } from "@/lib/session";
import { call } from "@/lib/supabase";
import { linksOn, type Systems } from "@/lib/draw";

export const dynamic = "force-dynamic";
export const metadata = { title: "تامبون برابط", robots: { index: false } };

/**
 * A tampon sent as a link, for an owner who sells online: a new link for each
 * customer, sent in WhatsApp or anywhere, one use and no clock — and every
 * link sent, with where it stands (waiting, opened, taken by whom, cancelled).
 */
export default async function ShopLinks() {
  const me = await getMe();
  if (!me) redirect("/login?next=/shop/links");
  if (!me.shop) redirect("/shop/setup");
  if (!me.shop.goal) redirect("/shop/card");
  const [links, items, systems] = await Promise.all([
    myLinks(),
    // a shop that says what it sells: the link says which thing, as the counter's code does
    me.shop.items_on ? call<{ id: number; name: string }[]>("my_items") : Promise.resolve(null),
    call<Systems>("my_systems"),
  ]);
  // a shop the founder took the link from (8 Nov 2026): home, where the row is not there either
  if (!linksOn(systems)) redirect("/shop");
  return <LinksBoard shop={{ name: me.shop.name, color: me.shop.color }} items={items ?? []} first={links ?? { waiting: 0, used: 0, links: [] }} />;
}
