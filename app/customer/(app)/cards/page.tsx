import { CreditCard, ScanLine } from "lucide-react";
import { CardTile } from "@/components/customer/CardTile";
import { TopBar } from "@/components/nav/TopBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { rpc } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";
import type { HomeCard } from "@/lib/types";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.customer.cards.title };
}

export default async function CardsPage() {
  const { t, count } = await getI18n();
  const { cards } = await rpc<{ cards: HomeCard[] }>("customer_home");
  return (
    <>
      <TopBar title={t.customer.cards.title} large back="/customer" subtitle={cards.length ? count(t.customer.cards.count, cards.length) : undefined} />
      {cards.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="size-8" />}
          title={t.customer.noCards}
          action={
            <LinkButton href="/customer/scan" block icon={<ScanLine className="size-5" />}>
              {t.customer.scanQr}
            </LinkButton>
          }
        >
          {t.customer.cards.emptyBody}
        </EmptyState>
      ) : (
        // the list is unbounded, so it scrolls inside the page and the title stays put
        <div className="-mx-1 max-h-[66dvh] space-y-2.5 overflow-y-auto px-1 pb-1">
          {cards.map((card) => (
            <CardTile key={card.customer_id} card={card} />
          ))}
        </div>
      )}
    </>
  );
}
