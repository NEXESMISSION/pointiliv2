import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { QrCode, ScanLine } from "lucide-react";
import { CardStore } from "@/components/CardStore";
import { CardTap } from "@/components/CardTap";
import { CardWheel } from "@/components/CardWheel";
import type { Prize } from "@/components/Wheel";
import { MyCode } from "@/components/MyCode";
import { PushAsk } from "@/components/PushAsk";
import { Pass } from "@/components/Pass";
import { Top } from "@/components/Top";
import { Icon3D, LinkBtn, Screen } from "@/components/ui";
import { siteOrigin } from "@/lib/origin";
import { getMe } from "@/lib/session";
import { call } from "@/lib/supabase";
import { fill, stampsN, t } from "@/lib/t";
import type { CardStore as Store, CardView } from "@/lib/types";

type Card = CardView & { prizes?: Prize[] | null; history: { kind: "stamp" | "gift"; at: string; given: boolean; gift: string | null; item?: string | null }[] };

const when = (iso: string) =>
  new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis" }).format(new Date(iso));

/**
 * One card: the card itself, when it last saw a tampon, and one thing to do
 * — the gift's code to show at the counter when it waits (`?show=1` opens
 * it), the wheel's turns when they wait, else the scanner for the next
 * tampon. The list of every visit went (the founder's «simpler», 17 Oct 2026).
 */
export default async function CardPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ show?: string }> }) {
  const [{ id }, { show }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const me = await getMe();
  if (!me) redirect(`/login?next=/c/${id}`);
  const card = await call<Card | null>("card", { p_id: id });
  if (!card) notFound();

  // a shop the founder switched to the store: the tampons kept, and the things to spend them on
  if (card.shop.store) {
    const store = await call<Store | null>("card_store", { p_card: id });
    const code = me.code
      ? await QRCode.toString(`${await siteOrigin()}/u/${me.code}`, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0F0E17", light: "#FFFFFF" } })
      : null;
    return (
      <Screen className="[@media(max-height:547.98px)]:h-auto [@media(max-height:547.98px)]:min-h-dvh">
        <Top back="/" title={card.shop.name} />
        <CardStore card={id} shop={card.shop} balance={store?.balance ?? card.stamps} items={store?.items ?? []} waiting={store?.waiting ?? []} code={me.code ?? null} svg={code} />
      </Screen>
    );
  }
  // the gift waiting: the customer's own code is the gift's (the shop scans it, sees the gift, hands it over)
  const svg =
    card.ready && me.code
      ? await QRCode.toString(`${await siteOrigin()}/u/${me.code}`, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0F0E17", light: "#FFFFFF" } })
      : null;

  // a wheel shop, a full card not spun yet: the roulette (a popup) takes the gift's place
  const turn = card.spin && card.prizes?.length ? card.spin : null;
  const ready = card.ready && !turn;
  return (
    // one screen: the card, one quiet line, and one thing to do (shorter than 548px, the page scrolls)
    <Screen className="[@media(max-height:547.98px)]:h-auto [@media(max-height:547.98px)]:min-h-dvh">
      <Top back="/" />
      <div className="mx-auto mt-2 w-full max-w-[min(100%,52dvh)] shrink-0 animate-rise">
        {/* the card opens: how far the gift is, and how the next tampon is taken (customers kept tapping it) */}
        <CardTap shop={card.shop.name} gift={card.shop.gift ?? ""} stamps={card.stamps} goal={card.shop.goal ?? 10} ready={ready}>
          <Pass shop={card.shop} stamps={card.stamps} waiting={card.waiting_n} />
        </CardTap>
      </div>
      {card.next && <p className="mt-3 shrink-0 px-1 text-center text-[0.8125rem] text-muted">{fill(t.nextCard, { gift: card.next.gift, n: stampsN(card.next.goal) })}</p>}

      {/* the roulette: a popup that opens by itself, and a banner to open it again */}
      {turn && <CardWheel card={card.id} moment={turn} prizes={card.prizes ?? []} turns={card.spins_n ?? 1} />}

      {/* when it last saw a tampon, and the gifts already taken here: one quiet line, in place of the list */}
      {card.last_at && (
        <p className="mt-2.5 shrink-0 text-center text-[0.8125rem] text-muted">
          {fill(t.cardLast, { when: when(card.last_at) })}
          {card.gifts > 0 ? ` · ${fill(t.cardGiftsTaken, { n: card.gifts })}` : ""}
        </p>
      )}

      {/* once, on a card with a tampon on it: a word to this phone when the gift is near, or waiting */}
      {(card.stamps > 0 || ready) && !(me.seen ?? []).includes("push") && <PushAsk shop={card.shop.name} />}

      {/* the one thing to do: the gift waiting — show the code at the counter; else, the next tampon */}
      <div className="mt-auto shrink-0 pb-[2dvh] pt-[1.5dvh]">
        {ready ? (
          <div className="animate-pop text-center">
            <p className="flex items-center justify-center gap-2 text-[0.9375rem] font-semibold text-coral">
              <Icon3D name="gift" size={30} className="animate-float" />
              {(card.waiting_n ?? 1) > 1 ? fill(t.readyMany, { n: card.waiting_n ?? 2 }) : t.ready}
            </p>
            <p className="mt-0.5 truncate text-[1.375rem] font-bold leading-tight">{card.won ?? card.shop.gift}</p>
            {me.code && svg ? (
              <MyCode
                code={me.code}
                svg={svg}
                gift={card.won ?? card.shop.gift}
                startOpen={show === "1"}
                className="press mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-[1.25rem] bg-[linear-gradient(150deg,#ffa183,#ff6b4a)] text-[1.0625rem] font-bold text-white shadow-[0_14px_30px_-12px_rgb(255_107_74/0.6)]"
              >
                <QrCode className="size-6" /> {t.giftShowCounter}
              </MyCode>
            ) : (
              <p className="mt-1 text-[0.8125rem] text-muted">{t.readyBody}</p>
            )}
          </div>
        ) : (
          <LinkBtn href="/scan" className="h-14 rounded-[1.25rem] text-[1.0625rem]">
            <ScanLine className="size-6" strokeWidth={2.4} /> {t.scan}
          </LinkBtn>
        )}
      </div>
    </Screen>
  );
}
