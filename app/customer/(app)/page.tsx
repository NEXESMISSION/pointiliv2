import Link from "next/link";
import { ChevronRight, Gift, ScanLine, User } from "lucide-react";
import { WalletStack } from "@/components/customer/WalletStack";
import { InstallBanner } from "@/components/InstallPrompt";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon3D } from "@/components/ui/Icon3D";
import { LinkButton } from "@/components/ui/Button";
import { rpc } from "@/lib/session";
import { greeting } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import type { HomeCard } from "@/lib/types";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.customer.home.title };
}

/** Cards in the wallet on Home: three fit a phone with the gift and the greeting. */
const HOME_CARDS = 3;

type Home = { profile: { full_name: string | null; phone: string; role: string }; cards: HomeCard[] };

/** The lobby: who you are, the gift waiting for you, your cards like a wallet. */
export default async function CustomerHome() {
  const { t, locale, count, fill } = await getI18n();
  const home = await rpc<Home>("customer_home");
  const firstName = home.profile?.full_name?.split(" ")[0];
  const ready = home.cards.filter((c) => c.unlocked.length > 0);
  const initial = (firstName?.[0] ?? "").toUpperCase();
  const h = t.customer.home;

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <Link
          href="/customer/profile"
          className="press grid size-[42px] place-items-center rounded-full bg-[linear-gradient(145deg,#ffb18a,#ff6b4a)] text-[15px] font-bold text-white shadow-[0_0_0_3px_var(--color-surface),var(--shadow-card)]"
          aria-label={t.nav.customer.profile}
        >
          {initial || <User className="size-5" />}
        </Link>
        {ready.length > 0 && (
          <Link href="/customer/rewards" className="press relative grid size-[42px] place-items-center rounded-full bg-surface text-ink shadow-card" aria-label={h.giftWaiting}>
            <Gift className="size-5" />
            <span className="absolute end-2 top-2 size-2.5 rounded-full bg-coral-500 ring-2 ring-surface" />
          </Link>
        )}
      </header>

      <div>
        <p className="flex items-center gap-1.5 text-sm text-muted">
          {greeting(locale)} <Icon3D name="wave" size={20} />
        </p>
        <h1 className="mt-0.5 truncate text-[30px] font-bold leading-tight text-ink">{firstName ?? h.welcome}</h1>
      </div>

      <InstallBanner />

      {ready.length > 0 && (
        <Link href="/customer/rewards" className="press relative block animate-rise overflow-hidden rounded-[26px] bg-surface p-4 pe-28 shadow-card">
          <span className="absolute -end-10 -top-10 size-44 rounded-full bg-[radial-gradient(circle,var(--color-coral-50)_0%,transparent_70%)]" aria-hidden />
          <span className="absolute end-3 top-1/2 -translate-y-1/2" aria-hidden>
            <Icon3D name="gift" size={84} className="animate-float" />
          </span>
          <b className="relative block text-[16.5px] font-bold text-ink">{h.giftWaiting}</b>
          <span className="relative block truncate text-[13.5px] text-muted">
            {fill(h.rewardAt, { reward: ready[0]!.unlocked[0]!, business: ready[0]!.business.name })}
            {ready.length > 1 ? ` · ${count(h.andMore, ready.length - 1)}` : ""}
          </span>
          <span className="relative mt-2.5 inline-flex h-[34px] items-center gap-1.5 rounded-full bg-coral-500 px-3.5 text-[13.5px] font-semibold text-white shadow-[0_8px_18px_-6px_rgb(255_107_74/0.6)]">
            {h.take}
            <ChevronRight className="rtl:-scale-x-100 size-4" />
          </span>
        </Link>
      )}

      {home.cards.length === 0 ? (
        <EmptyState
          icon={<Icon3D name="gift" size={40} />}
          title={t.customer.noCards}
          action={
            <LinkButton href="/customer/scan" block icon={<ScanLine className="size-5" />}>
              {t.customer.scanQr}
            </LinkButton>
          }
        >
          {h.emptyBody}
        </EmptyState>
      ) : (
        <section>
          <div className="mb-3 flex items-baseline justify-between px-0.5">
            <h2 className="text-lg font-bold text-ink">{h.myCards}</h2>
            {home.cards.length > HOME_CARDS && (
              <Link href="/customer/cards" className="text-sm font-medium text-brand-600">
                {h.all}
              </Link>
            )}
          </div>
          <WalletStack cards={home.cards} max={HOME_CARDS} />
        </section>
      )}
    </div>
  );
}
