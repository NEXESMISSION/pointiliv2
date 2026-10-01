import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { Steps } from "@/components/Steps";
import { Top } from "@/components/Top";
import { Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { t } from "@/lib/t";

export const metadata = { title: "حلّ محلّك" };

/** Step 1 of 3 for an owner: the account. Then the shop, then the card. */
export default async function ShopNew() {
  const me = await getMe();
  if (me) redirect(me.shop ? (me.shop.goal ? "/shop" : "/shop/card") : "/shop/setup");
  return (
    <Screen>
      <Top back="/" title={t.shopNewTitle} hint={t.shopNewHint}>
        <Steps at={1} />
      </Top>
      <div className="mt-6 flex flex-1 flex-col">
        <AuthForm mode="join" owner />
      </div>
    </Screen>
  );
}
