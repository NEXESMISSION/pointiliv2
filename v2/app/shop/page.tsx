import { redirect } from "next/navigation";
import { Counter } from "@/components/Counter";
import { getMe } from "@/lib/session";

export const metadata = { title: "الكود", robots: { index: false } };

/** The owner's home is the counter: the code, and the gifts to hand over. */
export default async function ShopHome() {
  const me = await getMe();
  if (!me) redirect("/shop/new");
  if (!me.shop) redirect("/shop/setup");
  if (!me.shop.goal) redirect("/shop/card");
  return <Counter shop={{ name: me.shop.name, kind: me.shop.kind, color: me.shop.color }} />;
}
