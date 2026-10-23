import { AdminBoard } from "@/components/AdminBoard";
import type { BoardShop } from "@/lib/board";
import { call } from "@/lib/supabase";

export const metadata = { title: "المحلات" };

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * The console's one page: every real shop, the newest first, read in one
 * query (admin_board). `?shop=<id>` — the link under a Telegram alert —
 * opens that shop on the board.
 */
export default async function Console({ searchParams }: { searchParams: Promise<{ shop?: string }> }) {
  const [{ shop }, shops] = await Promise.all([searchParams, call<BoardShop[]>("admin_board")]);
  // eslint-disable-next-line react-hooks/purity -- a server page: the clock is read once per request
  const now = Date.now();
  return <AdminBoard shops={shops ?? []} now={now} open={shop && UUID.test(shop) ? shop : null} />;
}
