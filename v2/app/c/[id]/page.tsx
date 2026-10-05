import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { Gift, QrCode } from "lucide-react";
import { MyCode } from "@/components/MyCode";
import { Pass } from "@/components/Pass";
import { Top } from "@/components/Top";
import { Icon3D, Screen } from "@/components/ui";
import { siteOrigin } from "@/lib/origin";
import { getMe } from "@/lib/session";
import { call } from "@/lib/supabase";
import { fill, stampsN, t } from "@/lib/t";
import type { CardView } from "@/lib/types";

type Card = CardView & { history: { kind: "stamp" | "gift"; at: string; given: boolean; gift: string | null }[] };

const when = (iso: string) =>
  new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis" }).format(new Date(iso));

/** One card: the stamps, the gift — and when it is ready, its code to show at the counter (`?show=1` opens it). */
export default async function CardPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ show?: string }> }) {
  const [{ id }, { show }] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const me = await getMe();
  if (!me) redirect(`/login?next=/c/${id}`);
  const card = await call<Card | null>("card", { p_id: id });
  if (!card) notFound();
  // the gift waiting: the customer's own code is the gift's (the shop scans it, sees the gift, hands it over)
  const svg =
    card.ready && me.code
      ? await QRCode.toString(`${await siteOrigin()}/u/${me.code}`, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0F0E17", light: "#FFFFFF" } })
      : null;

  // A gift waiting fills the screen most. On a short screen (800px and less), and on any screen when the
  // shop's next card is announced too, the gift's box tightens (its picture beside the title) and the
  // card's width follows the height: the story below keeps room for its first lines.
  const ready = card.ready;
  const tight = ready && !!card.next;
  const look = tight
    ? {
        card: "mt-[2dvh] max-w-[min(100%,40dvh)]",
        next: "py-2 leading-snug",
        box: "mt-3 flex flex-wrap items-center justify-center gap-x-2 px-5 py-3.5",
        pic: "size-[2.25rem]!",
        title: "",
        gift: "basis-full leading-snug",
        hint: "mt-0.5 basis-full",
        story: "mt-[2.5dvh] pb-[1.5dvh]",
      }
    : {
        card: ready ? "mt-5 max-w-[min(100%,54dvh)] [@media(max-height:800px)]:mt-[2dvh]" : "mt-5",
        next: "py-3 leading-relaxed",
        box: "mt-4 p-5 [@media(max-height:800px)]:mt-3 [@media(max-height:800px)]:flex [@media(max-height:800px)]:flex-wrap [@media(max-height:800px)]:items-center [@media(max-height:800px)]:justify-center [@media(max-height:800px)]:gap-x-2 [@media(max-height:800px)]:py-3.5",
        pic: "mx-auto [@media(max-height:800px)]:mx-0 [@media(max-height:800px)]:size-[2.25rem]!",
        title: "mt-1 [@media(max-height:800px)]:mt-0",
        gift: "[@media(max-height:800px)]:basis-full [@media(max-height:800px)]:leading-snug",
        hint: "mt-1 [@media(max-height:800px)]:mt-0.5 [@media(max-height:800px)]:basis-full",
        story: ready ? "mt-6 pb-4 [@media(max-height:800px)]:mt-[2.5dvh] [@media(max-height:800px)]:pb-[1.5dvh]" : "mt-6 pb-4",
      };
  return (
    // one screen: the story below scrolls inside its own box, the card never moves (shorter than 548px, the page scrolls)
    <Screen className="[@media(max-height:547.98px)]:h-auto [@media(max-height:547.98px)]:min-h-dvh">
      <Top back="/" title={card.shop.name} />
      <div className={`mx-auto w-full animate-rise ${look.card}`}>
        <Pass shop={card.shop} stamps={card.stamps} />
      </div>
      {card.next && (
        <p className={`mt-3 rounded-2xl bg-surface px-4 text-[0.9062rem] text-body shadow-card ${look.next}`}>
          {fill(t.nextCard, { gift: card.next.gift, n: stampsN(card.next.goal) })}
        </p>
      )}

      {ready && (
        <div className={`relative shrink-0 animate-pop overflow-hidden rounded-[1.75rem] bg-[linear-gradient(150deg,#ffa183,#ff6b4a_55%,#e0452a)] text-center text-white shadow-[0_20px_44px_-18px_rgb(255_107_74/0.85)] ${look.box}`}>
          <span className="pointer-events-none absolute -top-16 start-1/2 size-56 -translate-x-1/2 rounded-full bg-white/15 blur-2xl" aria-hidden />
          <Icon3D name="gift" size={72} className={`relative animate-float ${look.pic}`} />
          <p className={`relative text-[1.375rem] font-bold ${look.title}`}>{t.ready}</p>
          <p className={`relative text-[1.625rem] font-bold ${look.gift}`}>{card.shop.gift}</p>
          {me.code && svg ? (
            <MyCode
              code={me.code}
              svg={svg}
              gift={card.shop.gift}
              startOpen={show === "1"}
              className={`press relative mx-auto mt-2 flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-[0.9688rem] font-bold text-coral ${look.hint}`}
            >
              <QrCode className="size-5" /> {t.giftShow}
            </MyCode>
          ) : (
            <p className={`relative text-[0.9375rem] text-white/85 ${look.hint}`}>{t.readyBody}</p>
          )}
        </div>
      )}

      <section className={`flex min-h-0 flex-1 flex-col ${look.story}`}>
        <h2 className="mb-2.5 px-0.5 text-[1.0625rem] font-bold">{t.history}</h2>
        {card.history.length === 0 ? (
          <p className="rounded-[1.25rem] bg-surface p-4 text-[0.9375rem] text-muted shadow-card">{t.nothingYet}</p>
        ) : (
          <ul data-list className="min-h-0 divide-y divide-line overflow-y-auto overscroll-contain rounded-[1.375rem] bg-surface shadow-card">
            {card.history.map((h, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3">
                {h.kind === "stamp" ? (
                  <span className="num grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-[0.875rem] font-bold text-brand">+1</span>
                ) : (
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-coral-soft text-coral">
                    <Gift className="size-5" />
                  </span>
                )}
                <span className="min-w-0 flex-1 text-[0.9688rem] font-medium">
                  {h.kind === "stamp" ? t.hStamp : h.given ? fill(t.hGift, { gift: h.gift ?? card.shop.gift ?? "" }) : t.hGiftWaiting}
                </span>
                <span className="shrink-0 text-[0.7812rem] text-muted">{when(h.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Screen>
  );
}
