import { redirect } from "next/navigation";
import { GiftChoices } from "@/components/GiftChoices";
import { HelpButton } from "@/components/Help";
import { Top } from "@/components/Top";
import { Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { getHelp } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "الحريف يختار الكادو", robots: { index: false } };

/**
 * «الحريف يختار الكادو» (13 Nov 2026, supabase/choice-2026-11-13.sql): the owner lists the gifts a full card can be,
 * and the customer picks one. Off by default. A card shop's: a store shop's customers choose in the store already.
 */
export default async function ShopChoices({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const [me, { from }] = await Promise.all([getMe(), searchParams]);
  if (!me) redirect("/login?next=/shop/choices");
  if (!me.shop) redirect("/shop/setup");
  if (me.shop.store_on) redirect("/shop/settings");
  if (!me.shop.goal) redirect("/shop/card");
  const help = await getHelp();
  const back = from === "options" ? "/shop/options" : "/shop/settings";
  return (
    <Screen className="[@media(max-height:547.98px)]:h-auto [@media(max-height:547.98px)]:min-h-dvh">
      <Top back={back} end={<HelpButton help={help} />} title="الحريف يختار الكادو" hint="كي يكمّل الكارط، يختار الكادو اللي يحب من الليستة متاعك." />
      <GiftChoices goal={me.shop.goal} gift={me.shop.gift ?? ""} kind={me.shop.kind} wheel={!!me.shop.wheel_on} back={back} />
    </Screen>
  );
}
