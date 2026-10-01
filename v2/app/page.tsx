import Link from "next/link";
import { redirect } from "next/navigation";
import { Pass } from "@/components/Pass";
import { Wallet } from "@/components/Wallet";
import { Icon3D, Logo, Screen } from "@/components/ui";
import { getMe, homeOf } from "@/lib/session";
import { call } from "@/lib/supabase";
import { t } from "@/lib/t";
import type { CardView } from "@/lib/types";

/** Home: the welcome for a stranger, the counter for a shop, the wallet for a customer. */
export default async function Home() {
  const me = await getMe();
  if (!me) return <Welcome />;
  if (me.shop) redirect(homeOf(me));
  const cards = (await call<CardView[]>("wallet")) ?? [];
  return <Wallet me={me} cards={cards} />;
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
