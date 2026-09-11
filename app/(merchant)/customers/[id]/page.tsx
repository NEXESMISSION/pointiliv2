import { notFound } from "next/navigation";
import { Gift } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { Card, SectionTitle } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Stat";
import { StampGrid } from "@/components/LoyaltyCard";
import { RedeemNowButton } from "@/components/merchant/RedeemNowButton";
import { rpc } from "@/lib/session";
import { cardColor } from "@/lib/constants";
import { dayLabel, formatDate, formatTime, initials, timeAgo } from "@/lib/format";
import type { CardPayload, HistoryItem } from "@/lib/types";

export const metadata = { title: "Customer" };

type Detail = CardPayload & { profile: { name: string | null; phone_masked: string | null }; rewards_earned: number; history: HistoryItem[] };

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const d = await rpc<Detail | null>("merchant_customer", { p_customer_id: id });
  if (!d) notFound();

  const { customer, card, rewards, profile } = d;
  const required = card?.stamps_required ?? 10;
  const c = cardColor(card?.color);
  const unlocked = rewards.filter((r) => r.unlocked);
  const title = profile.name || `Customer #${customer.code}`;

  return (
    <div className="mx-auto max-w-3xl">
      <TopBar title="Customer details" back="/customers" />

      <Card className="flex flex-col items-center p-6 text-center">
        <Avatar label={profile.name ? initials(profile.name) : "#"} size={72} />
        <p className="mt-3 text-xl font-bold text-ink">{title}</p>
        <p className="text-muted tabular">
          #{customer.code} · {profile.phone_masked}
        </p>
        {card && (
          <div className="mt-5 w-full max-w-sm rounded-3xl p-4" style={{ background: c.bg }}>
            <StampGrid filled={customer.balance} total={required} color={card.color} icon={card.icon} />
          </div>
        )}
      </Card>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <Tile value={`${customer.balance}/${required}`} label="Current stamps" />
        <Tile value={customer.total_stamps} label="Total visits" />
        <Tile value={d.rewards_earned} label="Rewards earned" />
        <Tile value={customer.rewards_redeemed} label="Rewards redeemed" />
      </section>

      <Card className="mt-4 grid grid-cols-2 gap-4 p-4 text-sm">
        <div>
          <p className="text-muted">First activity</p>
          <p className="font-semibold text-ink">{formatDate(customer.first_stamp_at)}</p>
        </div>
        <div>
          <p className="text-muted">Last activity</p>
          <p className="font-semibold text-ink">{timeAgo(customer.last_stamp_at)}</p>
        </div>
      </Card>

      {unlocked.length > 0 && (
        <section className="mt-6">
          <SectionTitle>Ready to redeem</SectionTitle>
          <div className="space-y-3">
            {unlocked.map((r) => (
              <Card key={r.id} className="flex items-center gap-3 p-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl" style={{ background: c.bg, color: c.accent }}>
                  <Gift className="size-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink">{r.name}</p>
                  <p className="text-sm text-muted">{r.stamps_required} stamps</p>
                </div>
                <RedeemNowButton customerId={customer.id} rewardId={r.id} rewardName={r.name} customerLabel={title} stamps={r.stamps_required} />
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6">
        <SectionTitle>History</SectionTitle>
        {d.history.length === 0 ? (
          <p className="rounded-2xl bg-white p-4 text-sm text-muted shadow-card">No activity yet.</p>
        ) : (
          <Card className="divide-y divide-line/80">
            {d.history.map((h, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <span className={`grid size-8 place-items-center rounded-full text-sm font-bold ${h.type === "stamp" ? "bg-success-50 text-success-600" : "bg-warning-50 text-warning-700"}`}>
                  {h.type === "stamp" ? "+1" : <Gift className="size-4" />}
                </span>
                <p className="flex-1 text-[15px] font-medium text-ink">{h.type === "stamp" ? "+1 stamp" : `${h.reward_name} redeemed`}</p>
                <p className="text-right text-xs text-muted">
                  {dayLabel(h.at)} · {formatTime(h.at)}
                </p>
              </div>
            ))}
          </Card>
        )}
        <LinkButton href="/activity" variant="outline" block className="mt-4">
          View all activity
        </LinkButton>
      </section>
    </div>
  );
}

function Tile({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <Card className="p-4 text-center">
      <p className="text-2xl font-bold text-ink tabular">{value}</p>
      <p className="text-xs font-medium text-muted">{label}</p>
    </Card>
  );
}
