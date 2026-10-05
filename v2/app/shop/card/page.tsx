import { redirect } from "next/navigation";
import { CardWizard } from "@/components/CardWizard";
import { getMe } from "@/lib/session";
import { getHelp } from "@/lib/settings";

export const metadata = { title: "الكارط" };

/** Step 3 of 3: the card, one question at a time — and, later, changing it from the shop's home. */
export default async function ShopCard() {
  const me = await getMe();
  if (!me) redirect("/shop/new");
  if (!me.shop) redirect("/shop/setup");
  const editing = !!me.shop.goal;
  const help = await getHelp();
  return (
    <CardWizard
      shop={me.shop}
      owner={(me.name ?? "").split(" ")[0] ?? ""}
      next={editing ? "/shop" : "/shop?welcome=1"}
      editing={editing}
      hello={!editing && !(me.seen ?? []).includes("card_hello")}
      help={help}
    />
  );
}
