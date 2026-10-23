import type { BoardShop } from "@/components/AdminBoard";
import { AdminSubs } from "@/components/AdminSubs";
import { call } from "@/lib/supabase";

export const metadata = { title: "الأبونمان" };

/** The subscriptions: the same shops as the board (one query), seen by their access, with what came in this month. */
export default async function Subs() {
  const [shops, books] = await Promise.all([call<BoardShop[]>("admin_board"), call<{ month: number }>("admin_ledger")]);
  // eslint-disable-next-line react-hooks/purity -- a server page: the clock is read once per request
  const now = Date.now();
  return <AdminSubs shops={shops ?? []} now={now} month={books?.month ?? 0} />;
}
