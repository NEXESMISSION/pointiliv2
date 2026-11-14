import Link from "@/components/Link";
import { ChevronLeft, Gift, Hourglass, PieChart, ShoppingBasket, type LucideIcon } from "lucide-react";
import { Top } from "@/components/Top";
import { daysN, fill, t } from "@/lib/t";
import type { Shop } from "@/lib/session";

/** a gift the customer chooses: its options are written in the card's one gift text, «قهوة · كرواسون» */
export const giftIsChoice = (gift: string | null | undefined) => (gift ?? "").includes(" · ");

/**
 * What is on, in a few words — the line under «خيارات الكارط» in «المحل» («الروليت · شنوّة تبيع»), or what the
 * page holds when nothing is on yet.
 */
export function optionsOn(shop: Shop): string {
  const on = [
    shop.wheel_on && t.optWheel,
    !shop.store_on && giftIsChoice(shop.gift) && t.optChoice,
    shop.items_on && t.optItems,
    shop.clock_on && !shop.store_on && shop.reset_days && t.optReset,
  ].filter(Boolean);
  return on.length ? on.join(" · ") : t.optNone;
}

/**
 * «خيارات الكارط» (14 Nov 2026): every rule of the card on one page — the roulette, the customer choosing the gift,
 * «شنوّة تبيع», the card going back to zero — each with a line saying whether it is on, each opening its own page
 * (`?from=options`: its «ارجع» comes back here). «المحل» keeps one row for all of them, so it stays one short list
 * that fits a small phone. The rows show when main's «المحل» showed them: the roulette for a shop the founder
 * allows it, the clock while his switch is on, the choice of gift for a card shop.
 */
export function CardOptions({ shop }: { shop: Shop }) {
  const choice = giftIsChoice(shop.gift);
  const rows: { key: string; show: boolean; href: string; icon: LucideIcon; title: string; sub: string; on: boolean; tone?: "coral" }[] = [
    {
      key: "wheel",
      show: !!shop.wheel_allowed || !!shop.wheel_on,
      href: "/shop/wheel?from=options",
      icon: PieChart,
      title: t.wheelOwnerTitle,
      sub: shop.wheel_on ? t.optWheelOn : t.optWheelOff,
      on: !!shop.wheel_on,
    },
    {
      key: "choice",
      show: !shop.store_on,
      href: "/shop/choices?from=options",
      icon: Gift,
      title: t.optChoiceTitle,
      sub: choice ? (shop.gift ?? "") : t.optChoiceOff,
      on: choice,
      tone: "coral",
    },
    {
      key: "items",
      show: true,
      href: "/shop/items?from=options",
      icon: ShoppingBasket,
      title: t.itemsWhatYouSell,
      sub: shop.items_on ? t.optItemsOn : t.optOff,
      on: !!shop.items_on,
    },
    {
      key: "reset",
      show: !!shop.clock_on && !shop.store_on,
      href: "/shop/clock?from=options",
      icon: Hourglass,
      title: t.setReset,
      sub: shop.reset_days ? `${shop.reset_paused ? `${t.clockPausedChip} · ` : ""}${fill(t.setResetOn, { days: daysN(shop.reset_days) })}` : t.setResetOff,
      on: !!shop.reset_days,
    },
  ];
  return (
    <>
      <Top back="/shop/settings" title={t.optTitle} hint={t.optHint} />
      <div data-list className="-mx-1 mt-[1.5dvh] min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-1 pb-4">
        {rows
          .filter((r) => r.show)
          .map((r) => (
            <Link key={r.key} href={r.href} className="press flex items-center gap-3 rounded-[1.125rem] bg-surface p-3.5 shadow-card">
              <span className={`grid size-10 shrink-0 place-items-center rounded-[0.75rem] ${r.on ? (r.tone === "coral" ? "bg-coral text-white" : "bg-brand text-white") : "bg-canvas text-muted"}`}>
                <r.icon className="size-5" strokeWidth={2.2} />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block text-[0.9375rem]">{r.title}</b>
                <span className="block truncate text-[0.8125rem] text-muted">{r.sub}</span>
              </span>
              <ChevronLeft className="size-5 shrink-0 text-faint" />
            </Link>
          ))}
      </div>
    </>
  );
}
