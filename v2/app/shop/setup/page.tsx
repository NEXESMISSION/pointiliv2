import { redirect } from "next/navigation";
import { ShopForm } from "@/components/ShopForm";
import { Steps } from "@/components/Steps";
import { Heading, Top } from "@/components/Top";
import { Middle, Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { t } from "@/lib/t";

export const metadata = { title: "المحل" };

/** Step 2 of 3 (and later, changing the shop's name or kind from the shop's home). */
export default async function ShopSetup({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const [me, { edit }] = await Promise.all([getMe(), searchParams]);
  if (!me) redirect("/shop/new");
  const editing = !!edit && !!me.shop;
  return (
    <Screen>
      <Top back={editing ? "/shop" : undefined} />
      <Middle>
        <Heading title={t.shopTitle}>{!editing && <Steps at={2} />}</Heading>
        <ShopForm name={me.shop?.name} kind={me.shop?.kind} next={editing ? "/shop" : undefined} />
      </Middle>
    </Screen>
  );
}
