import { redirect } from "next/navigation";
import { Counter } from "@/components/Counter";
import { P, type StaffShop } from "@/lib/packs";
import { getMe } from "@/lib/session";
import { getHelp } from "@/lib/settings";
import { call } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata = { title: P.staffHome, robots: { index: false } };

/** A staff phone's counter: the shop's code, the owner's very counter (its way back leads to /staff). */
export default async function StaffQr() {
  const me = await getMe();
  if (!me) redirect("/login?next=/staff/qr");
  if (me.shop) redirect("/shop/qr");
  const [shop, help] = await Promise.all([call<StaffShop>("my_staff_shop"), getHelp()]);
  if (!shop || !shop.goal) redirect("/staff");
  // a shop that says what it sells: the counter asks which one, as the owner's does (its list, through staff_act)
  const items = shop.items_on ? ((await call<{ id: number; name: string }[]>("staff_act", { p_fn: "my_items", p_args: {} })) ?? []) : [];
  return (
    <Counter
      home="/staff"
      shop={{ id: shop.id, name: shop.name, kind: shop.kind, color: shop.color, paused: shop.paused, signal: shop.signal, logo: shop.logo, stamp_logo: shop.stamp_logo, goal: shop.goal, gift: shop.gift }}
      items={Array.isArray(items) ? items : []}
      phone={help.phone}
      from={help.from}
    />
  );
}
