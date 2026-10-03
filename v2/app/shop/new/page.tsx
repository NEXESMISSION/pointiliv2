import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { HelpButton } from "@/components/Help";
import { Steps } from "@/components/Steps";
import { Heading, Top } from "@/components/Top";
import { Middle, Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { getHelp } from "@/lib/settings";
import { t } from "@/lib/t";

export const metadata = { title: "حلّ محلّك" };

/** Step 1 of 3 for an owner: the account. Then the shop, then the card. */
export default async function ShopNew() {
  const me = await getMe();
  if (me) redirect(me.shop ? (me.shop.goal ? "/shop" : "/shop/card") : "/shop/setup");
  const help = await getHelp();
  return (
    <Screen>
      <Top back="/" end={<HelpButton help={help} />} />
      <Middle>
        <Heading title={t.shopNewTitle} hint={t.shopNewHint}>
          <Steps at={1} />
        </Heading>
        <AuthForm mode="join" owner />
      </Middle>
    </Screen>
  );
}
