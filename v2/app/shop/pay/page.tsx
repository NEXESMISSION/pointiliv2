import { redirect } from "next/navigation";
import type { Pay } from "@/components/Pay";
import { PayPaid } from "@/components/PayPaid";
import { PaySteps } from "@/components/PaySteps";
import { Top } from "@/components/Top";
import { Screen } from "@/components/ui";
import { lapsed, RENEW_DAYS } from "@/lib/plans";
import { getMe } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { call } from "@/lib/supabase";
import { fill, t } from "@/lib/t";

export const metadata = { title: "الأبونمان", robots: { index: false } };

const day = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Tunis" }).format(new Date(iso));

/**
 * Paying (the founder, 7 Nov 2026): a month 35, six months 120, a year 180 —
 * and, in the trial's first 3 days, two months more on six months and the
 * year (the clock shows what is left). A shop that paid before keeps the year
 * at 120. In two steps since 16 Nov 2026 (components/PaySteps): the length,
 * then how — D17, a transfer, a deposit, a money order — and a WhatsApp or a
 * call to finish it with the founder. Paid, the page says until when; a few
 * days before the end it takes the next one («جدّد»).
 */
export default async function ShopPay({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const [me, { from }] = await Promise.all([getMe(), searchParams]);
  if (!me) redirect("/login?next=/shop/pay");
  if (!me.shop) redirect("/shop/setup");
  const [pay, settings] = await Promise.all([call<Pay | null>("my_payment"), getSettings()]);
  const paid = !!pay?.paid && !!pay.paid_until;
  // eslint-disable-next-line react-hooks/purity -- a server page: the clock is read once per request
  const near = paid && Date.parse(pay!.paid_until!) - Date.now() < RENEW_DAYS * 86_400_000;
  const renew = near || lapsed(pay);

  return (
    <Screen>
      {/* opened from «المحل»: «ارجع» goes back there (13 Nov 2026) */}
      <Top back={from === "settings" ? "/shop/settings" : "/shop"} />
      {paid && !near ? (
        <>
          <h1 className="mt-[1.6dvh] shrink-0 text-[1.625rem] font-bold leading-tight">{t.payTitle}</h1>
          {/* what it gives and until when, centred in the room left */}
          <div className="flex min-h-0 flex-1 flex-col pb-[3dvh]">
            <div className="my-auto">
              <PayPaid paidUntil={pay!.paid_until!} />
            </div>
          </div>
        </>
      ) : (
        <PaySteps
          old={!!pay?.old_price}
          offerUntil={pay?.offer && pay.offer_until ? pay.offer_until : null}
          shop={me.shop.name}
          support={settings.supportPhone}
          details={settings.pay}
          phone={me.phone}
          title={renew ? t.planRenewTitle : t.payPageTitle}
          note={near ? fill(t.payPaidUntil, { date: day(pay!.paid_until!) }) : null}
        />
      )}
    </Screen>
  );
}
