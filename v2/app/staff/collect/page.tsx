import { redirect } from "next/navigation";
import { Collect } from "@/components/Collect";
import { P, type StaffShop } from "@/lib/packs";
import { getMe } from "@/lib/session";
import { call } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata = { title: P.staffHome, robots: { index: false } };

/**
 * A staff phone gives the tampon itself: the customer's number, or the camera on their code — the
 * owner's very screen (components/Collect), its calls run for the shop the phone works at (lib/supabase
 * asStaff), its ways back leading to /staff.
 */
export default async function StaffCollect({ searchParams }: { searchParams: Promise<{ by?: string }> }) {
  const [me, { by }] = await Promise.all([getMe(), searchParams]);
  if (!me) redirect("/login?next=/staff");
  if (me.shop) redirect(`/shop/collect?by=${by === "scan" ? "scan" : by === "code" ? "code" : "phone"}`);
  const shop = await call<StaffShop>("my_staff_shop");
  if (!shop || !shop.goal) redirect("/staff");
  const [items, wheel] = await Promise.all([
    shop.items_on ? call<{ id: number; name: string }[]>("staff_act", { p_fn: "my_items", p_args: {} }) : Promise.resolve(null),
    shop.wheel_on || shop.wheel_allowed ? call<{ prizes: { id: number; name: string; chance: number }[] }>("staff_act", { p_fn: "my_wheel", p_args: {} }) : Promise.resolve(null),
  ]);
  return (
    <Collect
      home="/staff"
      by={by === "scan" ? "scan" : by === "code" ? "code" : "phone"}
      items={Array.isArray(items) ? items : []}
      prizes={wheel?.prizes ?? []}
      draws={shop.draw}
    />
  );
}
