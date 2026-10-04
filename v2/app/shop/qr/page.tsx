import { redirect } from "next/navigation";
import { Counter } from "@/components/Counter";
import { getMe } from "@/lib/session";

export const metadata = { title: "الكود", robots: { index: false } };

/** The counter: the code, and the gifts to hand over, full screen — and, when the owner came here from the welcome on their home, the note about the code. */
export default async function ShopQr({ searchParams }: { searchParams: Promise<{ welcome?: string; tip?: string }> }) {
  const [me, { welcome, tip }] = await Promise.all([getMe(), searchParams]);
  if (!me) redirect("/shop/new");
  if (!me.shop) redirect("/shop/setup");
  if (!me.shop.goal) redirect("/shop/card");
  return (
    <Counter
      shop={{ id: me.shop.id, name: me.shop.name, kind: me.shop.kind, color: me.shop.color, paused: !!me.shop.paused, signal: me.shop.signal, logo: me.shop.logo }}
      welcome={welcome && !(me.seen ?? []).includes("coach") ? ((me.name ?? "").split(" ")[0] ?? "") : null}
      tip={tip === "1"}
    />
  );
}
