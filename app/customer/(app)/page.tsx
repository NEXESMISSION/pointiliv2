import Link from "next/link";
import { ChevronRight, Gift, ScanLine, User } from "lucide-react";
import { CardTile } from "@/components/customer/CardTile";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { rpc } from "@/lib/session";
import { greeting } from "@/lib/format";
import type { HomeCard } from "@/lib/types";

export const metadata = { title: "Home" };

type Home = { profile: { full_name: string | null; phone: string; role: string }; cards: HomeCard[] };

export default async function CustomerHome() {
  const home = await rpc<Home>("customer_home");
  const firstName = home.profile?.full_name?.split(" ")[0];
  const ready = home.cards.filter((c) => c.unlocked.length > 0);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3 pt-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight text-ink">
            {greeting()}
            {firstName ? `, ${firstName}` : ""} 👋
          </h1>
          <p className="text-sm text-muted">{home.cards.length ? "Your loyalty cards" : "Welcome to Pointidi"}</p>
        </div>
        <Link href="/customer/profile" className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-brand-600 shadow-card" aria-label="Profile">
          <User className="size-5" />
        </Link>
      </header>

      {ready.length > 0 && (
        <Link href="/customer/rewards" className="flex animate-rise items-center gap-3 rounded-3xl bg-brand-600 p-4 text-white shadow-brand">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/15 text-2xl" aria-hidden>
            🎉
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold">Reward unlocked!</span>
            <span className="block truncate text-sm text-white/85">
              {ready[0]!.unlocked[0]} at {ready[0]!.business.name}
              {ready.length > 1 ? ` · +${ready.length - 1} more` : ""}
            </span>
          </span>
          <ChevronRight className="size-5 shrink-0" />
        </Link>
      )}

      {home.cards.length === 0 ? (
        <EmptyState
          icon={<Gift className="size-8" />}
          title="You don't have any loyalty cards yet."
          action={
            <div className="space-y-2">
              <LinkButton href="/customer/scan" block icon={<ScanLine className="size-5" />}>
                Scan a QR code
              </LinkButton>
              <LinkButton href="/how-it-works" variant="outline" block>
                How Pointidi works
              </LinkButton>
            </div>
          }
        >
          Visit a Pointidi business and scan their QR to get started.
        </EmptyState>
      ) : (
        <section className="space-y-3">
          {home.cards.slice(0, 4).map((card) => (
            <CardTile key={card.customer_id} card={card} />
          ))}
          {home.cards.length > 4 && (
            <Link href="/customer/cards" className="flex h-13 items-center justify-between rounded-2xl bg-white px-4 text-[15px] font-semibold text-body shadow-card">
              See all cards ({home.cards.length})
              <ChevronRight className="size-5 text-faint" />
            </Link>
          )}
        </section>
      )}

      {home.cards.length > 0 && (
        <LinkButton href="/customer/scan" variant="secondary" block icon={<ScanLine className="size-5" />}>
          Scan to collect a stamp
        </LinkButton>
      )}
    </div>
  );
}
