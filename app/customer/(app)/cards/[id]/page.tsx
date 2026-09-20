import { notFound } from "next/navigation";
import { Gift, Sparkles } from "lucide-react";
import { LoyaltyCardVisual } from "@/components/LoyaltyCardVisual";
import { TopBar } from "@/components/nav/TopBar";
import { Alert } from "@/components/ui/Alert";
import { Card, SectionTitle } from "@/components/ui/Card";
import { UseRewardButton } from "@/components/customer/UseRewardButton";
import { rpc } from "@/lib/session";
import { resolveDesign } from "@/lib/card-design";
import { dayLabel, formatTime } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import type { CardPayload, HistoryItem } from "@/lib/types";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.customer.card.title };
}

const UUID = /^[0-9a-f-]{36}$/i;

export default async function CardDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ joined?: string }> }) {
  const { t, locale, count, fill } = await getI18n();
  const [{ id }, { joined }] = await Promise.all([params, searchParams]);
  if (!UUID.test(id)) notFound();
  const data = await rpc<(CardPayload & { history: HistoryItem[] }) | null>("customer_card", { p_customer_id: id });
  if (!data) notFound();

  const { business, card, customer, rewards, next_reward, history } = data;
  const total = card?.stamps_required ?? 10;
  const design = resolveDesign(card?.design, { color: card?.color, icon: card?.icon });
  const primary = rewards.find((r) => r.is_primary) ?? rewards[0];
  const unlocked = rewards.filter((r) => r.unlocked);
  const categories = t.data.categories as Record<string, string>;
  const category = categories[business.category ?? "other"] ?? categories.other!;

  return (
    <>
      <TopBar title={business.name} subtitle={[category, business.address].filter(Boolean).join(" · ")} back="/customer/cards" />

      <LoyaltyCardVisual design={design} business={business} subtitle={card?.description} filled={customer.balance} total={total} rewardName={primary?.name} />

      {/* the card stays put; the rest of the screen scrolls under it */}
      <div className="max-h-[38dvh] overflow-y-auto pb-1">
        {joined && customer.total_stamps === 0 && (
          <Alert tone="success" title={t.customer.card.addedTitle} className="mt-3 animate-rise">
            {t.customer.card.addedBody}
          </Alert>
        )}

        {unlocked.length > 0 ? (
          <section className="mt-3 space-y-2.5">
            {unlocked.map((r) => (
              <div key={r.id} className="animate-rise rounded-3xl bg-white p-4 text-center shadow-card">
                <p className="text-2xl" aria-hidden>
                  🎉
                </p>
                <p className="mt-0.5 text-xs font-semibold text-success-600">{t.customer.card.unlockedTitle}</p>
                <p className="mt-0.5 text-xl font-extrabold uppercase tracking-tight text-ink">{r.name}</p>
                {r.description && <p className="mx-auto mt-1 max-w-xs text-[13px] text-muted">{r.description}</p>}
                <p className="mx-auto mt-1.5 max-w-xs text-xs text-muted">{t.customer.card.showAtCounter}</p>
                <div className="mt-3">
                  <UseRewardButton rewardId={r.id} pendingId={r.pending?.id} />
                </div>
              </div>
            ))}
          </section>
        ) : (
          primary && (
            <Card className="mt-3 flex items-center gap-2.5 p-3.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                <Gift className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-ink">{primary.name}</p>
                <p className="text-sm text-muted">
                  {next_reward ? count(t.customer.card.toUnlock, next_reward.remaining) : primary.description || t.customer.card.keepCollecting}
                </p>
              </div>
            </Card>
          )
        )}

        {rewards.length > 1 && (
          <section className="mt-4">
            <SectionTitle>{t.customer.card.allRewards}</SectionTitle>
            <Card className="divide-y divide-line/80">
              {rewards.map((r) => (
                <div key={r.id} className="flex items-center gap-2.5 p-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-canvas text-body">{r.unlocked ? <Sparkles className="size-5 text-success-600" /> : <Gift className="size-5" />}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{r.name}</p>
                    <p className="text-sm text-muted tabular">{count(t.common.stampsCount, r.stamps_required)}</p>
                  </div>
                  <span className={`text-sm font-semibold tabular ${r.unlocked ? "text-success-600" : "text-muted"}`}>
                    {r.unlocked ? t.customer.card.ready : fill(t.customer.card.toGo, { n: r.stamps_required - customer.balance })}
                  </span>
                </div>
              ))}
            </Card>
          </section>
        )}

        <section className="mt-4">
          <SectionTitle>{t.customer.card.history}</SectionTitle>
          {history.length === 0 ? (
            <p className="rounded-2xl bg-white p-4 text-sm text-muted shadow-card">{t.customer.card.noHistory}</p>
          ) : (
            <Card className="divide-y divide-line/80">
              {history.map((h, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5">
                  <span className={`grid size-8 place-items-center rounded-full text-sm font-bold ${h.type === "stamp" ? "bg-success-50 text-success-600" : "bg-warning-50 text-warning-700"}`}>
                    {h.type === "stamp" ? "+1" : <Gift className="size-4" />}
                  </span>
                  <p className="flex-1 text-[15px] font-medium text-ink">
                    {h.type === "stamp" ? t.customer.card.stampCollected : fill(t.customer.card.rewardRedeemed, { name: h.reward_name ?? "" })}
                  </p>
                  <p className="text-end text-xs text-muted">
                    {dayLabel(h.at, locale)}
                    <br />
                    {formatTime(h.at, locale)}
                  </p>
                </div>
              ))}
            </Card>
          )}
          <p className="mt-2.5 text-center text-xs text-faint">
            {t.customer.card.customerLabel}{" "}
            <span dir="ltr" className="tabular">
              {customer.code}
            </span>{" "}
            · {count(t.common.visitsCount, customer.total_stamps)}
          </p>
        </section>
      </div>
    </>
  );
}
