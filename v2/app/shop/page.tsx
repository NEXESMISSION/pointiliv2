import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, QrCode } from "lucide-react";
import { GiveButton } from "@/components/GiveButton";
import { HelpButton } from "@/components/Help";
import { LogoTip } from "@/components/LogoTip";
import { NewsPopup } from "@/components/NewsPopup";
import { ShopMark } from "@/components/ShopMark";
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
 * shop, the code one tap away (bigger on a taller phone), the gifts to hand
 * over, today in three numbers, the four places to go — and who came lately
 * in a box that takes all the room left, scrolling inside it. Before the
 * first customer, that box says how it goes, in three steps.
 */
export default async function ShopHome() {
  const me = await getMe();
  if (!me) redirect("/shop/new");
  if (!me.shop) redirect("/shop/setup");
  if (!me.shop.goal) redirect("/shop/card");
  const shop = me.shop;
  const [home, help, news] = await Promise.all([call<Home>("shop_home"), getHelp(), call<News | null>("news_next")]);
  // one popup at a time: a new owner's logo tip first, the news on a later visit
  const logoTip = !(me.seen ?? []).includes("logo_tip");
  const first = (me.name ?? "").split(" ")[0];
  const tiles = [
    { icon: "fire", value: home?.today ?? 0, label: t.numToday },
    { icon: "people", value: home?.visitors_today ?? 0, label: t.numVisitors },
    { icon: "gift", value: home?.given_today ?? 0, label: t.numGifts },
  ];
  const options = [
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

  return (
    <main className="safe-t safe-b mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden px-5">
      <header className="flex items-center gap-3 pt-3">
        <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full shadow-card" style={{ background: shop.color }}>
          <ShopMark shop={shop} size={30} />
        </span>
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

      {/* the one thing an owner opens all day: bigger when the phone is taller */}
      <Link
        href="/shop/qr"
        className="press relative mt-[2.2dvh] flex shrink-0 items-center gap-4 overflow-hidden rounded-[1.625rem] px-5 py-[clamp(1rem,2.9dvh,1.75rem)] text-white"
        style={{
          background: `linear-gradient(150deg, color-mix(in oklab, ${shop.color} 72%, white) -20%, ${shop.color} 45%, color-mix(in oklab, ${shop.color} 68%, black) 120%)`,
          boxShadow: `0 18px 40px -18px color-mix(in oklab, ${shop.color} 80%, black)`,
        }}
      >
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_80%_at_0%_0%,rgb(255_255_255/0.28),transparent_55%)]" aria-hidden />
        <span className="relative grid size-[clamp(3.5rem,7dvh,4.5rem)] shrink-0 place-items-center rounded-[1.125rem] bg-white/20">
          <QrCode className="size-[46%]" />
        </span>
        <span className="relative min-w-0">
          <span className="block text-[1.375rem] font-bold leading-tight">{t.showCode}</span>
          <span className="block truncate text-[0.8438rem] text-white/85">{t.showCodeHint}</span>
        </span>
      </Link>

      {/* gifts to hand over: two show, more scroll inside */}
      {home && home.waiting.length > 0 && (
        <div className="mt-3 max-h-[8.5rem] shrink-0 space-y-2 overflow-y-auto overscroll-contain">
          {home.waiting.map((g) => (
            <div key={g.id} className="flex animate-rise items-center gap-3 rounded-[1.25rem] bg-surface p-3 shadow-card">
              <Icon3D name="gift" size={34} className="shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.9375rem] font-bold">{fill(t.giftFor, { who: g.name ?? t.someone, gift: g.gift })}</span>
                <span className="num block text-[0.75rem] text-muted">{time(g.at)}</span>
              </span>
              <GiveButton id={g.id} />
            </div>
          ))}
        </div>
      )}

      {/* today, in three numbers */}
      <div className="mt-[2dvh] grid shrink-0 grid-cols-3 gap-2">
        {tiles.map((x) => (
          <div key={x.label} className="rounded-[1.125rem] bg-surface px-2.5 py-[clamp(0.625rem,1.5dvh,0.95rem)] shadow-card">
            <span className="flex items-center gap-1.5">
              <Icon3D name={x.icon} size={22} className="shrink-0" />
              <span className="num text-[1.25rem] font-bold leading-none">{x.value}</span>
            </span>
            <span className="mt-1 block truncate text-[0.75rem] text-muted">{x.label}</span>
          </div>
        ))}
      </div>

      {/* the four places to go, in one row */}
      <nav className="mt-[1.6dvh] grid shrink-0 grid-cols-4 gap-2">
        {options.map((o) => (
          <Link key={o.href} id={o.id} href={o.href} className="press flex flex-col items-center gap-1 rounded-[1.125rem] bg-surface px-1 py-[clamp(0.75rem,1.9dvh,1.15rem)] shadow-card">
            {o.mark}
            <span className="w-full truncate text-center text-[0.8125rem] font-bold">{o.label}</span>
          </Link>
        ))}
      </nav>

      {/* who came lately: a box that takes all the room left */}
      <section className="mt-[2dvh] flex min-h-0 flex-1 flex-col pb-3">
        <h2 className="mb-2 px-0.5 text-[0.9375rem] font-bold">{t.lately}</h2>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.25rem] bg-surface shadow-card">
          {recent.length > 0 ? (
            <>
              <ul className="min-h-0 divide-y divide-line overflow-y-auto overscroll-contain">
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
            <div className="m-auto flex w-full max-w-[19rem] flex-col items-center overflow-y-auto px-4 py-4 text-center">
              <Icon3D name="phone" size={56} className="animate-float" />
              <h3 className="mt-2 text-[1.0625rem] font-bold">{t.customersEmpty}</h3>
              <ol className="mt-3 w-full space-y-2 text-start">
                {t.firstSteps.map((s, i) => (
                  <li key={s} className="flex items-center gap-2.5">
                    <span className="num grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-[0.8125rem] font-bold text-brand">{i + 1}</span>
                    <span className="text-[0.9062rem] font-semibold">{s}</span>
                  </li>
                ))}
              </ol>
              <Link href="/shop/qr" className="press mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-brand px-5 text-[0.9062rem] font-bold text-white shadow-[0_10px_22px_-10px_rgb(108_71_255/0.8)]">
                <QrCode className="size-4" /> {t.showCode}
              </Link>
            </div>
          )}
        </div>
      </section>

      <LogoTip shopId={shop.id} logo={shop.logo ?? null} show={logoTip} />
      <NewsPopup news={logoTip ? null : (news ?? null)} who={me.id} />
    </main>
  );
}
