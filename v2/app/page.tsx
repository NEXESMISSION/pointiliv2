import Link from "next/link";
import { redirect } from "next/navigation";
import { ScanLine } from "lucide-react";
import { Pass } from "@/components/Pass";
import { Icon3D, LinkBtn, Logo, Screen } from "@/components/ui";
import { getMe, homeOf } from "@/lib/session";
import { call } from "@/lib/supabase";
import { fill, t } from "@/lib/t";
import type { CardView } from "@/lib/types";

/** Home: the welcome for a stranger, the counter for a shop, the wallet for a customer. */
export default async function Home() {
  const me = await getMe();
  if (!me) return <Welcome />;
  if (me.shop) redirect(homeOf(me));
  const cards = (await call<CardView[]>("wallet")) ?? [];
  const first = me.name.split(" ")[0];
  const waiting = cards.filter((c) => c.ready);

  return (
    <Screen className="pb-32">
      <header className="flex items-center justify-between pt-2">
        <Link href="/me" className="press grid size-11 place-items-center rounded-full bg-[linear-gradient(145deg,#ffb18a,#ff6b4a)] text-[16px] font-bold text-white shadow-card" aria-label={t.account}>
          {(first?.[0] ?? "؟").toUpperCase()}
        </Link>
        <Logo />
      </header>

      <div className="mt-6">
        <p className="flex items-center gap-1.5 text-[15px] text-muted">
          {t.hello} <Icon3D name="wave" size={22} />
        </p>
        <h1 className="mt-0.5 truncate text-[32px] font-bold leading-tight">{first || t.myCards}</h1>
      </div>

      {waiting.length > 0 && (
        <Link href={`/c/${waiting[0]!.id}`} className="press relative mt-5 block animate-rise overflow-hidden rounded-[26px] bg-surface p-4 pe-28 shadow-card">
          <span className="absolute end-3 top-1/2 -translate-y-1/2" aria-hidden>
            <Icon3D name="gift" size={80} className="animate-float" />
          </span>
          <b className="block text-[17px] font-bold">{t.giftWaiting}</b>
          <span className="block truncate text-[14px] text-muted">{fill(t.giftAt, { gift: waiting[0]!.shop.gift ?? "", shop: waiting[0]!.shop.name })}</span>
        </Link>
      )}

      {cards.length === 0 ? (
        <div className="mt-10 flex flex-1 flex-col items-center text-center">
          <Icon3D name="ticket" size={96} className="animate-float" />
          <h2 className="mt-5 text-[22px] font-bold">{t.noCards}</h2>
          <p className="mt-1.5 max-w-[16rem] text-[15px] text-muted">{t.noCardsBody}</p>
        </div>
      ) : (
        <section className="mt-6">
          <h2 className="mb-3 px-0.5 text-[18px] font-bold">{t.myCards}</h2>
          <div className="space-y-3">
            {cards.map((c, i) => (
              <Link key={c.id} href={`/c/${c.id}`} className="press block animate-rise" style={{ animationDelay: `${i * 70}ms` }}>
                <Pass shop={c.shop} stamps={c.stamps} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* the one thing a customer does here */}
      <div className="safe-b pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md px-5">
        <LinkBtn href="/scan" className="pointer-events-auto h-[64px] animate-breathe rounded-[24px] text-[19px]">
          <ScanLine className="size-6" strokeWidth={2.4} /> {t.scan}
        </LinkBtn>
      </div>
    </Screen>
  );
}

function Welcome() {
  return (
    <Screen>
      <div className="flex justify-center pt-4">
        <Logo />
      </div>
      <div className="relative mx-auto mt-8 w-full max-w-sm">
        {/* a real card, a second one peeking behind it, the gift floating over: the whole idea in one look */}
        <div className="absolute inset-x-6 -top-5 -rotate-[5deg] opacity-90">
          <Pass shop={{ name: "Salon Nour", kind: "salon", color: "#0891B2", goal: 6, gift: "حجامة بلاش" }} stamps={3} small />
        </div>
        <div className="relative rotate-[2deg] animate-rise">
          <Pass shop={{ name: "Café Yasmine", kind: "cafe", color: "#FF6B4A", goal: 8, gift: "قهوة بلاش" }} stamps={6} />
        </div>
        <Icon3D name="gift" size={78} className="absolute -bottom-8 -end-2 animate-float" />
      </div>
      <h1 className="mt-12 text-center text-[28px] font-bold leading-tight">{t.tagline}</h1>

      {/* the crossroads: someone who collects, or a shop that gives */}
      <div className="mt-auto space-y-3 pt-8">
        <Link href="/join" className="press flex items-center gap-4 rounded-[24px] bg-[linear-gradient(150deg,#9b7bff_-30%,#6c47ff_50%,#4a2ad6_130%)] p-4 text-white shadow-[0_16px_34px_-14px_rgb(108_71_255/0.7)]">
          <span className="grid size-14 shrink-0 place-items-center rounded-[18px] bg-white/20">
            <Icon3D name="ticket" size={36} />
          </span>
          <span className="min-w-0">
            <span className="block text-[19px] font-bold">{t.iAmCustomer}</span>
            <span className="block text-[13.5px] text-white/85">{t.iAmCustomerHint}</span>
          </span>
        </Link>
        <Link href="/shop/new" className="press flex items-center gap-4 rounded-[24px] bg-surface p-4 shadow-card">
          <span className="grid size-14 shrink-0 place-items-center rounded-[18px] bg-coral-soft">
            <Icon3D name="shop" size={36} />
          </span>
          <span className="min-w-0">
            <span className="block text-[19px] font-bold">{t.iAmShop}</span>
            <span className="block text-[13.5px] text-muted">{t.iAmShopHint}</span>
          </span>
        </Link>
        <Link href="/login" className="block py-2 text-center text-[15.5px] font-semibold text-brand">
          {t.haveAccountLogin}
        </Link>
      </div>
    </Screen>
  );
}
