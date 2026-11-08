import { redirect } from "next/navigation";
import type { Pay } from "@/components/Pay";
import { PayPlans } from "@/components/PayPlans";
import { Top } from "@/components/Top";
import { Screen } from "@/components/ui";
import { lapsed, RENEW_DAYS } from "@/lib/plans";
import { getMe } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { call } from "@/lib/supabase";
import { fill, t } from "@/lib/t";
import { onPack, type ShopSystems } from "@/lib/packs";

export const metadata = { title: "الأبونمان", robots: { index: false } };

const day = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Tunis" }).format(new Date(iso));

/**
 * Paying (the founder, 7 Nov 2026): a month 35, six months 120, a year 180 —
 * and, in the trial's first 3 days, two months more on six months and the
 * year (the clock shows what is left). A shop that paid before keeps the year
 * at 120. Then the ways to pay — D17, a transfer, a deposit, a money order —
 * and a WhatsApp or a call to finish it with the founder. Paid, the page says
 * until when; a few days before the end it takes the next one («جدّد»).
 */
export default async function ShopPay({ searchParams }: { searchParams: Promise<{ pack?: string }> }) {
  const me = await getMe();
  if (!me) redirect("/login?next=/shop/pay");
  if (!me.shop) redirect("/shop/setup");
  // a shop on a pack (9 Nov 2026) chooses between Pointili and Pointili Pro; a shop already open («old») pays as always
  const [pay, settings, systems, { pack: asked }] = await Promise.all([call<Pay | null>("my_payment"), getSettings(), call<ShopSystems>("my_systems"), searchParams]);
  const pack = onPack(systems) ? systems.pack : null;
  const paid = !!pay?.paid && !!pay.paid_until;
  // eslint-disable-next-line react-hooks/purity -- a server page: the clock is read once per request
  const near = paid && Date.parse(pay!.paid_until!) - Date.now() < RENEW_DAYS * 86_400_000;
  const renew = near || lapsed(pay);

  return (
    <Screen>
      <Top back="/shop" />
      <h1 className="mt-[1.6dvh] shrink-0 text-[1.625rem] font-bold leading-tight">{paid && !near ? t.payTitle : renew ? t.planRenewTitle : t.payPageTitle}</h1>
      {near && <p className="mt-1 shrink-0 text-[0.9375rem] font-semibold text-muted">{fill(t.payPaidUntil, { date: day(pay!.paid_until!) })}</p>}

      {/* the plans and the ways, centred in the room left: one screen, nothing scrolls (on a screen too short, it starts under the title) */}
      <div className="flex min-h-0 flex-1 flex-col pb-[3dvh]">
        <div className="my-auto">
          <PayPlans
            old={!!pay?.old_price}
            offerUntil={pay?.offer && pay.offer_until ? pay.offer_until : null}
            paidUntil={paid && !near ? pay!.paid_until : null}
            shop={me.shop.name}
            support={settings.supportPhone}
            details={settings.pay}
            phone={me.phone}
            pack={pack}
            want={pack ? (asked === "pro" || asked === "base" ? asked : pack) : null}
          />
        </div>
      </div>
    </Screen>
  );
}
