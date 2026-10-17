import { redirect } from "next/navigation";
import { FirstLook } from "@/components/FirstLook";
import { getMe } from "@/lib/session";

export const metadata = { title: "هكّا تخدم", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Step 3 of 3 for an owner: how it works, filmed for real — then the shop's code at the counter. */
export default async function ShopStart() {
  const me = await getMe();
  if (!me) redirect("/shop/new");
  if (!me.shop) redirect("/shop/setup");
  if (!me.shop.goal) redirect("/shop/card");
  return <FirstLook />;
}
