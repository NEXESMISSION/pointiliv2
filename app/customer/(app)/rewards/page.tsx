import Link from "next/link";
import { Gift } from "lucide-react";
import { BusinessAvatar } from "@/components/CardIcon";
import { TopBar } from "@/components/nav/TopBar";
import { Card, SectionTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/Stat";
import { LinkButton } from "@/components/ui/Button";
import { UseRewardButton } from "@/components/customer/UseRewardButton";
import { rpc } from "@/lib/session";
import { cardColor } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.common.rewards };
}

type Biz = { name: string; logo_url: string | null; category: string };
type Style = { color: string; icon: string };
type Rewards = {
  unlocked: { reward_id: string; name: string; description: string | null; stamps_required: number; customer_id: string; balance: number; business: Biz; card: Style }[];
  upcoming: { reward_id: string; name: string; stamps_required: number; customer_id: string; balance: number; remaining: number; business: Biz; card: Style }[];
  history: { id: string; reward_name: string; business_name: string; redeemed_at: string }[];
};
type Pending = { id: string; reward_id?: string };

export default async function RewardsPage() {
  const { t, locale, count } = await getI18n();
  const data = await rpc<Rewards>("customer_rewards");
  // pending codes live on the card payload; fetch only for cards with unlocked rewards
  const pendingByReward = new Map<string, string>();
  await Promise.all(
    [...new Set(data.unlocked.map((u) => u.customer_id))].map(async (cid) => {
      const card = await rpc<{ rewards: { id: string; pending: Pending | null }[] } | null>("customer_card", { p_customer_id: cid });
      card?.rewards.forEach((r) => r.pending && pendingByReward.set(r.id, r.pending.id));
    }),
  );

  const nothing = !data.unlocked.length && !data.upcoming.length && !data.history.length;

  return (
    <>
      <TopBar title={t.common.rewards} large back="/customer" />
      {nothing ? (
        <EmptyState icon={<Gift className="size-8" />} title={t.customer.rewards.emptyTitle} action={<LinkButton href="/customer/scan" block>{t.customer.scanQr}</LinkButton>}>
          {t.customer.rewards.emptyBody}
        </EmptyState>
      ) : (
        <div className="space-y-7">
          {data.unlocked.length > 0 && (
            <section>
              <SectionTitle>{t.customer.rewards.readyToUse}</SectionTitle>
              <div className="space-y-3">
                {data.unlocked.map((r) => {
                  const c = cardColor(r.card.color);
                  return (
                    <Card key={r.reward_id} className="p-4">
                      <div className="flex items-center gap-3">
                        <BusinessAvatar logo={r.business.logo_url} icon={r.card.icon} color={r.card.color} size={52} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[17px] font-bold text-ink">{r.name}</p>
                          <p className="truncate text-sm text-muted">{r.business.name}</p>
                        </div>
                        <Badge tone="success">{t.customer.rewards.unlockedBadge}</Badge>
                      </div>
                      {r.description && <p className="mt-3 rounded-2xl p-3 text-sm text-body" style={{ background: c.bg }}>{r.description}</p>}
                      <div className="mt-3">
                        <UseRewardButton rewardId={r.reward_id} pendingId={pendingByReward.get(r.reward_id)} size="md" />
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {data.upcoming.length > 0 && (
            <section>
              <SectionTitle>{t.customer.rewards.inProgress}</SectionTitle>
              <Card className="divide-y divide-line/80">
                {data.upcoming.map((r) => {
                  const c = cardColor(r.card.color);
                  return (
                    <Link key={r.reward_id} href={`/customer/cards/${r.customer_id}`} className="flex items-center gap-3 p-4">
                      <BusinessAvatar logo={r.business.logo_url} icon={r.card.icon} color={r.card.color} size={44} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate font-semibold text-ink">{r.name}</p>
                          <p className="shrink-0 text-xs font-semibold text-muted tabular" dir="ltr">
                            {r.balance}/{r.stamps_required}
                          </p>
                        </div>
                        <p className="mb-2 truncate text-sm text-muted">
                          {r.business.name} · {count(t.common.stampsToGo, r.remaining)}
                        </p>
                        <ProgressBar value={r.balance} max={r.stamps_required} color={c.accent} />
                      </div>
                    </Link>
                  );
                })}
              </Card>
            </section>
          )}

          {data.history.length > 0 && (
            <section>
              <SectionTitle>{t.customer.rewards.redeemed}</SectionTitle>
              <Card className="divide-y divide-line/80">
                {data.history.map((h) => (
                  <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="grid size-9 place-items-center rounded-full bg-warning-50 text-warning-700">
                      <Gift className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{h.reward_name}</p>
                      <p className="truncate text-sm text-muted">{h.business_name}</p>
                    </div>
                    <p className="text-xs text-muted">{formatDate(h.redeemed_at, locale)}</p>
                  </div>
                ))}
              </Card>
            </section>
          )}
        </div>
      )}
    </>
  );
}
