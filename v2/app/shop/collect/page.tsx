import { redirect } from "next/navigation";
import { Collect } from "@/components/Collect";
import { getMe } from "@/lib/session";

export const metadata = { title: "زيد تامبون", robots: { index: false } };

/** The shop gives the tampon itself: the camera on the customer's own code, or the code typed (`?by=scan|code`). */
export default async function ShopCollect({ searchParams }: { searchParams: Promise<{ by?: string }> }) {
  const [me, { by }] = await Promise.all([getMe(), searchParams]);
  if (!me) redirect("/login?next=/shop/collect");
  if (!me.shop) redirect("/shop/setup");
  if (!me.shop.goal) redirect("/shop/card");
  return <Collect by={by === "scan" ? "scan" : "code"} shop={{ name: me.shop.name, kind: me.shop.kind, color: me.shop.color, logo: me.shop.logo, goal: me.shop.goal, gift: me.shop.gift }} />;
}
