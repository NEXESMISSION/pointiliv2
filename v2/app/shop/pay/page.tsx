import { redirect } from "next/navigation";
import { Check, Clock, Sparkles } from "lucide-react";
import { Left, type Pay } from "@/components/Pay";
import { PayMethods } from "@/components/PayMethods";
import { Top } from "@/components/Top";
import { Icon3D, Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { call } from "@/lib/supabase";
import { fill, t } from "@/lib/t";

export const metadata = { title: "الأبونمان", robots: { index: false } };

const day = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Tunis" }).format(new Date(iso));

/**
 * Paying for the year: 120 a year, and in the 48 hours after the owner first
 * sees the offer, three months more (the clock shows what is left). Then the
 * ways to pay — D17, a transfer, a deposit, a money order — and a call or a
 * WhatsApp to finish it with the founder.
 */
export default async function ShopPay() {
  const me = await getMe();
  if (!me) redirect("/login?next=/shop/pay");
  if (!me.shop) redirect("/shop/setup");
  const [pay, settings] = await Promise.all([call<Pay | null>("my_payment"), getSettings()]);
  const paid = !!pay?.paid;
  const offer = !!pay?.offer;
  const months = offer ? 15 : 12;

  return (
    <Screen>
      <Top back="/shop" />
      <h1 className="mt-[1.6dvh] shrink-0 text-[1.75rem] font-bold leading-tight">{t.payTitle}</h1>

      {/* the plan and the ways, centred in the room left: one screen, nothing scrolls (on a screen too short, it starts under the title) */}
      <div className="flex min-h-0 flex-1 flex-col pb-[3dvh]">
        <div className="my-auto">
          {/* the plan */}
          <section className="relative mt-[1.6dvh] overflow-hidden rounded-[1.75rem] bg-[linear-gradient(140deg,#7c4dff,#6c47ff_45%,#3f22c9)] p-5 text-white [@media(max-height:540px)]:p-4">
            <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_0%_0%,rgb(255_255_255/0.25),transparent_60%)]" aria-hidden />
            <div className="relative flex items-start justify-between gap-3">
              <span>
                <span className="block text-[0.875rem] font-semibold text-white/80">{t.payPlan}</span>
                <span className="mt-1 flex items-end gap-1.5">
                  <span className="num text-[2.75rem] font-bold leading-none">{t.payPrice}</span>
                  <span className="pb-1 text-[0.9375rem] font-bold">
                    {t.payCurrency} <span className="font-semibold text-white/80">{t.payPer}</span>
                  </span>
                </span>
              </span>
              <Icon3D name="crown" size={52} className="shrink-0 drop-shadow-[0_8px_14px_rgb(0_0_0/0.3)]" />
            </div>
            {offer && pay && (
              <div className="relative mt-3 flex items-center gap-2 rounded-[1rem] bg-white/15 px-3 py-2 backdrop-blur">
                <Sparkles className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 text-[0.875rem] font-bold">
                  <bdi className="num">+3</bdi> {t.payOfferPlus.replace("+3 ", "")}
                </span>
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[0.8125rem] font-bold text-brand">
                  <Clock className="size-3.5" /> <Left until={pay.offer_until!} />
                </span>
              </div>
            )}
            <ul className="relative mt-3 space-y-1.5">
              {t.payPerks.map((p) => (
                <li key={p} className="flex items-start gap-2 text-[0.875rem] text-white/95">
                  <Check className="mt-0.5 size-4 shrink-0" strokeWidth={3} /> {p}
                </li>
              ))}
            </ul>
          </section>

          {paid && pay?.paid_until ? (
            <p className="mt-4 flex items-center justify-center gap-2 rounded-[1.25rem] bg-mint-soft px-4 py-3.5 text-[1rem] font-bold text-mint">
              <Check className="size-5" strokeWidth={3} /> {fill(t.payPaidUntil, { date: day(pay.paid_until) })}
            </p>
          ) : (
            <PayMethods support={settings.supportPhone} shop={me.shop.name} months={months} />
          )}
        </div>
      </div>
    </Screen>
  );
}
