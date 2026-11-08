import { redirect } from "next/navigation";
import { StaffBoard } from "@/components/StaffBoard";
import { Screen } from "@/components/ui";
import { onPack, P, type MyStaff, type ShopSystems } from "@/lib/packs";
import { getMe } from "@/lib/session";
import { call } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata = { title: P.staffTitle, robots: { index: false } };

/** The owner's staff phones (Pro): only for a shop on a pack — a shop already open the day the packs came goes back to its settings. */
export default async function ShopStaff() {
  const me = await getMe();
  if (!me) redirect("/login?next=/shop/staff");
  if (!me.shop) redirect("/shop/setup");
  const [systems, staff] = await Promise.all([call<ShopSystems>("my_systems"), call<MyStaff>("my_staff")]);
  if (!onPack(systems) || !staff?.ok) redirect("/shop/settings");
  return (
    <Screen>
      <StaffBoard staff={staff} shop={me.shop.name} />
    </Screen>
  );
}
