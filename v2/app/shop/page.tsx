import Link from "next/link";
import { redirect } from "next/navigation";
import { QrCode } from "lucide-react";
import { GiveButton } from "@/components/GiveButton";
import { Icon3D } from "@/components/ui";
import { getMe } from "@/lib/session";
import { call } from "@/lib/supabase";
import { fill, kindIcon, t } from "@/lib/t";

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
 * The owner's home, on one screen whatever the phone: the shop, the code one
 * tap away, the gifts to hand over, today in three numbers, the four places
 * to go — and who came lately, filling what is left and scrolling inside its
 * own box, so the page itself never moves.
 */
export default async function ShopHome() {
  const me = await getMe();
  if (!me) redirect("/shop/new");
  if (!me.shop) redirect("/shop/setup");
  if (!me.shop.goal) redirect("/shop/card");
  const shop = me.shop;
  const home = await call<Home>("shop_home");
  const first = (me.name ?? "").split(" ")[0];
  const tiles = [
    { icon: "fire", value: home?.today ?? 0, label: t.numToday },
    { icon: "people", value: home?.visitors_today ?? 0, label: t.numVisitors },
    { icon: "gift", value: home?.given_today ?? 0, label: t.numGifts },
  ];
  const options = [
    { href: "/shop/customers", icon: "people", label: t.customersTitle },
    { href: "/shop/card", icon: "ticket", label: t.cardTitle },
    { href: "/shop/setup?edit=1", icon: kindIcon(shop.kind), label: t.shopTitle },
    { href: "/me", icon: "wave", label: t.account },
  ];

  return (
    <main className="safe-t safe-b mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden px-5">
      <header className="flex items-center gap-3 pt-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-full shadow-card" style={{ background: shop.color }}>
          <Icon3D name={kindIcon(shop.kind)} size={30} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.8438rem] text-muted">
            {t.hello}
            {first ? ` ${first}` : ""}
          </span>
          <span className="block truncate text-[1.4375rem] font-bold leading-tight">{shop.name}</span>
        </span>
      </header>

      {shop.paused && <p className="mt-3 rounded-2xl bg-coral-soft px-4 py-2.5 text-[0.875rem] font-semibold text-coral">{t.pausedBanner}</p>}

      {/* the one thing an owner opens all day */}
      <Link
        href="/shop/qr"
        className="press relative mt-[2.2dvh] flex shrink-0 items-center gap-4 overflow-hidden rounded-[1.625rem] px-5 py-[1.1rem] text-white"
        style={{
          background: `linear-gradient(150deg, color-mix(in oklab, ${shop.color} 72%, white) -20%, ${shop.color} 45%, color-mix(in oklab, ${shop.color} 68%, black) 120%)`,
          boxShadow: `0 18px 40px -18px color-mix(in oklab, ${shop.color} 80%, black)`,
        }}
      >
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_80%_at_0%_0%,rgb(255_255_255/0.28),transparent_55%)]" aria-hidden />
        <span className="relative grid size-14 shrink-0 place-items-center rounded-[1.125rem] bg-white/20">
          <QrCode className="size-7" />
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
          <div key={x.label} className="rounded-[1.125rem] bg-surface px-2.5 py-2.5 shadow-card">
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
          <Link key={o.href} href={o.href} className="press flex flex-col items-center gap-1 rounded-[1.125rem] bg-surface px-1 py-3 shadow-card">
            <Icon3D name={o.icon} size={30} />
            <span className="w-full truncate text-center text-[0.8125rem] font-bold">{o.label}</span>
          </Link>
        ))}
      </nav>

      {/* who came lately: whatever room is left, scrolling inside */}
      <section className="mt-[2dvh] flex min-h-0 flex-1 flex-col pb-3">
        <h2 className="mb-2 px-0.5 text-[0.9375rem] font-bold">{t.lately}</h2>
        {home && home.recent.length > 0 ? (
          <ul className="min-h-0 divide-y divide-line overflow-y-auto overscroll-contain rounded-[1.25rem] bg-surface shadow-card">
            {home.recent.map((r) => (
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
        ) : (
          <p className="rounded-[1.25rem] bg-surface px-4 py-3.5 text-[0.9062rem] text-muted shadow-card">{t.customersEmptyBody}</p>
        )}
      </section>
    </main>
  );
}
