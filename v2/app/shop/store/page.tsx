import { redirect } from "next/navigation";
import { StoreEditor, type Waiting } from "@/components/StoreEditor";
import { Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { call } from "@/lib/supabase";
import { t } from "@/lib/t";
import type { StoreItem } from "@/lib/types";

export const metadata = { title: t.storeOwnerTitle, robots: { index: false } };

/** The owner's store — only for a shop the founder switched to it; any other shop goes home. */
export default async function ShopStore({ searchParams }: { searchParams: Promise<{ start?: string }> }) {
  const [me, { start }] = await Promise.all([getMe(), searchParams]);
  if (!me) redirect("/login?next=/shop/store");
  if (!me.shop) redirect("/shop/setup");
  if (!me.shop.store_on) redirect("/shop");
  const s = await call<{ ok: boolean; items: StoreItem[]; waiting: Waiting[]; sold: { name: string; n: number }[] }>("my_store");
  return (
    <Screen>
      <StoreEditor items={s?.items ?? []} waiting={s?.waiting ?? []} sold={s?.sold ?? []} first={start === "1"} />
    </Screen>
  );
}
