import { redirect } from "next/navigation";
import { Poster } from "@/components/Poster";
import { Top } from "@/components/Top";
import { Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { t } from "@/lib/t";

export const metadata = { title: "البوستر", robots: { index: false } };

/** The counter's poster, to print on A5 (or to have printed): from «المحل». */
export default async function ShopPoster() {
  const me = await getMe();
  if (!me) redirect("/shop/new");
  if (!me.shop) redirect("/shop/setup");
  if (!me.shop.goal) redirect("/shop/card");
  const s = me.shop;
  return (
    <Screen>
      <Top back="/shop/settings" title={t.posterTitleScreen} />
      <div className="mt-[2dvh] flex min-h-0 flex-1 flex-col">
        <Poster shop={{ name: s.name, kind: s.kind, color: s.color, logo: s.logo, stamp_logo: s.stamp_logo, goal: s.goal, gift: s.gift, store: !!s.store_on, wheel: !!s.wheel_on }} />
      </div>
    </Screen>
  );
}
