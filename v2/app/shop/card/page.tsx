import { redirect } from "next/navigation";
import { CardWizard } from "@/components/CardWizard";
import { getMe } from "@/lib/session";
import { call } from "@/lib/supabase";

export const metadata = { title: "الكارط" };

/** Step 3 of 3: the card, one question at a time — and, later, changing it from the shop's home. */
export default async function ShopCard() {
  const me = await getMe();
  if (!me) redirect("/shop/new");
  if (!me.shop) redirect("/shop/setup");
  const editing = !!me.shop.goal;
  // the customers a change would touch: the last step tells the owner what happens to them
  const way = editing ? await call<{ ok: boolean; n: number }>("in_progress") : null;
  return (
    <CardWizard
      shop={me.shop}
      owner={(me.name ?? "").split(" ")[0] ?? ""}
      next={editing ? "/shop" : "/shop/qr"}
      editing={editing}
      onTheWay={editing ? (way?.n ?? 0) : undefined}
    />
  );
}
