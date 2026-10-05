import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, QrCode, ScanLine } from "lucide-react";
import { HelpButton } from "@/components/Help";
import { LogoTip } from "@/components/LogoTip";
import { NewsPopup } from "@/components/NewsPopup";
import { OfferPopup, PayBanner, type Pay } from "@/components/Pay";
import { ShopMark } from "@/components/ShopMark";
import { PlanOn } from "@/components/PlanOn";
import { ShopWelcome } from "@/components/ShopWelcome";
import { Icon3D } from "@/components/ui";
import { getMe } from "@/lib/session";
import type { News } from "@/lib/news";
import { getHelp } from "@/lib/settings";
import { call } from "@/lib/supabase";
import { fill, t } from "@/lib/t";

export const metadata = { title: "المحل" };

type Home = {
  customers: number;
  today: number;
  visitors_today: number;
  given_today: number;
  waiting: { id: number; at: string; name: string | null; gift: string }[];
  recent: { id: number; at: string; kind: "stamp" | "gift"; given: boolean; name: string | null; stamps: number; goal: number; gift: string | null }[];
};

const time = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis" }).format(new Date(iso));

/**
 * The owner's home, on one screen whatever the phone, and filling it: the
 * shop, the code one tap away (bigger on a taller phone) with the camera for
 * a customer's own code beside it, the gifts to hand
 * over, today in three numbers, the four places to go — and who came lately
 * in a box that takes all the room left, scrolling inside it. Before the
 * first customer, that box says how it goes, in three steps.
 */
export default async function ShopHome({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const me = await getMe();
  if (!me) redirect("/shop/new");
  if (!me.shop) redirect("/shop/setup");
  if (!me.shop.goal) redirect("/shop/card");
  const shop = me.shop;
  const [home, help, news, pay, { welcome }] = await Promise.all([call<Home>("shop_home"), getHelp(), call<News | null>("news_next"), call<Pay | null>("my_payment"), searchParams]);
  const seen = me.seen ?? [];
  const paid = !!pay?.paid;
  const offer = !!pay?.offer;
  // one note a visit, and the brand-new owner's welcome comes before them all:
  // on their first visit the logo tip and the offer are both unseen too, and
  // two overlays on one screen is one too many
  const coachNow = welcome === "1" && !seen.includes("coach");
  const logoTip = !coachNow && !seen.includes("logo_tip");
  // what the founder just gave (a gift, a payment taken by hand, a new end date): said once
  const grant = !coachNow && !logoTip ? (pay?.grant ?? null) : null;
  const offerNote = !coachNow && !logoTip && !grant && offer && !seen.includes("offer") && !(pay?.last?.status === "pending" && pay.last.method !== "contact");
  const first = (me.name ?? "").split(" ")[0];
  const options = [
    { href: "/shop/stats", mark: <Icon3D name="chart" size={30} />, label: t.statsTitle },
    { href: "/shop/customers", mark: <Icon3D name="people" size={30} />, label: t.customersTitle },
    { href: "/shop/card", mark: <Icon3D name="ticket" size={30} />, label: t.cardTitle },
    {
      // the shop's own tile shows its logo: the logo tip lights this one
      href: "/shop/setup?edit=1",
      id: "shop-tile",
      mark: (
        <span className="grid size-[1.875rem] place-items-center overflow-hidden rounded-[0.5rem]">
          <ShopMark shop={shop} size={30} />
        </span>
      ),
      label: t.shopTitle,
    },
    { href: "/me", mark: <Icon3D name="wave" size={30} />, label: t.account },
  ];
  const recent = home?.recent ?? [];
  // more than two gifts waiting: they scroll inside their own box
  const manyGifts = (home?.waiting.length ?? 0) > 2;

  return (
    // nothing is clipped: on a phone too short for it all, the page scrolls as a whole
    <main className="safe-t safe-b mx-auto flex h-dvh w-full max-w-md flex-col px-5">
      <header className="flex items-center gap-3 pt-3">
        {/* the shop's picture is the way to the account, like a profile picture */}
        <Link href="/me" aria-label={t.account} className="press grid size-12 shrink-0 place-items-center overflow-hidden rounded-full shadow-card" style={{ background: shop.color }}>
          <ShopMark shop={shop} size={30} />
        </Link>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-[0.8438rem] text-muted">
              {t.hello}
              {first ? ` ${first}` : ""}
            </span>
            <HelpButton help={help} small />
          </span>
          <span className="block truncate text-[1.4375rem] font-bold leading-tight">{shop.name}</span>
        </span>
      </header>

      {shop.paused && <p className="mt-3 rounded-2xl bg-coral-soft px-4 py-2.5 text-[0.875rem] font-semibold text-coral">{t.pausedBanner}</p>}
      {!paid && pay && <PayBanner pay={pay} offer={offer} />}

      {/* the one thing an owner opens all day — and beside it, the camera for a customer's own code */}
      <div className="mt-[2.2dvh] flex shrink-0 gap-2">
      <Link
        href="/shop/qr"
        className="press relative flex min-w-0 flex-1 items-center gap-3 overflow-hidden rounded-[1.625rem] px-4 py-[clamp(0.875rem,2.6dvh,1.75rem)] text-white"
        style={{
          background: `linear-gradient(150deg, color-mix(in oklab, ${shop.color} 72%, white) -20%, ${shop.color} 45%, color-mix(in oklab, ${shop.color} 68%, black) 120%)`,
          boxShadow: `0 6px 14px -10px color-mix(in oklab, ${shop.color} 70%, black)`,
        }}
      >
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_80%_at_0%_0%,rgb(255_255_255/0.28),transparent_55%)]" aria-hidden />
        <span className="relative grid size-[clamp(3.5rem,7dvh,4.5rem)] shrink-0 place-items-center rounded-[1.125rem] bg-white/20">
          <QrCode className="size-[46%]" />
        </span>
        <span className="relative min-w-0">
          <span className="block text-[1.375rem] font-bold leading-tight">{t.showCode}</span>
          <span className="line-clamp-2 text-balance text-[0.8125rem] leading-snug text-white/85">{t.showCodeHint}</span>
        </span>
      </Link>
      <Link href="/shop/collect?by=scan" className="press flex w-[5.5rem] shrink-0 flex-col items-center justify-center gap-1.5 rounded-[1.625rem] bg-surface shadow-card" aria-label={t.collectScan}>
        <ScanLine className="size-8" style={{ color: shop.color }} strokeWidth={2.2} />
        <span className="text-[0.875rem] font-bold">{t.collectScanShort}</span>
      </Link>
      </div>

      {/* gifts to hand over: up to two show whole; more scroll inside a box (with
          room inside it for the cards' shadows: no pale band), cut through the
          middle of a card so it reads as a list — one and a half on a short
          phone, two and a bit on a tall one */}
      {home && home.waiting.length > 0 && (
        <div
          data-list={manyGifts ? "" : undefined}
          className={`shrink-0 space-y-2 ${manyGifts ? "-mx-3 -mb-3 mt-2 max-h-[7.25rem] overflow-y-auto overscroll-contain px-3 pb-3 pt-1 [@media(min-height:700px)]:max-h-[11.5rem]" : "mt-3"}`}
        >
          {home.waiting.map((g) => (
            <div key={g.id} className="flex animate-rise items-center gap-3 rounded-[1.25rem] bg-surface p-3 shadow-card">
              <Icon3D name="gift" size={34} className="shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.9375rem] font-bold">{fill(t.giftFor, { who: g.name ?? t.someone, gift: g.gift })}</span>
                <span className="num block text-[0.75rem] text-muted">{time(g.at)}</span>
              </span>
              {/* handed over by the customer's code, never by a tap alone */}
              <Link href="/shop/collect?by=scan" className="press flex h-11 shrink-0 items-center gap-1.5 rounded-[1rem] bg-[linear-gradient(150deg,#ffa183,#ff6b4a)] px-4 text-[0.9375rem] font-bold text-white">
                <ScanLine className="size-[1.125rem]" /> {t.collectScanShort}
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* the four places to go, in one row */}
      <nav className="mt-[1.6dvh] grid shrink-0 grid-cols-5 gap-1.5">
        {options.map((o) => (
          <Link key={o.href} id={o.id} href={o.href} className="press flex flex-col items-center gap-1 rounded-[1.125rem] bg-surface px-0.5 py-[clamp(0.75rem,1.9dvh,1.15rem)] shadow-card">
            {o.mark}
            <span className="w-full truncate text-center text-[0.75rem] font-bold">{o.label}</span>
          </Link>
        ))}
      </nav>

      {/* who came lately: a box that takes all the room left, never less than a row
          and the link; before the first customer, as tall as its three steps */}
      <section className={`mt-[2dvh] flex flex-1 flex-col pb-3 ${recent.length > 0 ? "min-h-[9.5rem]" : ""}`}>
        <h2 className="mb-2 px-0.5 text-[0.9375rem] font-bold">{t.lately}</h2>
        <div className={`flex flex-1 flex-col rounded-[1.25rem] bg-surface shadow-card ${recent.length > 0 ? "min-h-0 overflow-hidden" : ""}`}>
          {recent.length > 0 ? (
            <>
              <ul data-list className="min-h-0 divide-y divide-line overflow-y-auto overscroll-contain">
                {recent.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-3.5 py-2.5">
                    {r.kind === "stamp" ? (
                      <span className="num grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-[0.7812rem] font-bold text-brand">+1</span>
                    ) : (
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-coral-soft">
                        <Icon3D name="gift" size={22} />
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-[0.9062rem] font-medium">
                      {r.kind === "stamp"
                        ? fill(t.lateStamp, { who: r.name ?? t.someone })
                        : fill(r.given ? t.lateGiven : t.lateGift, { who: r.name ?? t.someone, gift: r.gift ?? shop.gift ?? "" })}
                    </span>
                    <span className="num shrink-0 text-[0.75rem] text-muted">{time(r.at)}</span>
                  </li>
                ))}
              </ul>
              <Link href="/shop/customers" className="mt-auto flex shrink-0 items-center justify-center gap-1 border-t border-line py-3 text-[0.875rem] font-bold text-brand">
                {t.seeAll} <ChevronLeft className="size-4" />
              </Link>
            </>
          ) : (
            // before the first customer: how it goes, in three steps
            <div className="m-auto flex w-full max-w-[17rem] flex-col items-center px-4 py-4 text-center">
              <Icon3D name="phone" size={48} className="animate-float" />
              <h3 className="mt-1.5 text-[1rem] font-bold">{t.customersEmpty}</h3>
              <p className="mt-1 text-balance text-[0.8125rem] leading-snug text-muted">{t.customersEmptyBody}</p>
              <ol className="mt-3 w-full space-y-1.5 text-start">
                {t.firstSteps.map((s, i) => (
                  <li key={s} className="flex items-center gap-2.5">
                    <span className="num grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-[0.75rem] font-bold text-brand">{i + 1}</span>
                    <span className="text-[0.875rem] font-semibold">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </section>

      <LogoTip shopId={shop.id} logo={shop.logo ?? null} show={logoTip} />
      {offerNote && pay?.offer_until && <OfferPopup shopId={shop.id} offerUntil={pay.offer_until} />}
      <ShopWelcome name={first} shopId={shop.id} show={coachNow} />
      {grant && <PlanOn grant={grant} />}
      <NewsPopup news={coachNow || logoTip || offerNote || grant ? null : (news ?? null)} who={me.id} />
    </main>
  );
}
