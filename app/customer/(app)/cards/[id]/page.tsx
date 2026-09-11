import { notFound } from "next/navigation";
import { Gift, MapPin, Sparkles } from "lucide-react";
import { BusinessAvatar, CardIcon } from "@/components/CardIcon";
import { StampGrid } from "@/components/LoyaltyCard";
import { TopBar } from "@/components/nav/TopBar";
import { Card, SectionTitle } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/Stat";
import { UseRewardButton } from "@/components/customer/UseRewardButton";
import { rpc } from "@/lib/session";
import { cardColor, categoryLabel } from "@/lib/constants";
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
  const style = card ?? { stamps_required: 10, color: "indigo", icon: "coffee", name: business.name, description: null };
  const c = cardColor(style.color);
  const required = style.stamps_required;
  const primary = rewards.find((r) => r.is_primary) ?? rewards[0];
  const unlocked = rewards.filter((r) => r.unlocked);

  return (
    <>
      <TopBar title="Loyalty card" back="/customer" />

      <Card className="overflow-hidden">
        <div className="relative h-24" style={{ background: `linear-gradient(135deg, ${c.accent}, ${c.accent}CC)` }}>
          <CardIcon name={style.icon} className="absolute -right-3 -top-4 size-32 text-white/15" />
        </div>
        <div className="px-5 pb-5">
          <div className="relative -mt-9 mb-3 inline-block rounded-2xl bg-white p-1 shadow-card">
            <BusinessAvatar logo={business.logo_url} icon={style.icon} color={style.color} size={60} />
          </div>
          <h2 className="text-xl font-bold text-ink">{business.name}</h2>
          <p className="flex items-center gap-1 text-sm text-muted">
            {categoryLabel(business.category)}
            {business.address && (
              <>
                {" · "}
                <MapPin className="size-3.5" />
                <span className="truncate">{business.address}</span>
              </>
            )}
          </p>

          <div className="mt-5 rounded-3xl p-4" style={{ background: c.bg }}>
            <StampGrid filled={customer.balance} total={required} color={style.color} icon={style.icon} />
            <p className="mt-4 text-center text-lg font-bold text-ink tabular">
              <span style={{ color: c.accent }}>{customer.balance}</span> / {required} stamps
            </p>
          </div>

          {primary && (
            <div className="mt-4 flex gap-3 rounded-2xl border border-line p-3.5">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl" style={{ background: c.soft, color: c.accent }}>
                <Gift className="size-6" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Reward</p>
                <p className="font-bold text-ink">{primary.name}</p>
                <p className="text-sm text-muted">{primary.description || `Collect ${primary.stamps_required} stamps to unlock it.`}</p>
              </div>
            </div>
          )}

          {unlocked.length === 0 && next_reward && (
            <div className="mt-4">
              <ProgressBar value={customer.balance} max={next_reward.stamps_required} color={c.accent} />
              <p className="mt-2 text-sm font-medium text-body">
                {next_reward.remaining} more stamp{next_reward.remaining > 1 ? "s" : ""} to unlock {next_reward.name}
              </p>
            </div>
          )}
        </div>
      </Card>

      {unlocked.length > 0 && (
        <section className="mt-5 space-y-3">
          {unlocked.map((r) => (
            <div key={r.id} className="animate-rise rounded-3xl bg-white p-5 text-center shadow-card">
              <p className="text-4xl" aria-hidden>
                🎉
              </p>
              <p className="mt-1 text-sm font-semibold text-success-600">Reward unlocked!</p>
              <p className="mt-1 text-2xl font-extrabold uppercase tracking-tight text-ink">{r.name}</p>
              <p className="text-sm text-muted">{business.name}</p>
              <div className="mt-4">
                <UseRewardButton rewardId={r.id} pendingId={r.pending?.id} />
              </div>
            </div>
          ))}
        </section>
      )}

      {rewards.length > 1 && (
        <section className="mt-6">
          <SectionTitle>All rewards</SectionTitle>
          <Card className="divide-y divide-line/80">
            {rewards.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-4">
                <span className="grid size-10 place-items-center rounded-xl" style={{ background: c.bg, color: c.accent }}>
                  {r.unlocked ? <Sparkles className="size-5" /> : <Gift className="size-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{r.name}</p>
                  <p className="text-sm text-muted tabular">{r.stamps_required} stamps</p>
                </div>
                <span className={`text-sm font-semibold tabular ${r.unlocked ? "text-success-600" : "text-muted"}`}>
                  {r.unlocked ? "Ready" : `${r.stamps_required - customer.balance} to go`}
                </span>
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
          Customer #{customer.code} · {customer.total_stamps} visits
        </p>
      </section>
    </>
  );
}
