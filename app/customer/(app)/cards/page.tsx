import { CreditCard, ScanLine } from "lucide-react";
import { CardTile } from "@/components/customer/CardTile";
import { TopBar } from "@/components/nav/TopBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { rpc } from "@/lib/session";
import type { HomeCard } from "@/lib/types";

export const metadata = { title: "My cards" };

export default async function CardsPage() {
  const { cards } = await rpc<{ cards: HomeCard[] }>("customer_home");
  return (
    <>
      <TopBar title="My cards" large subtitle={cards.length ? `${cards.length} loyalty card${cards.length > 1 ? "s" : ""}` : undefined} />
      {cards.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="size-8" />}
          title="No loyalty cards yet"
          action={
            <LinkButton href="/customer/scan" block icon={<ScanLine className="size-5" />}>
              Scan a QR code
            </LinkButton>
          }
        >
          Your card appears here after your first stamp at a Pointidi business.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => (
            <CardTile key={card.customer_id} card={card} />
          ))}
        </div>
      )}
    </>
  );
}
