import { redirect } from "next/navigation";
import { StoreEditor, type Waiting } from "@/components/StoreEditor";
import { Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { call } from "@/lib/supabase";
import { t } from "@/lib/t";
import type { ShopSystems } from "@/lib/packs";
import type { StoreItem } from "@/lib/types";

export const metadata = { title: t.storeOwnerTitle, robots: { index: false } };

/**
 * The owner's store — for a shop on it; any other shop goes home. One more way in (9 Nov 2026): a shop that chose the
 * store on «النظام متاعي» with nothing in it yet (`open=1`) writes its list here first, and the store opens with it.
 */
export default async function ShopStore({ searchParams }: { searchParams: Promise<{ start?: string; from?: string; open?: string }> }) {
  const [me, { start, from, open }] = await Promise.all([getMe(), searchParams]);
  // a shop that chose the store itself on «النظام متاعي»: not its first set-up — it goes back there
  const fromSystem = from === "system";
  if (!me) redirect("/login?next=/shop/store");
  if (!me.shop) redirect("/shop/setup");
  // the store to open with its list: only for a shop whose pack lets it choose the store (Pro)
  const opening = !me.shop.store_on && fromSystem && open === "1" && !!(await call<ShopSystems>("my_systems"))?.store_allowed;
  if (!me.shop.store_on && !opening) redirect("/shop");
  const s = await call<{ ok: boolean; items: StoreItem[]; waiting: Waiting[]; sold: { name: string; n: number }[] }>("my_store");
  return (
    <Screen>
      <StoreEditor items={s?.items ?? []} waiting={s?.waiting ?? []} sold={s?.sold ?? []} first={start === "1" && !fromSystem} back={fromSystem ? "/shop/system" : "/shop"} opening={opening} />
    </Screen>
  );
}
