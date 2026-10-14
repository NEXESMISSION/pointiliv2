import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, QrCode, ScanLine } from "lucide-react";
import { HelpButton } from "@/components/Help";
import { FirstGift } from "@/components/FirstGift";
import { LogoTip } from "@/components/LogoTip";
import { Mission } from "@/components/Mission";
import { NewsPopup } from "@/components/NewsPopup";
import { InstallPopup, OpenOutside } from "@/components/InstallApp";
import { OfferPopup, PayBanner, TrialBanner, type Pay } from "@/components/Pay";
import { ShopMark } from "@/components/ShopMark";
import { PlanOn } from "@/components/PlanOn";
import { PushAsk } from "@/components/PushAsk";
import { RecentList } from "@/components/RecentList";
import { TryItButton } from "@/components/TryIt";
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
  /** the customers who are not the owner */
  served?: number;
  waiting?: { id: number; at: string; name: string | null; gift: string }[];
  today: number;
  visitors_today: number;
  given_today: number;
  recent: { id: number; card: string; at: string; kind: "stamp" | "gift"; given: boolean; name: string | null; stamps: number; goal: number; gift: string | null; item?: string | null }[];
  held?: { id: string; at: string; until: string; state: "waiting" | "lost" | "done" | "back"; name: string | null; item: string | null }[];
};

const time = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis" }).format(new Date(iso));

/**
 * The owner's home, on one screen whatever the phone, and filling it: the
 * shop, the code one tap away (bigger on a taller phone) with the camera for
 * a customer's own code beside it, the places to go — and who came lately
 * in a box that takes all the room left, scrolling inside it. Before the
 * first customer, that box says how it goes, in three steps.
 *
 * A gift won is not a row to act on here: there is one way to hand it over,
 * «سكاني» — the customer shows their code, the camera reads it, and the
 * screen asks «تعطيهولو توّا؟». Who won what stays a line in «آخر حركة».
 */
/** before the first customer: the picture and the two lines over the three steps */
function EmptyWords() {
  return (
    <>
      <Icon3D name="phone" size={48} className="animate-float" />
      <h3 className="mt-1.5 text-[1rem] font-bold">{t.customersEmpty}</h3>
      <p className="mt-1 text-balance text-[0.8125rem] leading-snug text-muted">{t.customersEmptyBody}</p>
    </>
  );
}

export default async function ShopHome({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const me = await getMe();
  if (!me) redirect("/shop/new");
  if (!me.shop) redirect("/shop/setup");
  if (!me.shop.goal) redirect("/shop/card");
  // a wheel or a store shop is set up by one thing only: until it is there, that is where home goes
  if (me.shop.wheel_on && !((await call<{ prizes: unknown[] }>("my_wheel"))?.prizes?.length ?? 0)) redirect("/shop/wheel?start=1");
  if (me.shop.store_on && !((await call<{ items: unknown[] }>("my_store"))?.items?.length ?? 0)) redirect("/shop/store?start=1");
  const shop = me.shop;
  const [home, help, news, pay, { welcome }] = await Promise.all([call<Home>("shop_home"), getHelp(), call<News | null>("news_next"), call<Pay | null>("my_payment"), searchParams]);
  const seen = me.seen ?? [];
  const paid = !!pay?.paid;
  const offer = !!pay?.offer;
  // one note a visit, and the brand-new owner's welcome comes before them all:
  // on their first visit the logo tip and the offer are both unseen too, and
  // two overlays on one screen is one too many
  const coachNow = welcome === "1" && !seen.includes("coach");
  // before the first customer the home has one job (the code): the logo and the install wait for a customer
  const served = (home?.served ?? 0) > 0;
  // the shop's first gift won and waiting: how to hand it over comes before any other note
  const firstGift = !coachNow && !seen.includes("first_gift") ? (home?.waiting?.[0] ?? null) : null;
  const logoTip = !coachNow && !firstGift && served && !seen.includes("logo_tip");
  // what the founder just gave (a gift, a payment taken by hand, a new end date): said once
  const grant = !coachNow && !firstGift && !logoTip ? (pay?.grant ?? null) : null;
  // the offer's popup: once the shop has a customer (it means something then), or on its last day whatever happens
  // eslint-disable-next-line react-hooks/purity -- a server page: the clock is read once per request
  const offerLastDay = !!pay?.offer_until && Date.parse(pay.offer_until) - Date.now() < 24 * 3600_000;
  const offerNote = !coachNow && !firstGift && !logoTip && !grant && offer && (served || offerLastDay) && !seen.includes("offer") && !(pay?.last?.status === "pending" && pay.last.method !== "contact");
  const first = (me.name ?? "").split(" ")[0];
  const options = [
    { href: "/shop/stats", mark: <Icon3D name="chart" size={30} />, label: t.statsTitle },
    { href: "/shop/customers", mark: <Icon3D name="people" size={30} />, label: t.customersTitle },
    // a shop the founder switched to the store: its store in the card's place
    shop.store_on
      ? { href: "/shop/store", mark: <Icon3D name="cart" size={30} />, label: t.storeOwnerTitle }
      : shop.wheel_on
        ? // a shop switched to the wheel: its wheel in the card's place (the card's goal is one tap away from there)
          { href: "/shop/wheel", mark: <Icon3D name="party" size={30} />, label: t.wheelOwnerTitle }
        : { href: "/shop/card", mark: <Icon3D name="ticket" size={30} />, label: t.cardTitle },
    { href: "/shop/items", mark: <Icon3D name="basket" size={30} />, label: t.itemsTile },
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
  const held = home?.held ?? [];
  const lately = recent.length > 0 || held.length > 0;

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
          {/* the name opens the shop's own page: owners kept tapping it */}
          <Link href="/shop/setup?edit=1" className="block truncate text-[1.4375rem] font-bold leading-tight">
            {shop.name}
          </Link>
        </span>
      </header>

      {shop.paused && <p className="mt-3 rounded-2xl bg-coral-soft px-4 py-2.5 text-[0.875rem] font-semibold text-coral">{t.pausedBanner}</p>}
      {/* the trial's clock and a call, until the year is turned on (the founder's own and the tests: just the price) */}
      {!paid && pay && (pay.exempt || !pay.trial_until ? <PayBanner pay={pay} offer={offer} /> : <TrialBanner pay={pay} offer={offer} phone={help.phone} />)}
      {/* in Facebook's own browser: the way out to the phone's browser, where Pointili stays */}
      <OpenOutside where="home" look="line" className="mt-1" />

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

      {/* the four places to go, in one row */}
      <nav className="mt-[1.6dvh] grid shrink-0 grid-cols-6 gap-1.5">
        {options.map((o) => (
          <Link key={o.href} id={o.id} href={o.href} className="press flex flex-col items-center gap-1 rounded-[1.125rem] bg-surface px-0.5 py-[clamp(0.75rem,1.9dvh,1.15rem)] shadow-card">
            {o.mark}
            <span className="w-full truncate text-center text-[0.75rem] font-bold">{o.label}</span>
          </Link>
        ))}
      </nav>

      {/* a new owner's first steps (the card, the first customer, five), until the bravo has shown */}
      {!seen.includes("mission") && <Mission served={home?.served ?? 0} shopId={shop.id} />}

      {/* who came lately: a box that takes all the room left, never less than a row
          and the link; before the first customer, as tall as its three steps */}
      <section className={`mt-[2dvh] flex flex-1 flex-col pb-3 ${lately ? "min-h-[9.5rem]" : ""}`}>
        <h2 className="mb-2 px-0.5 text-[0.9375rem] font-bold">{t.lately}</h2>
        <div className={`flex flex-1 flex-col rounded-[1.25rem] bg-surface shadow-card ${lately ? "min-h-0 overflow-hidden" : ""}`}>
          {lately ? (
            <>
              {/* each line opens: the customer's card as it stands (owners kept tapping them) */}
              <RecentList
                fix={!!shop.items_on}
                shop={{ name: shop.name, kind: shop.kind, color: shop.color, logo: shop.logo, stamp_logo: shop.stamp_logo, goal: shop.goal, gift: shop.gift, store: !!shop.store_on }}
                rows={[
                  ...recent.map((r) => ({
                    at: r.at,
                    id: r.id,
                    kind: r.kind,
                    name: r.name ?? t.someone,
                    line:
                      r.kind === "stamp"
                        ? fill(t.lateStamp, { who: r.name ?? t.someone })
                        : fill(r.given ? t.lateGiven : t.lateGift, { who: r.name ?? t.someone, gift: r.gift ?? shop.gift ?? "" }),
                    time: time(r.at),
                    stamps: r.stamps,
                    goal: r.goal,
                    gift: r.gift,
                    item: r.kind === "stamp" ? (r.item ?? null) : null,
                    card: r.card,
                  })),
                  // the scans without an account, and how each ended (one finished shows as its tampon too)
                  ...held.map((h) => ({
                    at: h.at,
                    id: h.id,
                    kind: "held" as const,
                    name: h.name ?? t.someone,
                    line: h.state === "waiting" ? t.heldWaiting : h.state === "lost" ? t.heldLost : h.state === "back" ? t.heldBack : fill(t.heldDone, { who: h.name ?? t.someone }),
                    time: time(h.at),
                    stamps: 0,
                    goal: shop.goal ?? 10,
                    gift: shop.gift,
                    item: h.item,
                    state: h.state,
                    until: h.until,
                  })),
                ]
                  .sort((a, b) => b.at.localeCompare(a.at))
                  .map(({ at, ...r }) => (void at, r))}
              />
              <Link href="/shop/customers" className="mt-auto flex shrink-0 items-center justify-center gap-1 border-t border-line py-3 text-[0.875rem] font-bold text-brand">
                {t.seeAll} <ChevronLeft className="size-4" />
              </Link>
            </>
          ) : (
            // before the first customer: how it goes, in three steps
            <div className="m-auto flex w-full max-w-[21rem] flex-col items-center px-3 py-3 text-center">
              {/* a card made at night, no customer yet: a word tomorrow morning (asked once) — in the place of
                  the picture and the two lines, never under them: a short phone's one screen is already full */}
              {!seen.includes("push") ? (
                <PushAsk shop={shop.name} title={t.pushOwnerAskTitle} body={fill(t.pushOwnerAskBody, { shop: shop.name })} compact fallback={<EmptyWords />} />
              ) : (
                <EmptyWords />
              )}
              {/* the customer's side, replayed, one tap away (the steps themselves are the mission's, above) */}
              <TryItButton shop={{ name: shop.name, kind: shop.kind, color: shop.color, logo: shop.logo, stamp_logo: shop.stamp_logo, goal: shop.goal, gift: shop.gift }} className="press mt-2 w-full rounded-[1rem] bg-canvas px-3 py-2.5 text-center text-[0.8125rem] font-bold text-brand">
                {t.tryLobby} ←
              </TryItButton>
            </div>
          )}
        </div>
      </section>

      <LogoTip shopId={shop.id} logo={shop.logo ?? null} show={logoTip} />
      {offerNote && pay?.offer_until && <OfferPopup shopId={shop.id} offerUntil={pay.offer_until} />}
      <ShopWelcome name={first} shopId={shop.id} show={coachNow} />
      {firstGift && <FirstGift shopId={shop.id} name={firstGift.name} gift={firstGift.gift} />}
      {grant && <PlanOn grant={grant} />}
      <NewsPopup news={coachNow || firstGift || logoTip || offerNote || grant ? null : (news ?? null)} who={me.id} />
      {/* Pointili on the home screen, asked once where Android's Chrome offers it — never over another note */}
      <InstallPopup where="home" who={shop.id} show={served && !coachNow && !firstGift && !logoTip && !offerNote && !grant && !news && !seen.includes("install")} />
    </main>
  );
}
