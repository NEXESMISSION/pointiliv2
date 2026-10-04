import Link from "next/link";
import QRCode from "qrcode";
import { ChevronRight, ScanLine } from "lucide-react";
import { MyCode } from "@/components/MyCode";
import { Pass } from "@/components/Pass";
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
      <header className="flex shrink-0 items-center justify-between pt-2">
        {back ? (
          <Link href={back} className="press grid size-11 place-items-center rounded-full bg-surface shadow-card" aria-label={t.back}>
            <ChevronRight className="size-5" />
          </Link>
        ) : (
          <Link href="/me" className="press grid size-11 place-items-center rounded-full bg-[linear-gradient(145deg,#ffb18a,#ff6b4a)] text-[1rem] font-bold text-white shadow-card" aria-label={t.account}>
            {(first?.[0] ?? "؟").toUpperCase()}
          </Link>
        )}
        {me.code && svg ? <MyCode code={me.code} svg={svg} /> : <Logo />}
      </header>

      <div className="mt-[2.5dvh] shrink-0">
        <p className="flex items-center gap-1.5 text-[0.9375rem] text-muted">
          {t.hello} <Icon3D name="wave" size={22} />
        </p>
        <h1 className="mt-0.5 truncate text-[2rem] font-bold leading-tight">{back ? t.myCards : first || t.myCards}</h1>
      </div>

      {waiting.length > 0 && (
        <Link href={`/c/${waiting[0]!.id}`} className="press relative mt-[2dvh] block shrink-0 animate-rise overflow-hidden rounded-[1.5rem] bg-surface p-4 pe-24 shadow-card">
          <span className="absolute end-3 top-1/2 -translate-y-1/2" aria-hidden>
            <Icon3D name="gift" size={64} className="animate-float" />
          </span>
          <b className="block text-[1.0625rem] font-bold">{t.giftWaiting}</b>
          <span className="block truncate text-[0.875rem] text-muted">{fill(t.giftAt, { gift: waiting[0]!.shop.gift ?? "", shop: waiting[0]!.shop.name })}</span>
        </Link>
      )}

      {cards.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
          <Icon3D name="ticket" size={96} className="animate-float" />
          <h2 className="mt-5 text-[1.375rem] font-bold">{t.noCards}</h2>
          <p className="mt-1.5 max-w-[16rem] text-[0.9375rem] text-muted">{t.noCardsBody}</p>
        </div>
      ) : (
        // the cards scroll inside their own box: the page, the title and the scan button stay put
        <section className="mt-[2.5dvh] flex min-h-0 flex-1 flex-col">
          {!back && <h2 className="mb-2.5 shrink-0 px-0.5 text-[1.125rem] font-bold">{t.myCards}</h2>}
          <div data-list className="-mx-2 min-h-0 space-y-3 overflow-y-auto overscroll-contain px-2 pb-2">
            {cards.map((c, i) => (
              <Link key={c.id} href={`/c/${c.id}`} className="press block animate-rise" style={{ animationDelay: `${i * 70}ms` }}>
                <Pass shop={c.shop} stamps={c.stamps} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* the one thing a customer does here */}
      <div className="shrink-0 pb-[2dvh] pt-[1.5dvh]">
        <LinkBtn href="/scan" className="h-[3.75rem] animate-breathe rounded-[1.5rem] text-[1.1875rem]">
          <ScanLine className="size-6" strokeWidth={2.4} /> {t.scan}
        </LinkBtn>
      </div>
    </Screen>
  );
}
