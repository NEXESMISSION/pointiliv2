import { redirect } from "next/navigation";
import { HelpButton } from "@/components/Help";
import { ShopForm } from "@/components/ShopForm";
import { Steps } from "@/components/Steps";
import { Heading, Top } from "@/components/Top";
import { Middle, Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { getHelp } from "@/lib/settings";
import { t } from "@/lib/t";

export const metadata = { title: "المحل" };

/** Step 2 of 3 (and later, changing the shop's name or kind from the shop's home). */
export default async function ShopSetup({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const [me, { edit }, help] = await Promise.all([getMe(), searchParams, getHelp()]);
  if (!me) redirect("/shop/new");
  const editing = !!edit && !!me.shop;
  return (
    <Screen>
      <Top back={editing ? "/shop" : undefined} end={<HelpButton help={help} />} />
      <Middle>
        <Heading title={t.shopTitle}>{!editing && <Steps at={2} />}</Heading>
        <ShopForm name={me.shop?.name} kind={me.shop?.kind} next={editing ? "/shop" : undefined} />
      </Middle>
    </Screen>
  );
}
