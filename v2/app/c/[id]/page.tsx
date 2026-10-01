import { notFound, redirect } from "next/navigation";
import { Gift } from "lucide-react";
import { Pass } from "@/components/Pass";
import { Top } from "@/components/Top";
import { Icon3D, Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { call } from "@/lib/supabase";
import { fill, stampsN, t } from "@/lib/t";
import type { CardView } from "@/lib/types";

type Card = CardView & { history: { kind: "stamp" | "gift"; at: string; given: boolean; gift: string | null }[] };

const when = (iso: string) =>
  new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis" }).format(new Date(iso));

/** One card: the stamps, the gift — and when it is ready, a screen to show at the counter. */
export default async function CardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  if (!(await getMe())) redirect(`/login?next=/c/${id}`);
  const card = await call<Card | null>("card", { p_id: id });
  if (!card) notFound();

  return (
    <Screen>
      <Top back="/" title={card.shop.name} />
      <div className="mt-5 animate-rise">
        <Pass shop={card.shop} stamps={card.stamps} />
      </div>
      {card.next && (
        <p className="mt-3 rounded-2xl bg-surface px-4 py-3 text-[14.5px] leading-relaxed text-body shadow-card">
          {fill(t.nextCard, { gift: card.next.gift, n: stampsN(card.next.goal) })}
        </p>
      )}

      {card.ready && (
        <div className="relative mt-4 animate-pop overflow-hidden rounded-[28px] bg-[linear-gradient(150deg,#ffa183,#ff6b4a_55%,#e0452a)] p-5 text-center text-white shadow-[0_20px_44px_-18px_rgb(255_107_74/0.85)]">
          <span className="pointer-events-none absolute -top-16 start-1/2 size-56 -translate-x-1/2 rounded-full bg-white/15 blur-2xl" aria-hidden />
          <Icon3D name="gift" size={72} className="relative mx-auto animate-float" />
          <p className="relative mt-1 text-[22px] font-bold">{t.ready}</p>
          <p className="relative text-[26px] font-bold">{card.shop.gift}</p>
          <p className="relative mt-1 text-[15px] text-white/85">{t.readyBody}</p>
        </div>
      )}

      <section className="mt-6 pb-6">
        <h2 className="mb-2.5 px-0.5 text-[17px] font-bold">{t.history}</h2>
        {card.history.length === 0 ? (
          <p className="rounded-[20px] bg-surface p-4 text-[15px] text-muted shadow-card">{t.nothingYet}</p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-[22px] bg-surface shadow-card">
            {card.history.map((h, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3">
                {h.kind === "stamp" ? (
                  <span className="num grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-[14px] font-bold text-brand">+1</span>
                ) : (
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-coral-soft text-coral">
                    <Gift className="size-5" />
                  </span>
                )}
                <span className="min-w-0 flex-1 text-[15.5px] font-medium">
                  {h.kind === "stamp" ? t.hStamp : h.given ? fill(t.hGift, { gift: h.gift ?? card.shop.gift ?? "" }) : t.hGiftWaiting}
                </span>
                <span className="shrink-0 text-[12.5px] text-muted">{when(h.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Screen>
  );
}
