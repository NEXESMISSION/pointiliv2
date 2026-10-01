import { redirect } from "next/navigation";
import { Gift } from "lucide-react";
import { Top } from "@/components/Top";
import { Icon3D, Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { call } from "@/lib/supabase";
import { customersN, t } from "@/lib/t";

export const metadata = { title: "الحرفاء" };

type Row = { id: string; name: string | null; phone: string | null; stamps: number; gifts: number; last_at: string | null; ready: boolean };

const when = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis" }).format(new Date(iso)) : t.never;

/** Every customer of the shop, the latest visit first: their stamps, their gifts. */
export default async function ShopCustomers() {
  const me = await getMe();
  if (!me?.shop) redirect("/shop/new");
  const res = await call<{ goal: number; items: Row[] }>("shop_customers");
  const items = res?.items ?? [];
  const goal = res?.goal ?? me.shop.goal ?? 10;

  return (
    <Screen>
      <Top back="/shop" title={t.customersTitle} hint={items.length ? customersN(items.length) : undefined} />
      {items.length === 0 ? (
        <div className="mt-12 flex flex-col items-center text-center">
          <Icon3D name="people" size={88} className="animate-float" />
          <h2 className="mt-4 text-[21px] font-bold">{t.customersEmpty}</h2>
          <p className="mt-1.5 max-w-[17rem] text-[15px] text-muted">{t.customersEmptyBody}</p>
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-line overflow-hidden rounded-[22px] bg-surface shadow-card">
          {items.map((c) => {
            const pct = Math.min(100, Math.round((c.stamps / goal) * 100));
            return (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[linear-gradient(145deg,#ffb18a,#ff6b4a)] text-[16px] font-bold text-white">
                  {(c.name?.[0] ?? "؟").toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15.5px] font-semibold">{c.name ?? t.someone}</span>
                  <span className="block truncate text-[12.5px] text-muted">
                    {when(c.last_at)}
                    {c.phone && (
                      <>
                        {" · "}
                        <span dir="ltr" className="num inline-block">{c.phone}</span>
                      </>
                    )}
                  </span>
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-line">
                    <span className="block h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                  </span>
                </span>
                {c.ready ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-coral-soft px-2.5 py-1 text-[12.5px] font-bold text-coral">
                    <Gift className="size-3.5" /> {t.ready.replace("!", "")}
                  </span>
                ) : (
                  <span className="num shrink-0 text-[14px] font-bold text-body">
                    {Math.min(c.stamps, goal)}/{goal}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Screen>
  );
}
