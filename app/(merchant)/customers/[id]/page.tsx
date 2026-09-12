import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Gift } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { Card, SectionTitle } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Stat";
import { LoyaltyCardVisual } from "@/components/LoyaltyCardVisual";
import { resolveDesign } from "@/lib/card-design";
import { RedeemNowButton } from "@/components/merchant/RedeemNowButton";
import { rpc } from "@/lib/session";
import { cardColor } from "@/lib/constants";
import { getI18n } from "@/lib/i18n/server";
import { dayLabel, formatDate, formatTime, initials, timeAgo } from "@/lib/format";
import type { CardPayload, HistoryItem } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.ops.customer.title };
}

type Detail = CardPayload & { profile: { name: string | null; phone_masked: string | null }; rewards_earned: number; history: HistoryItem[] };

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { t, locale, count, fill } = await getI18n();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const d = await rpc<Detail | null>("merchant_customer", { p_customer_id: id });
  if (!d) notFound();

  const { customer, card, rewards, profile } = d;
  const required = card?.stamps_required ?? 10;
  const c = cardColor(card?.color);
  const unlocked = rewards.filter((r) => r.unlocked);
  const w = t.ops.customer;
  const title = profile.name || fill(t.ops.customers.anon, { code: customer.code });

  return (
    <div className="mx-auto max-w-3xl">
      <TopBar title={w.detailTitle} back="/customers" />

      <Card className="flex flex-col items-center p-6 text-center">
        <Avatar label={profile.name ? initials(profile.name) : "#"} size={72} />
        <p className="mt-3 text-xl font-bold text-ink">{title}</p>
        <p className="text-muted tabular">
          <span dir="ltr" className="inline-block">
            #{customer.code} · {profile.phone_masked}
          </span>
        </p>
        {card && (
          <div className="mt-5 w-full max-w-sm text-start">
            <LoyaltyCardVisual design={resolveDesign(card.design, { color: card.color, icon: card.icon })} business={d.business} subtitle={card.description} filled={customer.balance} total={required} rewardName={rewards.find((r) => r.is_primary)?.name} />
          </div>
        )}
      </Card>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <Tile value={`${customer.balance}/${required}`} label={w.currentStamps} />
        <Tile value={customer.total_stamps} label={w.totalVisits} />
        <Tile value={d.rewards_earned} label={w.rewardsEarned} />
        <Tile value={customer.rewards_redeemed} label={w.rewardsGiven} />
      </section>

      <Card className="mt-4 grid grid-cols-2 gap-4 p-4 text-sm">
        <div>
          <p className="text-muted">{w.firstActivity}</p>
          <p className="font-semibold text-ink">{formatDate(customer.first_stamp_at, locale)}</p>
        </div>
        <div>
          <p className="text-muted">{w.lastActivity}</p>
          <p className="font-semibold text-ink">{timeAgo(customer.last_stamp_at, locale)}</p>
        </div>
      </Card>

      {unlocked.length > 0 && (
        <section className="mt-6">
          <SectionTitle>{w.readyToGive}</SectionTitle>
          <div className="space-y-3">
            {unlocked.map((r) => (
              <Card key={r.id} className="flex items-center gap-3 p-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl" style={{ background: c.bg, color: c.accent }}>
                  <Gift className="size-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink">{r.name}</p>
                  <p className="text-sm text-muted">{count(t.common.stampsCount, r.stamps_required)}</p>
                </div>
                <RedeemNowButton customerId={customer.id} rewardId={r.id} rewardName={r.name} customerLabel={title} stamps={r.stamps_required} />
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6">
        <SectionTitle>{w.history}</SectionTitle>
        {d.history.length === 0 ? (
          <p className="rounded-2xl bg-white p-4 text-sm text-muted shadow-card">{w.noHistory}</p>
        ) : (
          <Card className="divide-y divide-line/80">
            {d.history.map((h, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <span className={`grid size-8 place-items-center rounded-full text-sm font-bold ${h.type === "stamp" ? "bg-success-50 text-success-600" : "bg-warning-50 text-warning-700"}`}>
                  {h.type === "stamp" ? "+1" : <Gift className="size-4" />}
                </span>
                <p className="flex-1 text-[15px] font-medium text-ink">{h.type === "stamp" ? w.stampLine : fill(w.rewardLine, { name: h.reward_name ?? "" })}</p>
                <p className="text-end text-xs text-muted">
                  {dayLabel(h.at, locale)} · {formatTime(h.at, locale)}
                </p>
              </div>
            ))}
          </Card>
        )}
        <LinkButton href="/activity" variant="outline" block className="mt-4">
          {w.viewAllActivity}
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
