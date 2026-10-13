import { redirect } from "next/navigation";
import { FixItems, type FixStamp } from "@/components/FixItems";
import { Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { call } from "@/lib/supabase";

export const metadata = { title: "بدّل الحاجة", robots: { index: false } };

/** A tampon written against the wrong thing, put right (`?m=` opens one). The first visit explains it. */
export default async function ShopTampons({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const [me, { m }] = await Promise.all([getMe(), searchParams]);
  if (!me) redirect("/login?next=/shop/tampons");
  if (!me.shop) redirect("/shop/setup");
  const res = await call<{ ok: boolean; items: { id: number; name: string }[]; stamps: FixStamp[] }>("my_stamps");
  const focus = m && /^\d{1,18}$/.test(m) ? Number(m) : null;
  return (
    <Screen>
      <FixItems stamps={res?.stamps ?? []} items={res?.items ?? []} tip={!(me.seen ?? []).includes("fix_tip")} focus={focus} />
    </Screen>
  );
}
