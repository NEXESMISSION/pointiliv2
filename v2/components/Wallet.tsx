import Link from "next/link";
import QRCode from "qrcode";
import { ChevronLeft, ChevronRight, Lock, QrCode, ScanLine } from "lucide-react";
import { InstallApp, InstallPopup } from "@/components/InstallApp";
import { MyCode } from "@/components/MyCode";
import { ShopMark } from "@/components/ShopMark";
import { Mark } from "@/components/Tracker";
import { Icon3D, LinkBtn, Logo, Screen } from "@/components/ui";
import { siteOrigin } from "@/lib/origin";
import type { Me } from "@/lib/session";
import { fill, t } from "@/lib/t";
import type { CardView } from "@/lib/types";

/**
 * The customer's cards, the newest visit first, the gift that waits on top,
 * and the one thing to do here: scan. An owner opens it from the account
 * page (`back` then leads home to the shop). «الكود متاعي» at the top: the
 * customer's own code, for a shop that gives the tampon itself.
 */
export async function Wallet({ me, cards, back }: { me: Me; cards: CardView[]; back?: string }) {
  const first = (me.name ?? "").split(" ")[0];
  const waiting = cards.filter((c) => c.ready);
  const svg = me.code ? await QRCode.toString(`${await siteOrigin()}/u/${me.code}`, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0F0E17", light: "#FFFFFF" } }) : null;

  return (
    <Screen>
      <Mark screen="wallet" />
      {/* Pointili on the home screen, asked once where Android's Chrome offers it (the customer's own home only) */}
      {!back && <InstallPopup where="wallet" who={me.id} show={!(me.seen ?? []).includes("install")} />}
      <header className="flex shrink-0 items-center justify-between pt-2">
        {back ? (
          <Link href={back} className="press grid size-11 place-items-center rounded-full bg-surface shadow-card" aria-label={t.back}>
            <ChevronRight className="size-5" />
          </Link>
        ) : (
          <Link href="/me" className="press grid size-11 place-items-center rounded-full bg-[linear-gradient(145deg,#ffb18a,#ff6b4a)] text-[0.9375rem] font-bold text-white shadow-card" aria-label={t.account}>
            {(first?.[0] ?? "؟").toUpperCase()}
          </Link>
        )}
        {me.code && svg ? <MyCode code={me.code} svg={svg} /> : <Logo />}
      </header>

      <div className="mt-[1.5dvh] shrink-0">
        <p className="flex items-center gap-1.5 text-[0.9375rem] text-muted">
          {t.hello} <Icon3D name="wave" size={22} />
        </p>
        <h1 className="mt-0.5 truncate text-[1.5rem] font-bold leading-tight">{back ? t.myCards : first || t.myCards}</h1>
        {/* Pointili on the home screen: Android's own dialog, or on an iPhone the guide to the three taps */}
        {!back && <InstallApp where="wallet" className="mt-2 h-9 text-[0.8125rem]" />}
        {/* an account made at the counter has no password the person knows: one line asks for one, until it is set */}
        {me.password_set === false && (
          <Link href="/me" className="press mt-2 flex items-center gap-2 rounded-full bg-brand-soft px-3.5 py-2 text-[0.8125rem] font-bold text-brand">
            <Lock className="size-4 shrink-0" /> <span className="min-w-0 flex-1 truncate">{t.passwordAsk}</span> <ChevronLeft className="size-4 shrink-0" />
          </Link>
        )}
      </div>

      {/* a gift waiting: its code, to show at the counter (the shop scans it and hands the gift over) */}
      {waiting.length > 0 &&
        (waiting[0]!.spin ? (
          <Link href={`/c/${waiting[0]!.id}`} className="press relative mt-[2dvh] block shrink-0 animate-rise overflow-hidden rounded-[1.25rem] bg-surface p-3.5 pe-20 shadow-card">
            <span className="absolute end-3 top-1/2 -translate-y-1/2" aria-hidden>
              <Icon3D name="party" size={50} className="animate-float" />
            </span>
            <b className="block text-[0.9375rem] font-bold">{t.wheelWaits}</b>
            <span className="block truncate text-[0.8125rem] text-muted">{waiting[0]!.shop.name}</span>
            <span className="mt-1.5 inline-flex items-center gap-1.5 text-[0.8125rem] font-bold text-coral">{t.wheelGo}</span>
          </Link>
        ) : me.code && svg ? (
          <MyCode code={me.code} svg={svg} gift={waiting[0]!.won ?? waiting[0]!.shop.gift} className="press relative mt-[2dvh] block w-full shrink-0 animate-rise overflow-hidden rounded-[1.25rem] bg-surface p-3.5 pe-20 text-start shadow-card">
            <span className="absolute end-3 top-1/2 -translate-y-1/2" aria-hidden>
              <Icon3D name="gift" size={52} className="animate-float" />
            </span>
            <b className="block text-[0.9375rem] font-bold">{t.giftWaiting}</b>
            <span className="block truncate text-[0.8125rem] text-muted">{fill(t.giftAt, { gift: waiting[0]!.won ?? waiting[0]!.shop.gift ?? "", shop: waiting[0]!.shop.name })}</span>
            <span className="mt-1.5 inline-flex items-center gap-1.5 text-[0.8125rem] font-bold text-coral">
              <QrCode className="size-4" /> {t.giftShow}
            </span>
          </MyCode>
        ) : (
          <Link href={`/c/${waiting[0]!.id}`} className="press relative mt-[2dvh] block shrink-0 animate-rise overflow-hidden rounded-[1.25rem] bg-surface p-3.5 pe-20 shadow-card">
            <span className="absolute end-3 top-1/2 -translate-y-1/2" aria-hidden>
              <Icon3D name="gift" size={52} className="animate-float" />
            </span>
            <b className="block text-[0.9375rem] font-bold">{t.giftWaiting}</b>
            <span className="block truncate text-[0.8125rem] text-muted">{fill(t.giftAt, { gift: waiting[0]!.won ?? waiting[0]!.shop.gift ?? "", shop: waiting[0]!.shop.name })}</span>
          </Link>
        ))}

      {/* an order from a store waiting (and no gift): the way to its card, where the code is */}
      {waiting.length === 0 &&
        (() => {
          const ordered = cards.find((c) => (c.orders_n ?? 0) > 0);
          return ordered ? (
            <Link href={`/c/${ordered.id}`} className="press relative mt-[2dvh] block shrink-0 animate-rise overflow-hidden rounded-[1.25rem] bg-surface p-3.5 pe-20 shadow-card">
              <span className="absolute end-3 top-1/2 -translate-y-1/2" aria-hidden>
                <Icon3D name="cart" size={50} className="animate-float" />
              </span>
              <b className="block text-[0.9375rem] font-bold">{t.storeOrderWaits}</b>
              <span className="block truncate text-[0.8125rem] text-muted">{fill(t.storeOrderAt, { shop: ordered.shop.name })}</span>
              <span className="mt-1.5 inline-flex items-center gap-1.5 text-[0.8125rem] font-bold text-coral">
                <QrCode className="size-4" /> {t.storeShow}
              </span>
            </Link>
          ) : null;
        })()}

      {cards.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
          <Icon3D name="ticket" size={96} className="animate-float" />
          <h2 className="mt-5 text-[1.25rem] font-bold">{t.noCards}</h2>
          <p className="mt-1.5 max-w-[16rem] text-[0.9375rem] text-muted">{t.noCardsBody}</p>
          {/* an owner who took the customer's door by mistake (an ad sends owners): the way to their shop, from here */}
          <Link href="/shop/setup" className="press mt-4 flex h-11 items-center gap-1.5 rounded-full bg-surface px-4 text-[0.9375rem] font-bold text-brand shadow-card">
            <Icon3D name="shop" size={22} /> {t.walletOwner} ←
          </Link>
        </div>
      ) : (
        // the cards scroll inside their own box: the page, the title and the scan button stay put
        <section className="mt-[2.5dvh] flex min-h-0 flex-1 flex-col">
          {!back && <h2 className="mb-2 shrink-0 px-0.5 text-[0.9375rem] font-bold">{t.myCards}</h2>}
          {/* one line a card: what the shop is, how far the gift is, what waits — the card itself one tap away */}
          <div data-list className="-mx-2 min-h-0 overflow-y-auto overscroll-contain px-2 pb-2">
            <ul className="divide-y divide-line overflow-hidden rounded-[1.375rem] bg-surface shadow-card">
              {cards.map((c, i) => (
                <li key={c.id} className="animate-rise" style={{ animationDelay: `${i * 60}ms` }}>
                  <CardRow card={c} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* the one thing a customer does here */}
      <div className="shrink-0 pb-[2dvh] pt-[1.5dvh]">
        <LinkBtn href="/scan" className="h-14 animate-breathe rounded-[1.25rem] text-[1.0625rem]">
          <ScanLine className="size-6" strokeWidth={2.4} /> {t.scan}
        </LinkBtn>
      </div>
    </Screen>
  );
}

/**
 * One card in the wallet, as a line: the shop's mark in its colour, its name,
 * a bar that fills to the gift, and the count — or what waits (the gift, the
 * roulette, an order), said in the shop's colour.
 */
function CardRow({ card: c }: { card: CardView }) {
  const goal = c.shop.goal ?? 10;
  const done = Math.min(c.stamps, goal);
  const left = goal - done;
  const waits = c.spin ? t.wheelWaits : c.ready ? fill((c.waiting_n ?? 1) > 1 ? t.wonMany : t.won, { gift: c.won ?? c.shop.gift ?? "", n: c.waiting_n ?? 1 }) : (c.orders_n ?? 0) > 0 ? t.storeOrderWaits : null;
  const line = c.shop.store
    ? `${c.stamps} ${t.storeBalance}`
    : c.shop.wheel
      ? left === 1
        ? t.wheelToGoOne
        : fill(t.wheelToGo, { n: left })
      : left === 1
        ? fill(t.toGoOne, { gift: c.shop.gift ?? "" })
        : fill(t.toGo, { n: left, gift: c.shop.gift ?? "" });
  return (
    <Link href={`/c/${c.id}`} className="press flex items-center gap-3 px-3.5 py-3 active:bg-canvas">
      <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-[0.9rem]" style={{ background: c.shop.color }}>
        <ShopMark shop={c.shop} size={30} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span dir="auto" className="min-w-0 truncate text-[0.9375rem] font-bold">
            {c.shop.name}
          </span>
          {!c.shop.store && (
            <span className="num shrink-0 text-[0.8125rem] font-bold" style={{ color: c.shop.color }}>
              {done}
              <span className="text-muted">/{goal}</span>
            </span>
          )}
        </span>
        {!c.shop.store && (
          <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-canvas" aria-hidden>
            <span className="block h-full rounded-full" style={{ width: `${Math.round((done / goal) * 100)}%`, background: c.shop.color }} />
          </span>
        )}
        <span className={`mt-1 block truncate text-[0.8125rem] ${waits ? "font-bold" : "text-muted"}`} style={waits ? { color: c.shop.color } : undefined}>
          {waits ?? line}
        </span>
      </span>
      <ChevronLeft className="size-5 shrink-0 text-faint" />
    </Link>
  );
}
