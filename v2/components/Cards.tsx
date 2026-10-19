"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ChevronLeft, Lock, QrCode, ScanLine } from "lucide-react";
import { Back } from "@/components/Back";
import { Go } from "@/components/Go";
import { InstallApp, InstallPopup } from "@/components/InstallApp";
import { Live } from "@/components/Live";
import { MyCode } from "@/components/MyCode";
import { PushAsk } from "@/components/PushAsk";
import { ShopMark } from "@/components/ShopMark";
import { Mark } from "@/components/Tracker";
import { Icon3D, Screen } from "@/components/ui";
import { fill, t } from "@/lib/t";
import { nextTampon } from "@/lib/when";
import type { CardView } from "@/lib/types";

/**
 * The customer's cards — the screen they open the app to see.
 *
 * Built again from nothing in October 2026 (the founder, 18 Oct: «i really
 * dont like how the client pages look, all of them… lets do something totally
 * different on the side, and when we are done with it we can do the main
 * change»), tried at /next beside the live one, and moved over it on 19 Oct.
 *
 * THE RULE THE OLD ONE BROKE: a person has ONE code, not one per shop. It was
 * drawn inside every card, so the same QR stacked up as many times as the
 * person had cards — «the client can have multiple qr stacked for the same
 * owner». Here it is one button, in one place, and it is the same code at
 * every counter; a card says how far the gift is and what is in the way.
 *
 * Three looks were drawn and the founder chose this one: the shop's own
 * colour, a block each — «tal9a elli t7eb 3la 7sab el loun», you find the card
 * you want by its colour before you have read a word.
 *
 * What the numbers said before a line of it was drawn (18 Oct): a quarter of
 * everything ever done on a card page (150 taps of 556) reached for something
 * that was not there, and the wait between two tampons was only ever met as a
 * refusal after scanning. So every card says what it is doing, and nothing
 * here needs a refresh: `Live` hears the tampon land.
 *
 * An owner collects stamps elsewhere too and opens this from their account
 * (`back` then leads home, and the asks that belong to a customer's own home
 * — the install, a word to this phone — stay out of their way).
 */
export function Cards({
  me,
  name,
  code,
  svg,
  cards,
  seen,
  passwordSet,
  back,
}: {
  me: string;
  name: string;
  code: string | null;
  svg: string | null;
  cards: CardView[];
  seen: string[];
  passwordSet: boolean;
  back?: string;
}) {
  const first = (name.split(" ")[0] ?? "").trim();
  const now = useNow();
  // the gift the code is for, if one waits: the sheet then says «show this and
  // take it» instead of «show this and he adds a tampon»
  const gift = cards.find((c) => c.ready && !c.spin);
  const shown = code && svg;

  return (
    <Screen>
      <Mark screen="wallet" />
      {/* the tampon lands here by itself: nobody pulls the page down */}
      <Live me={me} />
      {/* Pointili on the home screen, asked once where Android's Chrome offers it (a customer's own home only) */}
      {!back && <InstallPopup where="wallet" who={me} show={!seen.includes("install")} />}

      <header className="flex shrink-0 items-center justify-between pt-2">
        {back ? (
          <Back home={back} />
        ) : (
          // the way to the account: the person's own initial, quiet — coral is a gift
          // here, and an account is not one (the founder, 18 Oct 2026)
          <Link href="/me" aria-label={t.account} className="press grid size-11 place-items-center rounded-full bg-surface text-[1.0625rem] font-bold text-ink shadow-card">
            {(first[0] ?? "؟").toUpperCase()}
          </Link>
        )}
        <h1 className="min-w-0 truncate text-[0.9375rem] font-bold text-muted">{back ? t.myCards : first ? fill(t.hiName, { name: first }) : t.hi}</h1>
      </header>

      {/* Pointili on the home screen: Android's own dialog, or on an iPhone the guide to the three taps */}
      {!back && <InstallApp where="wallet" className="mt-1.5 h-9 shrink-0 text-[0.8125rem]" />}
      {/* an account made at the counter has no password the person knows: one line asks for one, until it is set */}
      {!passwordSet && (
        <Link href="/me" className="press mt-1.5 flex shrink-0 items-center gap-2 rounded-full bg-brand-soft px-3.5 py-2 text-[0.8125rem] font-bold text-brand">
          <Lock className="size-4 shrink-0" /> <span className="min-w-0 flex-1 truncate">{t.passwordAsk}</span> <ChevronLeft className="size-4 shrink-0" />
        </Link>
      )}

      {cards.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
          <Icon3D name="ticket" size={96} className="animate-float" />
          <h2 className="mt-5 text-[1.25rem] font-bold">{t.noCards}</h2>
          <p className="mt-1.5 max-w-[16rem] text-[0.9375rem] text-muted">{t.noCardsBody}</p>
          {/* an owner who came in by the customer's door (an ad sends owners): their shop, from here */}
          <Link href="/shop/setup" className="press mt-4 flex h-11 items-center gap-1.5 rounded-full bg-surface px-4 text-[0.9375rem] font-bold text-brand shadow-card">
            <Icon3D name="shop" size={22} /> {t.walletOwner} ←
          </Link>
        </div>
      ) : (
        // the cards scroll inside their own box: the header and the two buttons stay put
        <div data-list className="mt-[2dvh] min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pb-2">
          {cards.map((c, i) => (
            <Link
              key={c.id}
              href={`/c/${c.id}`}
              aria-label={c.shop.name}
              className="press flex animate-rise items-center gap-3 rounded-[1.5rem] px-3.5 py-3 text-white shadow-card"
              style={{ background: tone(c), animationDelay: `${i * 60}ms` }}
            >
              <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-[0.875rem] bg-white/15">
                <ShopMark shop={c.shop} size={26} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[1.0625rem] font-bold">{c.shop.name}</span>
                <span className="block truncate text-[0.8125rem] text-white/85">{says(c, now)}</span>
              </span>
              {/* something waiting at the counter is said in a picture as well as in words: the
                  coral alone cannot carry it, since a shop may have chosen coral for itself
                  (Café Yasmine, 19 Oct 2026). How far the next card has got waits its turn. */}
              {waits(c) ? (
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/25">
                  <Icon3D name={c.spin ? "party" : c.ready ? "gift" : "cart"} size={24} className="animate-float" />
                </span>
              ) : (
                <span className="num shrink-0 text-[1.25rem] font-bold tabular-nums">
                  {c.stamps}
                  {!c.shop.store && <span className="text-[0.875rem] opacity-70">/{c.shop.goal ?? 10}</span>}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* a word when the gift is near, asked here because here is where customers are — and
          never while something waits at a counter: one thing is asked at a time (18 Oct 2026) */}
      {!back && !cards.some(waits) && cards.some((c) => c.stamps > 0) && !seen.includes("push") && <PushAsk shop={cards.find((c) => c.stamps > 0)!.shop.name} compact />}

      {/* the two things a customer ever does, side by side and never moving */}
      <div className="grid shrink-0 grid-cols-2 gap-2 pb-[2dvh] pt-[1.5dvh]">
        {shown && (
          <MyCode
            code={code}
            svg={svg}
            gift={gift ? (gift.won ?? gift.shop.gift) : undefined}
            className="press flex h-[3.5rem] items-center justify-center gap-2 rounded-[1.25rem] bg-surface text-[1rem] font-bold text-ink shadow-card"
          >
            <QrCode className="size-5 text-brand" /> {t.myCode}
          </MyCode>
        )}
        <Go
          href="/scan"
          icon={<ScanLine className="size-5" strokeWidth={2.4} />}
          className={`flex h-[3.5rem] items-center justify-center gap-2 rounded-[1.25rem] bg-brand text-[1rem] font-bold text-white shadow-[0_14px_30px_-14px_rgb(108_71_255/0.9)] ${shown ? "" : "col-span-2"}`}
        >
          {t.scan}
        </Go>
      </div>
    </Screen>
  );
}

/** something of this card's waits at the counter: a gift, a turn of the wheel, an order */
const waits = (c: CardView) => !!c.spin || c.ready || (c.orders_n ?? 0) > 0;

/** a card's colour: a stopped shop goes grey (nothing will land on it), something waiting is coral, else the shop's own */
const tone = (c: CardView) => (c.shop.paused ? "var(--color-faint)" : waits(c) ? "var(--color-coral)" : c.shop.color);

/**
 * What a card has to say, in the order it matters: a shop that is stopped says
 * so (the app looked broken when it was the shop that had stopped), then
 * whatever waits at the counter, then — when another tampon cannot land yet —
 * WHEN it can, and only then how far the gift is.
 */
function says(c: CardView, now: number | null): string {
  if (c.shop.paused) return t.cardPaused;
  if (c.spin) return (c.spins_n ?? 1) > 1 ? fill(t.wheelWaitsMany, { n: c.spins_n ?? 2 }) : t.wheelWaits;
  if (c.ready) return (c.waiting_n ?? 1) > 1 ? fill(t.readyMany, { n: c.waiting_n ?? 2 }) : t.ready;
  if ((c.orders_n ?? 0) > 0) return t.storeOrderWaits;
  if (c.shop.store) return `${c.stamps} ${t.storeBalance}`;
  const gap = c.shop.gap ?? 0;
  if (now && gap > 0 && c.last_at) {
    const next = new Date(c.last_at).getTime() + gap * 60_000;
    if (next > now) return fill(t.cardSoon, { when: nextTampon(new Date(next).toISOString(), new Date(now)) });
  }
  const left = Math.max((c.shop.goal ?? 10) - c.stamps, 0);
  if (c.shop.wheel) return left === 1 ? t.wheelToGoOne : fill(t.wheelToGo, { n: left });
  return left === 1 ? fill(t.toGoOne, { gift: c.shop.gift ?? "" }) : fill(t.toGo, { n: left, gift: c.shop.gift ?? "" });
}

/**
 * The clock: null while the server draws the page, the phone's own once it is
 * on the phone — a time rendered on both sides never agrees — and it keeps
 * itself, because a card that says «تامبون جديد على 15:30» has to stop saying
 * it at 15:30.
 *
 * Told in half-minutes, since that is all a line like that needs: the reading
 * has to be the same number between two beats, or React would redraw the
 * screen as fast as it could ask for the time.
 */
const BEAT = 30_000;
const useNow = (): number | null =>
  useSyncExternalStore(
    (beat) => {
      const id = setInterval(beat, BEAT);
      return () => clearInterval(id);
    },
    () => Math.floor(Date.now() / BEAT) * BEAT,
    () => null,
  );
