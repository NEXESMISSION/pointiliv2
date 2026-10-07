import { redirect } from "next/navigation";
import { CustomerList, type CustomerRow } from "@/components/CustomerList";
import { HelpButton } from "@/components/Help";
import { Top } from "@/components/Top";
import { Icon3D, Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { getHelp } from "@/lib/settings";
import { call } from "@/lib/supabase";
import { customersN, t } from "@/lib/t";

export const metadata = { title: "الحرفاء" };


/** Every customer of the shop, the latest visit first: their stamps, their gifts — and each row opens (CustomerList). */
export default async function ShopCustomers() {
  const me = await getMe();
  if (!me?.shop) redirect("/shop/new");
  const [res, help] = await Promise.all([call<{ goal: number; items: CustomerRow[] }>("shop_customers"), getHelp()]);
  const items = res?.items ?? [];
  const goal = res?.goal ?? me.shop.goal ?? 10;

  return (
    <Screen>
      <Top back="/shop" end={<HelpButton help={help} />} title={t.customersTitle} hint={items.length ? customersN(items.length) : undefined} />
      {items.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center pb-[6dvh] text-center">
          <Icon3D name="people" size={88} className="animate-float" />
          <h2 className="mt-4 text-[1.3125rem] font-bold">{t.customersEmpty}</h2>
          <p className="mt-1.5 max-w-[17rem] text-[0.9375rem] text-muted">{t.customersEmptyBody}</p>
        </div>
      ) : (
        <CustomerList items={items} shop={me.shop} goal={goal} />
      )}
    </Screen>
  );
}
