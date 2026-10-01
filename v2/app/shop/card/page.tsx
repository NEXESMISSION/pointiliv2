import { redirect } from "next/navigation";
import { CardForm } from "@/components/CardForm";
import { Steps } from "@/components/Steps";
import { Top } from "@/components/Top";
import { Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { t } from "@/lib/t";

export const metadata = { title: "الكارط" };

/** Step 3 of 3: the card — and, later, changing it from the settings. */
export default async function ShopCard() {
  const me = await getMe();
  if (!me) redirect("/shop/new");
  if (!me.shop) redirect("/shop/setup");
  const editing = !!me.shop.goal;
  return (
    <Screen>
      <Top back={editing ? "/shop/settings" : undefined} title={t.cardTitle}>
        {!editing && <Steps at={3} />}
      </Top>
      <div className="mt-4 flex flex-1 flex-col">
        <CardForm shop={me.shop} next={editing ? "/shop/settings" : "/shop"} cta={editing ? t.save : t.cardDone} />
      </div>
    </Screen>
  );
}
