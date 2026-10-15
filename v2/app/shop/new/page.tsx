import { redirect } from "next/navigation";
import { HelpButton } from "@/components/Help";
import { OwnerJoin } from "@/components/OwnerJoin";
import { Steps } from "@/components/Steps";
import { Top } from "@/components/Top";
import { Middle, Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { getHelp } from "@/lib/settings";
import { t } from "@/lib/t";

export const metadata = { title: "حلّ محلّك" };

/** Step 1 of 3 for an owner: the account and the shop, on one screen. Then the card, then what the customer sees. */
export default async function ShopNew() {
  const me = await getMe();
  if (me) redirect(me.shop ? (me.shop.goal ? "/shop" : "/shop/card") : "/shop/setup");
  const help = await getHelp();
  return (
    <Screen>
      <Top back="/" end={<HelpButton help={help} />} />
      <Middle className="!py-[1.6dvh]">
        <h1 className="text-[1.5rem] font-bold leading-tight">{t.shopNewTitle}</h1>
        {/* the smallest phones keep every field on the screen: the three bars step aside */}
        <div className="[@media(max-height:520px)]:hidden">
          <Steps at={1} />
        </div>
        <OwnerJoin />
      </Middle>
    </Screen>
  );
}
