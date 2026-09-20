import Link from "next/link";
import { ChevronRight, Gift, ScanLine, User } from "lucide-react";
import { CardTile } from "@/components/customer/CardTile";
import { InstallBanner } from "@/components/InstallPrompt";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { rpc } from "@/lib/session";
import { greeting } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import type { HomeCard } from "@/lib/types";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.customer.home.title };
}

/** Cards on the home screen. Two leave room for the reward banner, the
    install banner and the iPhone safe areas without the screen scrolling. */
const HOME_CARDS = 2;

type Home = { profile: { full_name: string | null; phone: string; role: string }; cards: HomeCard[] };

export default async function CustomerHome() {
  const { t, locale, count, fill } = await getI18n();
  const home = await rpc<Home>("customer_home");
  const firstName = home.profile?.full_name?.split(" ")[0];
  const ready = home.cards.filter((c) => c.unlocked.length > 0);
  const initial = (firstName?.[0] ?? "").toUpperCase();

  return (
    <div className="space-y-3">
      <header className="grid grid-cols-[2.25rem_1fr_2.25rem] items-center gap-2">
        <span />
        <div className="min-w-0 text-center">
          <p className="text-xs text-muted">{greeting(locale)}</p>
          <h1 className="truncate text-lg font-semibold tracking-tight text-ink">
            {firstName ? firstName : home.cards.length ? t.customer.home.yourCards : t.customer.home.welcome}
          </h1>
        </div>
        <Link
          href="/customer/profile"
          className="grid size-9 place-items-center rounded-full border border-line bg-white text-sm font-semibold text-ink shadow-card"
          aria-label={t.nav.customer.profile}
        >
          {initial || <User className="size-[18px]" />}
        </Link>
      </header>

      <InstallBanner />

      {ready.length > 0 && (
        <Link href="/customer/rewards" className="flex animate-rise items-center gap-2.5 rounded-2xl border border-line bg-white p-2.5 shadow-card">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-600 text-white">
            <Gift className="size-[18px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink">{t.customer.home.rewardReady}</span>
            <span className="block truncate text-xs text-muted">
              {fill(t.customer.home.rewardAt, { reward: ready[0]!.unlocked[0]!, business: ready[0]!.business.name })}
              {ready.length > 1 ? ` · ${count(t.customer.home.andMore, ready.length - 1)}` : ""}
            </span>
          </span>
          <ChevronRight className="rtl:-scale-x-100 size-4 shrink-0 text-faint" />
        </Link>
      )}

      {home.cards.length === 0 ? (
        <EmptyState
          icon={<Gift />}
          title={t.customer.noCards}
          action={
            <div className="space-y-2">
              <LinkButton href="/customer/scan" block icon={<ScanLine className="size-5" />}>
                {t.customer.scanQr}
              </LinkButton>
              <LinkButton href="/how-it-works" variant="ghost" block>
                {t.customer.howItWorks}
              </LinkButton>
            </div>
          }
        >
          {t.customer.home.emptyBody}
        </EmptyState>
      ) : (
        <section className="space-y-2.5">
          {home.cards.slice(0, HOME_CARDS).map((card) => (
            <CardTile key={card.customer_id} card={card} />
          ))}
          {home.cards.length > HOME_CARDS && (
            <Link href="/customer/cards" className="flex h-10 items-center justify-center gap-1 rounded-xl text-sm font-semibold text-brand-600 hover:bg-white">
              {fill(t.customer.home.seeAllCards, { n: home.cards.length })} <ChevronRight className="rtl:-scale-x-100 size-4" />
            </Link>
          )}
        </section>
      )}
    </div>
  );
}
