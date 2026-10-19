import { redirect } from "next/navigation";
import { CardFirst } from "@/components/CardFirst";
import { CardWizard } from "@/components/CardWizard";
import type { Prize } from "@/components/Wheel";
import { getMe } from "@/lib/session";
import { getHelp } from "@/lib/settings";
import { call } from "@/lib/supabase";

export const metadata = { title: "الكارط" };

/** Step 2 of 3: the first card, on one screen — and, later, changing it from the shop's home, one question at a time. */
export default async function ShopCard() {
  const me = await getMe();
  if (!me) redirect("/shop/new");
  if (!me.shop) redirect("/shop/setup");
  // a store shop has no card to make: its store is all there is to set
  if (me.shop.store_on) redirect(me.shop.goal ? "/shop/store" : "/shop/store?start=1");
  const editing = !!me.shop.goal;
  const help = await getHelp();
  // a first card: every question a card has, one at a time, already answered for what the shop
  // sells — the roulette among them, because a shop still being opened chooses its own way of
  // giving (public.wheel_may; for every shop that already has customers the founder's switch rules)
  if (!editing) return <CardFirst shop={me.shop} help={help} wheel />;
  // a shop the founder allowed the wheel: «الروليت» is one of the answers to the gift, with what it holds
  const wheel = me.shop.wheel_allowed || me.shop.wheel_on ? await call<{ on: boolean; prizes: Prize[] }>("my_wheel") : null;
  return <CardWizard shop={me.shop} next="/shop" editing help={help} wheel={wheel ? { on: !!me.shop.wheel_on, prizes: wheel.prizes ?? [] } : null} />;
}
