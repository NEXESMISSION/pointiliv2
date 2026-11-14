import { redirect } from "next/navigation";
import { CardOptions } from "@/components/CardOptions";
import { Screen } from "@/components/ui";
import { getMe } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "خيارات الكارط", robots: { index: false } };

/** «خيارات الكارط» (components/CardOptions): the card's rules on one page, from «المحل». */
export default async function ShopOptions() {
  const me = await getMe();
  if (!me) redirect("/login?next=/shop/options");
  if (!me.shop) redirect("/shop/setup");
  if (!me.shop.goal) redirect("/shop/card");
  return (
    <Screen>
      <CardOptions shop={me.shop} />
    </Screen>
  );
}
