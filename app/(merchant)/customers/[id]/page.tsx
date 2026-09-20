import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Gift } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { Card, SectionTitle } from "@/components/ui/Card";
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

      <Card className="flex flex-col items-center p-2.5 text-center">
        <div className="flex items-center gap-2.5">
          <Avatar label={profile.name ? initials(profile.name) : "#"} size={40} />
          <div className="min-w-0 text-start">
            <p className="truncate text-base font-bold text-ink">{title}</p>
            <p className="text-[13px] text-muted tabular">
              <span dir="ltr" className="inline-block">
                #{customer.code} · {profile.phone_masked}
              </span>
            </p>
          </div>
        </div>
        {card && (
          // the short "tile" card: one row of stamps instead of two, so the screen holds
          <div className="mt-2 w-full max-w-sm text-start">
            <LoyaltyCardVisual size="tile" design={resolveDesign(card.design, { color: card.color, icon: card.icon })} business={d.business} subtitle={card.description} filled={customer.balance} total={required} rewardName={rewards.find((r) => r.is_primary)?.name} />
          </div>
        )}
      </Card>

      <Card className="mt-2 grid grid-cols-3 items-center gap-2 p-2 text-center">
        <Cell value={`${customer.balance}/${required}`} label={w.currentStamps} />
        <Cell value={customer.total_stamps} label={w.totalVisits} />
        <Cell value={d.rewards_earned} label={w.rewardsEarned} />
        <Cell value={customer.rewards_redeemed} label={w.rewardsGiven} />
        <Cell value={formatDate(customer.first_stamp_at, locale)} label={w.firstActivity} small />
        <Cell value={timeAgo(customer.last_stamp_at, locale)} label={w.lastActivity} small />
      </Card>

      {unlocked.length > 0 && (
        <section className="mt-2">
          <SectionTitle>{w.readyToGive}</SectionTitle>
          <div className="space-y-2">
            {unlocked.map((r) => (
              <Card key={r.id} className="flex items-center gap-2.5 p-2">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl" style={{ background: c.bg, color: c.accent }}>
                  <Gift className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold text-ink">{r.name}</p>
                  <p className="text-[13px] text-muted">{count(t.common.stampsCount, r.stamps_required)}</p>
                </div>
                <RedeemNowButton customerId={customer.id} rewardId={r.id} rewardName={r.name} customerLabel={title} stamps={r.stamps_required} />
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="mt-2">
        <SectionTitle action={<Link href="/activity" className="whitespace-nowrap text-[13px] font-semibold text-brand-600">{w.viewAllActivity}</Link>}>{w.history}</SectionTitle>
        {d.history.length === 0 ? (
          <p className="rounded-2xl bg-white p-3 text-center text-sm text-muted shadow-card">{w.noHistory}</p>
        ) : (
          // a regular's history runs long: it scrolls in here, the screen itself does not
          <Card className="max-h-32 divide-y divide-line/80 overflow-y-auto">
            {d.history.map((h, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3 py-2">
                <span className={`grid size-7 shrink-0 place-items-center rounded-full text-[13px] font-bold ${h.type === "stamp" ? "bg-success-50 text-success-600" : "bg-warning-50 text-warning-700"}`}>
                  {h.type === "stamp" ? "+1" : <Gift className="size-4" />}
                </span>
                <p className="flex-1 text-sm font-medium text-ink">{h.type === "stamp" ? w.stampLine : fill(w.rewardLine, { name: h.reward_name ?? "" })}</p>
                <p className="text-end text-xs text-muted">
                  {dayLabel(h.at, locale)} · {formatTime(h.at, locale)}
                </p>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}

/** One figure in the six-cell summary; `small` is for a date, which needs the room. */
function Cell({ value, label, small }: { value: React.ReactNode; label: string; small?: boolean }) {
  return (
    <div>
      <p className={`font-bold text-ink tabular ${small ? "text-[13px]" : "text-lg"}`}>{value}</p>
      <p className="text-xs font-medium text-muted">{label}</p>
    </div>
  );
}
