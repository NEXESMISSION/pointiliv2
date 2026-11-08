import { redirect } from "next/navigation";
import { after } from "next/server";
import { justDrawn, tellWinners } from "@/lib/draw-tell";
import { DrawBoard } from "@/components/DrawBoard";
import { Screen } from "@/components/ui";
import { D, type OwnerDraw } from "@/lib/draw";
import { getMe } from "@/lib/session";
import { call } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata = { title: D.name, robots: { index: false } };

/**
 * The owner's golden ticket (supabase/systems-2026-11-08.sql) — only for a shop the founder gave it.
 * A shop it was taken from still comes here while a prize of its winners waits to be handed over.
 */
export default async function ShopDraw() {
  const me = await getMe();
  if (!me) redirect("/login?next=/shop/draw");
  if (!me.shop) redirect("/shop/setup");
  if (!me.shop.goal) redirect("/shop/card");
  const draw = await call<OwnerDraw>("my_draw");
  if (!draw?.ok) redirect("/shop");
  if (!draw.allowed && !draw.wins.some((w) => !w.given_at)) redirect("/shop");
  // the owner's look at the moment made the draw: its winners told on their phones, if not yet
  // eslint-disable-next-line react-hooks/purity -- a server page: the clock is read once per request
  if (justDrawn(draw.last?.drawn_at, Date.now())) after(tellWinners);
  return (
    <Screen>
      <DrawBoard draw={draw} shop={{ name: me.shop.name }} />
    </Screen>
  );
}
