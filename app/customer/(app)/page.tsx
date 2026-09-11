import Link from "next/link";
import { ChevronRight, Gift, ScanLine, User } from "lucide-react";
import { CardTile } from "@/components/customer/CardTile";
import { InstallBanner } from "@/components/InstallPrompt";
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
  const initial = (firstName?.[0] ?? "").toUpperCase();

  return (
    <div className="space-y-5">
      <header className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center gap-2 pt-2">
        <span />
        <div className="min-w-0 text-center">
          <p className="text-[13px] text-muted">{greeting()}</p>
          <h1 className="truncate text-xl font-semibold tracking-tight text-ink">{firstName ? firstName : home.cards.length ? "Your cards" : "Welcome"}</h1>
        </div>
        <Link href="/customer/profile" className="grid size-10 place-items-center rounded-full border border-line bg-white text-sm font-semibold text-ink shadow-card" aria-label="Profile">
          {initial || <User className="size-[18px]" />}
        </Link>
      </header>

      <InstallBanner />

      {ready.length > 0 && (
        <Link href="/customer/rewards" className="flex animate-rise items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-card">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white">
            <Gift className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-ink">Reward ready 🎉</span>
            <span className="block truncate text-[13px] text-muted">
              {ready[0]!.unlocked[0]} at {ready[0]!.business.name}
              {ready.length > 1 ? ` · +${ready.length - 1} more` : ""}
            </span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-faint" />
        </Link>
      )}

      {home.cards.length === 0 ? (
        <EmptyState
          icon={<Gift />}
          title="No loyalty cards yet"
          action={
            <div className="space-y-2">
              <LinkButton href="/customer/scan" block icon={<ScanLine className="size-5" />}>
                Scan a QR code
              </LinkButton>
              <LinkButton href="/how-it-works" variant="ghost" block>
                How Pointili works
              </LinkButton>
            </div>
          }
        >
          Visit a Pointili shop and scan the QR at the counter to get your first stamp.
        </EmptyState>
      ) : (
        <section className="space-y-3">
          {home.cards.slice(0, 4).map((card) => (
            <CardTile key={card.customer_id} card={card} />
          ))}
          {home.cards.length > 4 && (
            <Link href="/customer/cards" className="flex h-11 items-center justify-center gap-1 rounded-xl text-sm font-semibold text-brand-600 hover:bg-white">
              See all {home.cards.length} cards <ChevronRight className="size-4" />
            </Link>
          )}
        </section>
      )}
    </div>
  );
}
