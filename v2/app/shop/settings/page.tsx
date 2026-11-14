import Link from "@/components/Link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ChartColumn, ChevronLeft, Crown, History, ShoppingCart, SlidersHorizontal, Ticket, UserPlus, UserRound, WalletCards } from "lucide-react";
import { optionsOn } from "@/components/CardOptions";
import { ExportRow } from "@/components/ExportRow";
import { HelpButton } from "@/components/Help";
import { InstallButton } from "@/components/InstallButton";
import { LogoutButton } from "@/components/LogoutButton";
import { OwnerBell } from "@/components/OwnerBell";
import type { Pay } from "@/components/Pay";
import { ShopMark } from "@/components/ShopMark";
import { Top } from "@/components/Top";
import { Mark } from "@/components/Owner";
import { Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { getHelp } from "@/lib/settings";
import { lapsed } from "@/lib/plans";
import { call } from "@/lib/supabase";
import { daysN, fill, t } from "@/lib/t";

export const metadata = { title: "المحل", robots: { index: false } };

const day = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Tunis" }).format(new Date(iso));
/** «السبت 15 نوفمبر، 10:51»: when the next file of the customers can be taken */
const moment = (iso: string) => {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("ar-TN-u-nu-latn", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Tunis" }).format(d);
  const hour = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Africa/Tunis" }).format(d);
  return `${date}، ${hour}`;
};

/** One line of the list: a picture, what it is, how it stands now, and the way in. */
function Row({ href, mark, title, sub }: { href: string; mark: ReactNode; title: string; sub?: string | null }) {
  return (
    <Link href={href} className="press flex items-center gap-3 px-3.5 py-[clamp(0.5rem,1.4dvh,0.8rem)] active:bg-canvas">
      <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-[0.75rem]">{mark}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem] font-bold">{title}</span>
        {/* how it stands now: the smallest phones keep the list whole, without it */}
        {sub && <span className="block truncate text-[0.8125rem] text-muted [@media(max-height:520px)]:hidden">{sub}</span>}
      </span>
      <ChevronLeft className="size-4 shrink-0 text-faint" />
    </Link>
  );
}

const Group = ({ children }: { children: ReactNode }) => <div className="divide-y divide-line overflow-hidden rounded-[1.375rem] bg-surface shadow-card">{children}</div>;

/**
 * «المحل»: everything an owner sets, once in a while, in one list — the
 * name and the logo, the card (or the store, the wheel), what the shop sells,
 * the numbers, the subscription, the account — each line saying how it
 * stands now, one tap from changing it. The home keeps the everyday things.
 */
export default async function ShopSettings() {
  const me = await getMe();
  if (!me) redirect("/shop/new");
  if (!me.shop) redirect("/shop/setup");
  if (!me.shop.goal) redirect("/shop/card");
  const shop = me.shop;
  // «تحميل البيانات»: only for a shop the founder allowed it, from the console (off for every shop)
  const [pay, help, exportState, bell] = await Promise.all([
    call<Pay | null>("my_payment"),
    getHelp(),
    call<{ on: boolean; open?: boolean; last?: string | null; next?: string | null }>("my_export_state"),
    call<{ unread: number } | null>("my_bell"),
  ]);
  // eslint-disable-next-line react-hooks/purity -- a server page: the clock is read once per request
  const daysLeft = pay?.trial_until ? Math.max(0, Math.ceil((Date.parse(pay.trial_until) - Date.now()) / 86_400_000)) : 0;
  const plan = pay?.paid && pay.paid_until
    ? fill(t.setPaid, { date: day(pay.paid_until) })
    : pay?.exempt
      ? null
      : pay?.shut
        ? lapsed(pay)
          ? t.planOverTitle
          : t.trialOverTitle
        : pay?.trial_started === false
          ? t.trialWaits
          : fill(t.setTrial, { n: daysN(daysLeft) });
  // «خيارات الكارط»: the card's rules, and which are on
  const options = optionsOn(shop);
  // the card's line: the store in its place, for a shop the founder switched; a card on the wheel says so
  // (the wheel is chosen there, among the gifts: no line of its own since 17 Oct 2026)
  const card = shop.store_on
    ? { href: "/shop/store", icon: ShoppingCart, title: t.storeOwnerTitle, sub: null }
    : shop.wheel_on
      ? { href: "/shop/card?from=settings", icon: Ticket, title: t.cardTitle, sub: fill(t.setCardWheel, { goal: shop.goal ?? 0 }) }
      : { href: "/shop/card?from=settings", icon: Ticket, title: t.cardTitle, sub: fill(t.setCard, { goal: shop.goal ?? 0, gift: shop.gift ?? "" }) };

  return (
    <Screen>
      <Top
        back="/shop"
        end={
          <span className="flex items-center gap-2">
            <InstallButton where="settings" look="icon" />
            <OwnerBell unread={bell?.unread ?? 0} />
            <HelpButton help={help} />
          </span>
        }
        title={t.setTitle}
      />
      {/* the rows have grown (the roulette has its own since every shop may have it, 18 Oct 2026):
          on a short phone the gaps give way first, so the whole shop still fits on one screen */}
      <div className="mt-[2dvh] flex flex-col gap-[1.6dvh] pb-3 [@media(max-height:700px)]:mt-[1dvh] [@media(max-height:700px)]:gap-[0.9dvh] [@media(max-height:700px)]:pb-1">
        <Group>
          <Row
            href="/shop/setup?edit=1"
            mark={
              <span className="grid size-9 place-items-center rounded-[0.75rem]" style={{ background: shop.color }}>
                <ShopMark shop={shop} size={24} />
              </span>
            }
            title={shop.name}
            sub={`${t.setShop} · ${t.kinds[shop.kind] ?? ""}`}
          />
          <Row href={card.href} mark={<Mark icon={card.icon} />} title={card.title} sub={card.sub} />
          {/* every rule of the card on one page (14 Nov 2026) — the roulette, the customer choosing the gift, «شنوّة
              تبيع», the clock — turned on and changed there. Its line says what is on, so «المحل» stays one short
              list that fits a small phone's screen */}
          <Row href="/shop/options" mark={<Mark icon={SlidersHorizontal} />} title={t.optTitle} sub={options} />
        </Group>
        <Group>
          <Row href="/shop/history?from=settings" mark={<Mark icon={History} />} title={t.histTitle} sub={t.histRowSub} />
          {/* the sign-up code: only for a shop the founder turned it on for (off, the owner never sees it) */}
          {shop.join_on && <Row href="/shop/join" mark={<Mark icon={UserPlus} />} title={t.joinCodeTitle} sub={t.joinRowSub} />}
          {/* the numbers, one row: «شكون رجع؟» is the big button at the bottom of «الأرقام» (13 Nov 2026: one row less, so
              «المحل» stays one screen on a small phone) */}
          <Row href="/shop/stats?from=settings" mark={<Mark icon={ChartColumn} />} title={t.statsTitle} sub={t.setStatsSub} />
          {/* the customers as a file, once a week, for a shop the founder allowed it (components/ExportRow.tsx) */}
          {exportState?.on && (
            <ExportRow
              open={!!exportState.open}
              next={exportState.next ? moment(exportState.next) : null}
              shut={exportState.open && exportState.next && exportState.last ? new Date(Date.parse(exportState.last) + 30 * 60_000).toISOString() : null}
            />
          )}
          {plan && <Row href="/shop/pay?from=settings" mark={<Mark icon={Crown} />} title={t.payTitle} sub={plan} />}
        </Group>
        {/* the account and the owner's own cards at other shops, side by side (13 Nov 2026: a row less — «المحل»
            stays one screen on a small phone, with the clock on and the app not installed yet) */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { href: "/me", icon: UserRound, label: t.account },
            { href: "/wallet", icon: WalletCards, label: t.myCards },
          ].map((x) => (
            <Link key={x.href} href={x.href} className="press flex min-w-0 items-center justify-center gap-2 rounded-[1.125rem] bg-surface px-2 py-[clamp(0.6rem,1.6dvh,0.875rem)] shadow-card">
              <x.icon className="size-5 shrink-0 text-brand" strokeWidth={2.2} />
              <span className="min-w-0 truncate text-[0.9375rem] font-bold">{x.label}</span>
            </Link>
          ))}
        </div>
        <LogoutButton className="mt-0" />
      </div>
    </Screen>
  );
}
