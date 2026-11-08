import { AdminSystems, type SystemsRow } from "@/components/AdminSystems";
import { call } from "@/lib/supabase";

export const metadata = { title: "الأنظمة" };

/** Every shop and its systems (supabase/systems-2026-11-08.sql, admin_systems_all): the console's layout checks the founder. */
export default async function Systems() {
  const shops = await call<SystemsRow[]>("admin_systems_all");
  return <AdminSystems shops={shops ?? []} />;
}
