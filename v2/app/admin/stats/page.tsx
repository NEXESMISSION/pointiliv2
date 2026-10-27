import { AdminStats } from "@/components/AdminStats";
import type { BoardShop } from "@/lib/board";
import { daysOf, statsOf } from "@/lib/stats";
import { call } from "@/lib/supabase";

export const metadata = { title: "الأرقام" };

const DAY = 86_400_000;
type Ledger = { all: number; out_all: number; month: number; out_month: number };

/**
 * The numbers: the same shops as the board (one query) read as a whole —
 * worked out here for three periods, so the phone gets the sums and not the
 * lines — and the founder's money in and out (admin_ledger).
 */
export default async function Stats() {
  const [shops, books] = await Promise.all([call<BoardShop[]>("admin_board"), call<Ledger>("admin_ledger")]);
  // eslint-disable-next-line react-hooks/purity -- a server page: the clock is read once per request
  const now = Date.now();
  const all = shops ?? [];
  const periods = [
    { id: "week", label: "7 أيام", stats: statsOf(all, now - 7 * DAY) },
    { id: "month", label: "30 يوم", stats: statsOf(all, now - 30 * DAY) },
    { id: "all", label: "من الأول", stats: statsOf(all, null) },
  ];
  const money = { all: Number(books?.all ?? 0), out: Number(books?.out_all ?? 0), month: Number(books?.month ?? 0), outMonth: Number(books?.out_month ?? 0) };
  return <AdminStats periods={periods} days={daysOf(all, now)} money={money} />;
}
