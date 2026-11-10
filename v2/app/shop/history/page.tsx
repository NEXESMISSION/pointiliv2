import { redirect } from "next/navigation";
import type { HistoryRow } from "@/app/actions";
import { HelpButton } from "@/components/Help";
import { History } from "@/components/History";
import { Top } from "@/components/Top";
import { Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { getHelp } from "@/lib/settings";
import { call } from "@/lib/supabase";
import { t } from "@/lib/t";

export const metadata = { title: "التاريخ", robots: { index: false } };

const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Tunis", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

/** «التاريخ»: everything that happened at the shop, day by day — and a tampon given by mistake, taken back (components/History). */
export default async function ShopHistory() {
  const me = await getMe();
  if (!me) redirect("/login?next=/shop/history");
  if (!me.shop) redirect("/shop/setup");
  const [res, help] = await Promise.all([call<{ ok: boolean; rows: HistoryRow[] }>("shop_history", { p_before: null }), getHelp()]);
  // eslint-disable-next-line react-hooks/purity -- a server page: the clock is read once per request
  const now = Date.now();
  return (
    <Screen>
      <Top back="/shop" end={<HelpButton help={help} />} title={t.histTitle} hint={t.histHint} />
      <History rows={res?.rows ?? []} today={dayKey(new Date(now))} yesterday={dayKey(new Date(now - 86_400_000))} />
    </Screen>
  );
}
