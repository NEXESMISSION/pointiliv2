import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, QrCode } from "lucide-react";
import { GiveButton } from "@/components/GiveButton";
import { Icon3D, Logo, Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { call } from "@/lib/supabase";
import { customersN, fill, kindIcon, stampsN, t } from "@/lib/t";

export const metadata = { title: "المحل" };

type Home = {
  customers: number;
  today: number;
  visitors_today: number;
  given: number;
  waiting: { id: number; at: string; name: string | null; gift: string }[];
  recent: { id: number; at: string; kind: "stamp" | "gift"; given: boolean; name: string | null; stamps: number; goal: number }[];
};

const time = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis" }).format(new Date(iso));

/**
 * The owner's home: the code one tap away, the gifts to hand over, today in
 * three numbers, everything else as four tiles, and who came lately.
 */
export default async function ShopHome() {
  const me = await getMe();
  if (!me) redirect("/shop/new");
  if (!me.shop) redirect("/shop/setup");
  if (!me.shop.goal) redirect("/shop/card");
  const shop = me.shop;
  const home = await call<Home>("shop_home");
  const first = me.name.split(" ")[0];
  const tiles = [
    { icon: "fire", value: home?.today ?? 0, label: t.numToday },
    { icon: "people", value: home?.visitors_today ?? 0, label: t.numVisitors },
    { icon: "gift", value: home?.given ?? 0, label: t.numGifts },
  ];
  const options = [
    { href: "/shop/customers", icon: "people", label: t.customersTitle, hint: customersN(home?.customers ?? 0) },
    { href: "/shop/card", icon: "ticket", label: t.cardTitle, hint: `${stampsN(shop.goal ?? 0)} · ${shop.gift}` },
    { href: "/shop/setup?edit=1", icon: kindIcon(shop.kind), label: t.shopTitle, hint: t.kinds[shop.kind] ?? "" },
    { href: "/me", icon: "wave", label: t.account, hint: first || t.account },
  ];

  return (
    <Screen className="pb-10">
      <header className="flex items-center justify-between pt-2">
        <span className="grid size-11 place-items-center rounded-full shadow-card" style={{ background: shop.color }}>
          <Icon3D name={kindIcon(shop.kind)} size={28} />
        </span>
        <Logo />
      </header>

      <div className="mt-5">
        <p className="flex items-center gap-1.5 text-[15px] text-muted">
          {t.hello}
          {first ? ` ${first}` : ""} <Icon3D name="wave" size={22} />
        </p>
        <h1 className="mt-0.5 truncate text-[30px] font-bold leading-tight">{shop.name}</h1>
      </div>

      {shop.paused && <p className="mt-3 rounded-2xl bg-coral-soft px-4 py-3 text-[14.5px] font-semibold text-coral">{t.pausedBanner}</p>}

      {/* the one thing an owner opens all day */}
      <Link
        href="/shop/qr"
        className="press relative mt-4 flex items-center gap-4 overflow-hidden rounded-[28px] p-5 text-white"
        style={{
          background: `linear-gradient(150deg, color-mix(in oklab, ${shop.color} 72%, white) -20%, ${shop.color} 45%, color-mix(in oklab, ${shop.color} 68%, black) 120%)`,
          boxShadow: `0 20px 44px -18px color-mix(in oklab, ${shop.color} 80%, black)`,
        }}
      >
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_80%_at_0%_0%,rgb(255_255_255/0.28),transparent_55%)]" aria-hidden />
        <span className="relative grid size-16 shrink-0 place-items-center rounded-[20px] bg-white/20">
          <QrCode className="size-8" />
        </span>
        <span className="relative min-w-0">
          <span className="block text-[23px] font-bold leading-tight">{t.showCode}</span>
          <span className="block truncate text-[14px] text-white/85">{t.showCodeHint}</span>
        </span>
      </Link>

      {home && home.waiting.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2.5 px-0.5 text-[18px] font-bold">{t.waitingTitle}</h2>
          <div className="space-y-2.5">
            {home.waiting.map((g) => (
              <div key={g.id} className="flex animate-rise items-center gap-3 rounded-[22px] bg-surface p-3.5 shadow-card">
                <Icon3D name="gift" size={40} className="shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-bold">{fill(t.giftFor, { who: g.name ?? t.someone, gift: g.gift })}</span>
                  <span className="num block text-[12.5px] text-muted">{time(g.at)}</span>
                </span>
                <GiveButton id={g.id} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-5">
        <h2 className="mb-2.5 px-0.5 text-[18px] font-bold">{t.todayTitle}</h2>
        <div className="grid grid-cols-3 gap-2.5">
          {tiles.map((x) => (
            <div key={x.label} className="rounded-[22px] bg-surface px-2 py-3.5 text-center shadow-card">
              <Icon3D name={x.icon} size={30} className="mx-auto" />
              <p className="num mt-1 text-[24px] font-bold leading-tight">{x.value}</p>
              <p className="truncate text-[12.5px] text-muted">{x.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <h2 className="mb-2.5 px-0.5 text-[18px] font-bold">{t.options}</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {options.map((o) => (
            <Link key={o.href} href={o.href} className="press rounded-[22px] bg-surface p-3.5 shadow-card">
              <Icon3D name={o.icon} size={34} />
              <span className="mt-1.5 block text-[16px] font-bold">{o.label}</span>
              <span className="block truncate text-[12.5px] text-muted">{o.hint}</span>
            </Link>
          ))}
        </div>
      </section>

      {home && home.recent.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2.5 px-0.5 text-[18px] font-bold">{t.lately}</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-[22px] bg-surface shadow-card">
            {home.recent.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                {r.kind === "stamp" ? (
                  <span className="num grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-[13px] font-bold text-brand">+1</span>
                ) : (
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-coral-soft">
                    <Icon3D name="gift" size={24} />
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                  {r.kind === "stamp"
                    ? fill(t.lateStamp, { who: r.name ?? t.someone })
                    : fill(r.given ? t.lateGiven : t.lateGift, { who: r.name ?? t.someone, gift: shop.gift ?? "" })}
                </span>
                <span className="num shrink-0 text-[12.5px] text-muted">{time(r.at)}</span>
              </li>
            ))}
          </ul>
          <Link href="/shop/customers" className="mt-2 flex items-center justify-center gap-1 py-2 text-[14.5px] font-semibold text-brand">
            {t.customersTitle} <ChevronLeft className="size-4" />
          </Link>
        </section>
      )}
    </Screen>
  );
}
