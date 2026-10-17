import { redirect } from "next/navigation";
import { Collect } from "@/components/Collect";
import { getMe } from "@/lib/session";
import { call } from "@/lib/supabase";

export const metadata = { title: "زيد تامبون", robots: { index: false } };

/** The shop gives the tampon itself: the camera on the customer's own code, or the code typed (`?by=scan|code`). */
export default async function ShopCollect({ searchParams }: { searchParams: Promise<{ by?: string; back?: string }> }) {
  const [me, { by, back }] = await Promise.all([getMe(), searchParams]);
  if (!me) redirect("/login?next=/shop/collect");
  if (!me.shop) redirect("/shop/setup");
  if (!me.shop.goal) redirect("/shop/card");
  // a shop that says what it sells: the tampon by hand asks what it was for, as the counter does
  const items = me.shop.items_on ? ((await call<{ id: number; name: string }[]>("my_items")) ?? []) : [];
  // a wheel shop: its prizes, to spin a customer's turn at the counter
  const wheel = me.shop.wheel_on || me.shop.wheel_allowed ? await call<{ prizes: { id: number; name: string; chance: number }[] }>("my_wheel") : null;
  return <Collect by={by === "scan" ? "scan" : by === "code" ? "code" : "phone"} items={items} prizes={wheel?.prizes ?? []} back={back && /^[0-9a-f-]{36}$/i.test(back) ? back : undefined} shop={{ name: me.shop.name, kind: me.shop.kind, color: me.shop.color, logo: me.shop.logo, goal: me.shop.goal, gift: me.shop.gift }} />;
}
