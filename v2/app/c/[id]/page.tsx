import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { Check, Gift, QrCode } from "lucide-react";
import { CardStore } from "@/components/CardStore";
import { CardTap } from "@/components/CardTap";
import { CardWheel } from "@/components/CardWheel";
import type { Prize } from "@/components/Wheel";
import { MyCode } from "@/components/MyCode";
import { PushAsk } from "@/components/PushAsk";
import { Pass } from "@/components/Pass";
import { Top } from "@/components/Top";
import { Icon3D, Screen } from "@/components/ui";
import { siteOrigin } from "@/lib/origin";
import { getMe } from "@/lib/session";
import { call } from "@/lib/supabase";
import { fill, stampsN, t } from "@/lib/t";
import type { CardStore as Store, CardView } from "@/lib/types";

type Card = CardView & { prizes?: Prize[] | null; history: { kind: "stamp" | "gift"; at: string; given: boolean; gift: string | null; item?: string | null }[] };

const when = (iso: string) =>
  new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis" }).format(new Date(iso));

/** One card: the stamps, the gift — and when it is ready, its code to show at the counter (`?show=1` opens it). */
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
    // one screen: the history scrolls inside its own box, the card never moves (shorter than 548px, the page scrolls)
    <Screen className="[@media(max-height:547.98px)]:h-auto [@media(max-height:547.98px)]:min-h-dvh">
      <Top back="/" />
      <div className="mx-auto mt-2 w-full max-w-[min(100%,52dvh)] shrink-0 animate-rise">
        {/* the card opens: how far the gift is, and how the next tampon is taken (customers kept tapping it) */}
        <CardTap shop={card.shop.name} gift={card.shop.gift ?? ""} stamps={card.stamps} goal={card.shop.goal ?? 10} ready={ready}>
          <Pass shop={card.shop} stamps={card.stamps} />
        </CardTap>
      </div>
      {card.next && <p className="mt-3 shrink-0 px-1 text-center text-[0.8125rem] text-muted">{fill(t.nextCard, { gift: card.next.gift, n: stampsN(card.next.goal) })}</p>}

      {/* the roulette: a popup that opens by itself, and a banner to open it again */}
      {turn && <CardWheel card={card.id} moment={turn} prizes={card.prizes ?? []} />}

      {/* the gift waiting: what it is, and the one thing to do — show the code at the counter */}
      {ready && (
        <div className="mt-3 flex shrink-0 animate-pop items-center gap-3 rounded-[1.25rem] bg-surface p-3.5 shadow-card">
          <Icon3D name="gift" size={44} className="animate-float" />
          <div className="min-w-0 flex-1">
            <p className="text-[0.8125rem] font-semibold text-coral">{(card.waiting_n ?? 1) > 1 ? fill(t.readyMany, { n: card.waiting_n ?? 2 }) : t.ready}</p>
            <p className="truncate text-[1.0625rem] font-bold leading-tight">{card.won ?? card.shop.gift}</p>
            {!(me.code && svg) && <p className="text-[0.8125rem] text-muted">{t.readyBody}</p>}
          </div>
          {me.code && svg && (
            <MyCode
              code={me.code}
              svg={svg}
              gift={card.won ?? card.shop.gift}
              startOpen={show === "1"}
              className="press flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-coral px-4 text-[0.9375rem] font-bold text-white"
            >
              <QrCode className="size-5" /> ورّي الكود
            </MyCode>
          )}
        </div>
      )}

      {/* once, on a card with a tampon on it: a word to this phone when the gift is near, or waiting */}
      {(card.stamps > 0 || ready) && !(me.seen ?? []).includes("push") && <PushAsk shop={card.shop.name} />}

      <section className="mt-4 flex min-h-0 flex-1 flex-col pb-3">
        <h2 className="mb-1.5 px-0.5 text-[0.9375rem] font-bold">{t.history}</h2>
        {card.history.length === 0 ? (
          <p className="rounded-[1.25rem] bg-surface p-4 text-[0.9375rem] text-muted shadow-card">{t.nothingYet}</p>
        ) : (
          <ul data-list className="min-h-0 divide-y divide-line overflow-y-auto overscroll-contain rounded-[1.25rem] bg-surface shadow-card">
            {card.history.map((h, i) => (
              <li key={i} className="flex items-center gap-3 px-3.5 py-2">
                {h.kind === "stamp" ? (
                  <span className="grid size-8 shrink-0 place-items-center rounded-full text-white" style={{ background: card.shop.color }}>
                    <Check className="size-4" strokeWidth={3} />
                  </span>
                ) : (
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-coral-soft text-coral">
                    <Gift className="size-4" />
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium">
                  {h.kind === "stamp" ? (
                    <>
                      {t.hStamp}
                      {h.item && (
                        <>
                          {" · "}
                          <bdi className="font-bold">{h.item}</bdi>
                        </>
                      )}
                    </>
                  ) : h.given ? (
                    fill(t.hGift, { gift: h.gift ?? card.shop.gift ?? "" })
                  ) : (
                    t.hGiftWaiting
                  )}
                </span>
                <span className="shrink-0 text-[0.75rem] tabular-nums text-muted">{when(h.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Screen>
  );
}
