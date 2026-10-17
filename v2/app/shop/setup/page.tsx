import { redirect } from "next/navigation";
import { HelpButton } from "@/components/Help";
import { ShopForm } from "@/components/ShopForm";
import { Steps } from "@/components/Steps";
import { Heading, Top } from "@/components/Top";
import { Middle, Screen } from "@/components/ui";
import { getMe, homeOf } from "@/lib/session";
import { getHelp } from "@/lib/settings";
import { t } from "@/lib/t";

export const metadata = { title: "المحل" };

/** Step 1 of 3 for somebody who has an account already (and later, changing the shop's name or kind from «المحل»). */
export default async function ShopSetup({ searchParams }: { searchParams: Promise<{ edit?: string; name?: string; kind?: string }> }) {
  const [me, { edit, name, kind }, help] = await Promise.all([getMe(), searchParams, getHelp()]);
  if (!me) redirect("/shop/new");
  // a shop already open (signing in from «/shop/new», where the sign-in leads here): its home, never step 1 again
  if (me.shop && !edit) redirect(homeOf(me));
  const editing = !!edit && !!me.shop;
  return (
    <Screen>
      <Top back={editing ? "/shop/settings" : undefined} end={<HelpButton help={help} />} />
      <Middle>
        {/* a person with an account already (a customer, or an owner who signed in) opens the shop here: step 1 of 3,
            then the card, then what the customer sees — what they typed on /shop/new before signing in comes along */}
        <Heading title={t.shopTitle}>{!editing && <Steps at={1} />}</Heading>
        <ShopForm name={me.shop?.name ?? name?.slice(0, 60)} kind={me.shop?.kind ?? kind} logo={me.shop?.logo} next={editing ? "/shop" : undefined} />
      </Middle>
    </Screen>
  );
}
