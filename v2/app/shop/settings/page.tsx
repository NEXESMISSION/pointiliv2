import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ChartColumn, ChevronLeft, Crown, PieChart, ShoppingBasket, ShoppingCart, Ticket, UserRound, WalletCards } from "lucide-react";
import { HelpButton } from "@/components/Help";
import { LogoutButton } from "@/components/LogoutButton";
import type { Pay } from "@/components/Pay";
import { ShopMark } from "@/components/ShopMark";
import { Top } from "@/components/Top";
import { Mark } from "@/components/Owner";
import { Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { getHelp } from "@/lib/settings";
import { call } from "@/lib/supabase";
import { daysN, fill, t } from "@/lib/t";

export const metadata = { title: "المحل", robots: { index: false } };

const day = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Tunis" }).format(new Date(iso));

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
  const [pay, help] = await Promise.all([call<Pay | null>("my_payment"), getHelp()]);
  // eslint-disable-next-line react-hooks/purity -- a server page: the clock is read once per request
  const daysLeft = pay?.trial_until ? Math.max(0, Math.ceil((Date.parse(pay.trial_until) - Date.now()) / 86_400_000)) : 0;
  const plan = pay?.paid && pay.paid_until
    ? fill(t.setPaid, { date: day(pay.paid_until) })
    : pay?.exempt
      ? null
      : pay?.shut
        ? t.trialOverTitle
        : pay?.trial_started === false
          ? t.trialWaits
          : fill(t.setTrial, { n: daysN(daysLeft) });
  // the card's line: the store in its place, for a shop the founder switched; a card on the wheel says so
  // (the wheel is chosen there, among the gifts: no line of its own since 17 Oct 2026)
  const card = shop.store_on
    ? { href: "/shop/store", icon: ShoppingCart, title: t.storeOwnerTitle, sub: null }
    : shop.wheel_on
      ? { href: "/shop/card", icon: Ticket, title: t.cardTitle, sub: fill(t.setCardWheel, { goal: shop.goal ?? 0 }) }
      : { href: "/shop/card", icon: Ticket, title: t.cardTitle, sub: fill(t.setCard, { goal: shop.goal ?? 0, gift: shop.gift ?? "" }) };

  return (
    <Screen>
      <Top back="/shop" end={<HelpButton help={help} />} title={t.setTitle} />
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
          {/* the wheel's own page — its prizes, each one's chance, and what fell — for a shop the
              founder allowed it. It had no way in since the wheel moved into the card's question. */}
          {(shop.wheel_allowed || shop.wheel_on) && (
            <Row href="/shop/wheel" mark={<Mark icon={PieChart} />} title={t.wheelOwnerTitle} sub={shop.wheel_on ? t.wheelSetOn : t.wheelSetOff} />
          )}
          <Row href="/shop/items" mark={<Mark icon={ShoppingBasket} />} title={t.itemsTile} sub={shop.items_on ? t.setItemsOn : t.setItemsOff} />
        </Group>
        <Group>
          <Row href="/shop/stats" mark={<Mark icon={ChartColumn} />} title={t.statsTitle} sub={t.setStatsSub} />
          {plan && <Row href="/shop/pay" mark={<Mark icon={Crown} />} title={t.payTitle} sub={plan} />}
        </Group>
        <Group>
          <Row href="/me" mark={<Mark icon={UserRound} />} title={t.account} sub={me.name ?? null} />
          <Row href="/wallet" mark={<Mark icon={WalletCards} />} title={t.myCards} sub={t.setMine} />
        </Group>
        <LogoutButton className="mt-0" />
      </div>
    </Screen>
  );
}
