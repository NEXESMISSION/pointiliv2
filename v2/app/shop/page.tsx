import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, QrCode, ScanLine, Smartphone, Store, Ticket, Users } from "lucide-react";
import { HelpButton } from "@/components/Help";
import { FirstGift } from "@/components/FirstGift";
import { LogoTip } from "@/components/LogoTip";
import { NewsPopup } from "@/components/NewsPopup";
import { InstallPopup, OpenOutside } from "@/components/InstallApp";
import { Mark } from "@/components/Owner";
import { OfferPopup, PayBanner, TrialBanner, type Pay } from "@/components/Pay";
import { ShopMark } from "@/components/ShopMark";
import { PlanOn } from "@/components/PlanOn";
import { RecentList } from "@/components/RecentList";
import { ClipButton } from "@/components/HowClip";
import { ShopWelcome } from "@/components/ShopWelcome";
import { Icon3D } from "@/components/ui";
import { getMe } from "@/lib/session";
import type { News } from "@/lib/news";
import { getHelp } from "@/lib/settings";
import { call } from "@/lib/supabase";
import { fill, t } from "@/lib/t";
import type { CardView } from "@/lib/types";

export const metadata = { title: "المحل" };

type Home = {
  customers: number;
  /** the customers who are not the owner */
  served?: number;
  waiting?: { id: number; at: string; name: string | null; gift: string }[];
  today: number;
  visitors_today: number;
  given_today: number;
  recent: { id: number; card: string; at: string; kind: "stamp" | "gift"; given: boolean; name: string | null; stamps: number; goal: number; gift: string | null; item?: string | null; waiting?: boolean }[];
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
      <h3 className="mt-1.5 text-[0.9375rem] font-bold">{t.customersEmpty}</h3>
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
  if (me.shop.wheel_on && !((await call<{ prizes: unknown[] }>("my_wheel"))?.prizes?.length ?? 0)) redirect("/shop/card");
  if (me.shop.store_on && !((await call<{ items: unknown[] }>("my_store"))?.items?.length ?? 0)) redirect("/shop/store?start=1");
  const shop = me.shop;
  // an owner is somebody's customer too: their own cards, asked for beside the rest
  // so it costs nothing. Never a card at their own shop — the counter refuses one —
  // so every card here is at another business (the founder, 18 Oct 2026)
  const [home, help, news, pay, mine, { welcome }] = await Promise.all([call<Home>("shop_home"), getHelp(), call<News | null>("news_next"), call<Pay | null>("my_payment"), call<CardView[]>("wallet"), searchParams]);
  const myCards = mine ?? [];
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
  const offerNote = !coachNow && !firstGift && !logoTip && !grant && offer && (served || offerLastDay) && !seen.includes("offer");
  const first = (me.name ?? "").split(" ")[0];
  // the trial's line only when it matters: its last two days, or once it is over
  // eslint-disable-next-line react-hooks/purity -- a server page: the clock is read once per request
  const lastDays = !!pay?.trial_until && Date.parse(pay.trial_until) - Date.now() < 48 * 3600_000;
  const trialLine = !paid && !!pay && !pay.exempt && !!pay.trial_until && pay.trial_started !== false && (!!pay.shut || lastDays);
  const recent = home?.recent ?? [];
  const held = home?.held ?? [];
  const lately = recent.length > 0 || held.length > 0;

  return (
    // nothing is clipped: on a phone too short for it all, the page scrolls as a whole
    <main className="safe-t safe-b mx-auto flex h-dvh w-full max-w-md flex-col px-5">
      {/* the shop's own page: its logo and its name lead, the greeting above the name, the help a quiet «؟» at the end */}
      <header className="flex items-center gap-3 pt-3">
        {/* the shop's picture opens «المحل», like a profile picture (the logo tip points at it) */}
        <Link href="/shop/settings" id="shop-tile" aria-label={t.shopTitle} className="press grid size-12 shrink-0 place-items-center overflow-hidden rounded-full shadow-card" style={{ background: shop.color }}>
          <ShopMark shop={shop} size={30} />
        </Link>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.8125rem] text-muted">
            {t.hello}
            {first ? ` ${first}` : ""}
          </span>
          {/* the name opens «المحل»: owners kept tapping it */}
          <Link href="/shop/settings" className="block truncate text-[1.5rem] font-bold leading-tight">
            {shop.name}
          </Link>
        </span>
        {/* the owner's own cards, where they are a customer: a door that is only
            there when something is behind it, and a coral dot when a gift waits */}
        {myCards.length > 0 && (
          <Link href="/wallet" aria-label={t.myCards} className="press relative grid size-11 shrink-0 place-items-center rounded-full bg-surface shadow-card">
            <Ticket className="size-5 text-brand" strokeWidth={2.2} />
            {myCards.some((c) => c.ready) && <span className="absolute -end-0.5 -top-0.5 size-3 rounded-full bg-coral ring-2 ring-canvas" aria-hidden />}
          </Link>
        )}
        <HelpButton help={help} />
      </header>

      {shop.paused && <p className="mt-3 rounded-2xl bg-coral-soft px-4 py-2.5 text-[0.8125rem] font-semibold text-coral">{t.pausedBanner}</p>}
      {/* the trial's clock and a call, until the year is turned on (the founder's own and the tests: just the price) */}
      {!paid && pay && (pay.exempt || !pay.trial_until ? <PayBanner pay={pay} offer={offer} /> : trialLine ? <TrialBanner pay={pay} phone={help.phone} /> : null)}
      {/* in Facebook's own browser: the way out to the phone's browser, where Pointili stays */}
      <OpenOutside where="home" look="line" className="mt-1" />

      {/* the one thing an owner does all day: a tampon — the code shown, or the customer's number typed — and
          the camera for a customer's own code under them (the founder's «simpler», 17 Oct 2026) */}
      <h2 className="mt-[2dvh] shrink-0 px-0.5 text-[1rem] font-bold">{t.giveTitle}</h2>
      {/* the code is the main way (purple, filled); the number is the other one (white, its icon purple) */}
      <div className="mt-2 grid shrink-0 grid-cols-2 gap-2">
        <Link
          href="/shop/qr"
          className="press relative flex min-h-[clamp(6.25rem,15dvh,8.5rem)] flex-col justify-between overflow-hidden rounded-[1.5rem] bg-[linear-gradient(150deg,#8f75ff,#6c47ff_50%,#4a2ad6)] p-3.5 text-white shadow-[0_8px_18px_-12px_rgb(74_42_214/0.7)]"
        >
          <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_80%_at_0%_0%,rgb(255_255_255/0.22),transparent_55%)]" aria-hidden />
          <span className="relative grid size-11 place-items-center rounded-[0.875rem] bg-white/20">
            <QrCode className="size-6" />
          </span>
          <span className="relative">
            <b className="block text-[1.1875rem] font-bold leading-tight">{t.showCode}</b>
            <span className="block text-[0.75rem] leading-snug text-white/85">{t.giveQrSub}</span>
          </span>
        </Link>
        <Link href="/shop/collect?by=phone" className="press flex min-h-[clamp(6.25rem,15dvh,8.5rem)] flex-col justify-between rounded-[1.5rem] bg-surface p-3.5 shadow-card">
          <Mark icon={Smartphone} size={44} />
          <span>
            <b className="block text-[1.1875rem] font-bold leading-tight">{t.giveByPhone}</b>
            <span className="block text-[0.75rem] leading-snug text-muted">{t.giveByPhoneSub}</span>
          </span>
        </Link>
      </div>
      {/* the three places, as they always were: the camera for a customer's own code, the customers, and
          «المحل» — the account and the shop. «relative»: drawn over the shadow of the code's tile above */}
      <nav className="relative mt-2 grid shrink-0 grid-cols-3 gap-2">
        {[
          { href: "/shop/collect?by=scan", icon: ScanLine, label: t.collectScanShort },
          { href: "/shop/customers", icon: Users, label: t.customersTitle },
          { href: "/shop/settings", icon: Store, label: t.shopTitle },
        ].map((x) => (
          <Link key={x.href} href={x.href} className="press flex items-center justify-center gap-2 rounded-[1.125rem] bg-surface px-2 py-[clamp(0.6rem,1.6dvh,0.875rem)] shadow-card">
            <x.icon className="size-5 shrink-0 text-brand" strokeWidth={2.2} />
            <span className="min-w-0 truncate text-[0.9375rem] font-bold">{x.label}</span>
          </Link>
        ))}
      </nav>

      {/* today, in three numbers: one card, each number one tap from its page */}
      <div className="relative mt-2 grid shrink-0 grid-cols-3 overflow-hidden rounded-[1.125rem] bg-surface shadow-card [&>*+*]:border-s [&>*+*]:border-line">
        {[
          { href: "/shop/stats", n: home?.today ?? 0, label: t.statToday },
          { href: "/shop/customers", n: home?.served ?? 0, label: t.statCustomers },
          { href: "/shop/customers", n: home?.waiting?.length ?? 0, label: t.statWaiting },
        ].map((x) => (
          <Link key={x.label} href={x.href} className="press px-3 py-[clamp(0.4rem,1.2dvh,0.7rem)] active:bg-canvas">
            <b className="num block text-[1.375rem] font-bold leading-tight">{x.n}</b>
            <span className="block truncate text-[0.75rem] text-muted">{x.label}</span>
          </Link>
        ))}
      </div>

      {/* a new owner's first steps (the card, the first customer, five), until the bravo has shown */}
      {/* «باش تبدا», the three first steps, went (the founder, 17 Oct 2026: «useless»): the two ways above say it */}

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
                    waiting: !!r.waiting,
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
              <Link href="/shop/customers" className="mt-auto flex shrink-0 items-center justify-center gap-1 border-t border-line py-3 text-[0.8125rem] font-bold text-brand">
                {t.seeAll} <ChevronLeft className="size-4" />
              </Link>
            </>
          ) : (
            // before the first customer: how it goes, in three steps
            <div className="m-auto flex w-full max-w-[21rem] flex-col items-center px-3 py-3 text-center">
              {/* the picture and the two lines; no ask for a word tomorrow morning here (the founder, 17 Oct 2026) */}
              <EmptyWords />
              {/* how it goes, filmed for real, one tap away (the steps themselves are the mission's, above) */}
              <ClipButton className="press mt-2 w-full rounded-[1rem] bg-canvas px-3 py-2.5 text-center text-[0.8125rem] font-bold text-brand">
                {t.tryLobby} ←
              </ClipButton>
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
