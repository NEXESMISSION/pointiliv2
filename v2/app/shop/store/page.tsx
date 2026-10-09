import { redirect } from "next/navigation";
import type { Reward, StoreLog } from "@/app/actions-store";
import { HelpButton } from "@/components/Help";
import { StoreEditor } from "@/components/StoreEditor";
import { Top } from "@/components/Top";
import { Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { getHelp } from "@/lib/settings";
import { call } from "@/lib/supabase";
import { t } from "@/lib/t";

export const metadata = { title: "الماغازة", robots: { index: false } };

/** The shop's store: what the customers can take with their points, and every thing taken (StoreEditor). */
export default async function ShopStore() {
  const me = await getMe();
  if (!me) redirect("/login?next=/shop/store");
  if (!me.shop) redirect("/shop/setup");
  const [items, log, help] = await Promise.all([call<Reward[]>("my_rewards"), call<StoreLog>("store_log", { p_limit: 200 }), getHelp()]);
  return (
    <Screen>
      <Top back="/shop" end={<HelpButton help={help} />} title={t.storeMine} />
      <StoreEditor items={items ?? []} log={log?.ok ? log : null} />
    </Screen>
  );
}
