import { redirect } from "next/navigation";
import { WheelEditor } from "@/components/WheelEditor";
import type { Prize } from "@/components/Wheel";
import { Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { call } from "@/lib/supabase";
import { t } from "@/lib/t";

export const metadata = { title: t.wheelOwnerTitle, robots: { index: false } };

/** The owner's wheel — only for a shop the founder switched to it; any other shop goes home. */
export default async function ShopWheel() {
  const me = await getMe();
  if (!me) redirect("/login?next=/shop/wheel");
  if (!me.shop) redirect("/shop/setup");
  if (!me.shop.wheel_on) redirect("/shop");
  const w = await call<{ ok: boolean; prizes: Prize[]; fell: { name: string; n: number }[] }>("my_wheel");
  return (
    <Screen>
      <WheelEditor prizes={w?.prizes ?? []} fell={w?.fell ?? []} goal={me.shop.goal} />
    </Screen>
  );
}
