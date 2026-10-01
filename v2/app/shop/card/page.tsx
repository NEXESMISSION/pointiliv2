import { redirect } from "next/navigation";
import { CardForm } from "@/components/CardForm";
import { Steps } from "@/components/Steps";
import { Top } from "@/components/Top";
import { Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { call } from "@/lib/supabase";
import { t } from "@/lib/t";

export const metadata = { title: "الكارط" };

/** Step 3 of 3: the card — and, later, changing it from the settings. */
export default async function ShopCard() {
  const me = await getMe();
  if (!me) redirect("/shop/new");
  if (!me.shop) redirect("/shop/setup");
  const editing = !!me.shop.goal;
  // the customers a change would touch: they get one line of explanation
  const way = editing ? await call<{ ok: boolean; n: number }>("in_progress") : null;
  return (
    <Screen>
      <Top back={editing ? "/shop" : undefined} title={t.cardTitle}>
        {!editing && <Steps at={3} />}
      </Top>
      <div className="mt-4 flex flex-1 flex-col">
        <CardForm shop={me.shop} next={editing ? "/shop" : "/shop/qr"} cta={editing ? t.save : t.cardDone} onTheWay={editing ? (way?.n ?? 0) : undefined} />
      </div>
    </Screen>
  );
}
