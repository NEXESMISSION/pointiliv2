import { redirect } from "next/navigation";
import { CardFirst } from "@/components/CardFirst";
import { CardWizard } from "@/components/CardWizard";
import { Screen } from "@/components/ui";
import { WheelGoal } from "@/components/WheelGoal";
import { getMe } from "@/lib/session";
import { getHelp } from "@/lib/settings";

export const metadata = { title: "الكارط" };

/** Step 2 of 3: the first card, on one screen — and, later, changing it from the shop's home, one question at a time. */
export default async function ShopCard() {
  const me = await getMe();
  if (!me) redirect("/shop/new");
  if (!me.shop) redirect("/shop/setup");
  // a store shop has no card to make: its store is all there is to set
  if (me.shop.store_on) redirect(me.shop.goal ? "/shop/store" : "/shop/store?start=1");
  const editing = !!me.shop.goal;
  // a wheel shop: one question (how many tampons for a turn), then the wheel's prizes
  if (me.shop.wheel_on) {
    return (
      <Screen>
        <WheelGoal shop={me.shop} editing={editing} />
      </Screen>
    );
  }
  const help = await getHelp();
  // a first card: two questions on one screen, already answered for what the shop sells
  if (!editing) return <CardFirst shop={me.shop} help={help} />;
  return <CardWizard shop={me.shop} owner={(me.name ?? "").split(" ")[0] ?? ""} next="/shop" editing help={help} />;
}
