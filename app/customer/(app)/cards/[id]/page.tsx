import { notFound } from "next/navigation";
import { Gift, Sparkles } from "lucide-react";
import { LoyaltyCardVisual } from "@/components/LoyaltyCardVisual";
import { TopBar } from "@/components/nav/TopBar";
import { Card, SectionTitle } from "@/components/ui/Card";
import { UseRewardButton } from "@/components/customer/UseRewardButton";
import { rpc } from "@/lib/session";
import { resolveDesign } from "@/lib/card-design";
import { categoryLabel } from "@/lib/constants";
import { dayLabel, formatTime } from "@/lib/format";
import type { CardPayload, HistoryItem } from "@/lib/types";

export const metadata = { title: "Loyalty card" };

const UUID = /^[0-9a-f-]{36}$/i;

export default async function CardDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const data = await rpc<(CardPayload & { history: HistoryItem[] }) | null>("customer_card", { p_customer_id: id });
  if (!data) notFound();

  const { business, card, customer, rewards, next_reward, history } = data;
  const total = card?.stamps_required ?? 10;
  const design = resolveDesign(card?.design, { color: card?.color, icon: card?.icon });
  const primary = rewards.find((r) => r.is_primary) ?? rewards[0];
  const unlocked = rewards.filter((r) => r.unlocked);

  return (
    <>
      <TopBar title={business.name} subtitle={[categoryLabel(business.category), business.address].filter(Boolean).join(" · ")} back="/customer/cards" />

      <LoyaltyCardVisual design={design} business={business} subtitle={card?.description} filled={customer.balance} total={total} rewardName={primary?.name} />

      {unlocked.length > 0 ? (
        <section className="mt-5 space-y-3">
          {unlocked.map((r) => (
            <div key={r.id} className="animate-rise rounded-3xl bg-white p-5 text-center shadow-card">
              <p className="text-4xl" aria-hidden>
                🎉
              </p>
              <p className="mt-1 text-sm font-semibold text-success-600">Reward unlocked!</p>
              <p className="mt-1 text-2xl font-extrabold uppercase tracking-tight text-ink">{r.name}</p>
              {r.description && <p className="mx-auto mt-1 max-w-xs text-sm text-muted">{r.description}</p>}
              <p className="mx-auto mt-2 max-w-xs text-xs text-muted">At the counter, tap below and show your reward QR to the staff.</p>
              <div className="mt-4">
                <UseRewardButton rewardId={r.id} pendingId={r.pending?.id} />
              </div>
            </div>
          ))}
        </section>
      ) : (
        primary && (
          <Card className="mt-4 flex items-center gap-3 p-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <Gift className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-ink">{primary.name}</p>
              <p className="text-sm text-muted">
                {next_reward ? `${next_reward.remaining} more stamp${next_reward.remaining > 1 ? "s" : ""} to unlock it` : primary.description || "Keep collecting"}
              </p>
            </div>
          </Card>
        )
      )}

      {rewards.length > 1 && (
        <section className="mt-6">
          <SectionTitle>All rewards</SectionTitle>
          <Card className="divide-y divide-line/80">
            {rewards.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-4">
                <span className="grid size-10 place-items-center rounded-xl bg-canvas text-body">{r.unlocked ? <Sparkles className="size-5 text-success-600" /> : <Gift className="size-5" />}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{r.name}</p>
                  <p className="text-sm text-muted tabular">{r.stamps_required} stamps</p>
                </div>
                <span className={`text-sm font-semibold tabular ${r.unlocked ? "text-success-600" : "text-muted"}`}>{r.unlocked ? "Ready" : `${r.stamps_required - customer.balance} to go`}</span>
              </div>
            ))}
          </Card>
        </section>
      )}

      <section className="mt-6">
        <SectionTitle>History</SectionTitle>
        {history.length === 0 ? (
          <p className="rounded-2xl bg-white p-4 text-sm text-muted shadow-card">No activity yet.</p>
        ) : (
          <Card className="divide-y divide-line/80">
            {history.map((h, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <span className={`grid size-8 place-items-center rounded-full text-sm font-bold ${h.type === "stamp" ? "bg-success-50 text-success-600" : "bg-warning-50 text-warning-700"}`}>
                  {h.type === "stamp" ? "+1" : <Gift className="size-4" />}
                </span>
                <p className="flex-1 text-[15px] font-medium text-ink">{h.type === "stamp" ? "Stamp collected" : `${h.reward_name} redeemed`}</p>
                <p className="text-right text-xs text-muted">
                  {dayLabel(h.at)}
                  <br />
                  {formatTime(h.at)}
                </p>
              </div>
            ))}
          </Card>
        )}
        <p className="mt-3 text-center text-xs text-faint">
          Customer #{customer.code} · {customer.total_stamps} visit{customer.total_stamps === 1 ? "" : "s"}
        </p>
      </section>
    </>
  );
}
