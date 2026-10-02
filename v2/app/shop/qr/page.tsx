import { redirect } from "next/navigation";
import { Counter } from "@/components/Counter";
import { CounterCoach } from "@/components/CounterCoach";
import { getMe } from "@/lib/session";

export const metadata = { title: "الكود", robots: { index: false } };

/** The counter: the code, and the gifts to hand over, full screen — the first time, with a bravo and a tip. */
export default async function ShopQr({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const [me, { welcome }] = await Promise.all([getMe(), searchParams]);
  if (!me) redirect("/shop/new");
  if (!me.shop) redirect("/shop/setup");
  if (!me.shop.goal) redirect("/shop/card");
  return (
    <>
      <Counter shop={{ name: me.shop.name, kind: me.shop.kind, color: me.shop.color, paused: !!me.shop.paused, signal: me.shop.signal }} />
      {welcome && <CounterCoach name={(me.name ?? "").split(" ")[0] ?? ""} />}
    </>
  );
}
