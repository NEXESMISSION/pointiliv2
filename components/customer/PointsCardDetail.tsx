import { Hourglass } from "lucide-react";
import { PointsPass } from "@/components/PointsPass";
import { UseRewardButton } from "@/components/customer/UseRewardButton";
import { Alert } from "@/components/ui/Alert";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Icon3D } from "@/components/ui/Icon3D";
import { resolveDesign } from "@/lib/card-design";
import { dayLabel, formatDate, formatTime } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { formatAmount, rateRule } from "@/lib/points";
import type { CardPayload, HistoryItem } from "@/lib/types";

/**
 * A points card (board 2, P1): the big number, the gifts — the ones within
 * reach lit, each with its button — and every move written down: what was
 * paid, what was taken.
 */
export async function PointsCardDetail({ data, joined }: { data: CardPayload & { history: HistoryItem[] }; joined: boolean }) {
  const { t, locale, count, fill } = await getI18n();
  const w = t.points;
  const { business, card, customer, rewards, next_reward, history } = data;
  const design = resolveDesign(card?.design, { color: card?.color, icon: card?.icon });
  const ready = rewards.find((r) => r.unlocked);
  const day = (iso: string) => formatDate(iso, locale, { year: undefined });

  return (
    <>
      <PointsPass
        design={design}
        business={business}
        subtitle={rateRule(card?.dinars_per_point ?? 1, w)}
        balance={customer.balance}
        goal={card?.stamps_required ?? 100}
        ready={ready?.name ?? null}
        next={next_reward ? { name: next_reward.name, remaining: next_reward.remaining } : null}
      />
      {card?.points_expire && customer.balance > 0 && <p className="mx-auto mt-2 w-fit text-center text-xs text-muted">{w.keepsYear}</p>}

      <div className="max-h-[40dvh] overflow-y-auto pb-1">
        {joined && customer.total_points === 0 && (
          <Alert tone="success" title={t.customer.card.addedTitle} className="mt-3 animate-rise">
            {t.customer.card.addedBody}
          </Alert>
        )}

        <section className="mt-4">
          <SectionTitle>{w.gifts}</SectionTitle>
          <Card className="divide-y divide-line/80">
            {rewards.map((r) => {
              const price = r.points ?? r.stamps_required;
              const pct = Math.min(100, Math.round((customer.balance / price) * 100));
              return (
                <div key={r.id} className="p-3">
                  <div className="flex items-center gap-3">
                    <span className={`grid size-11 shrink-0 place-items-center rounded-[14px] ${r.unlocked ? "bg-coral-50" : "bg-sea-50"}`}>
                      <Icon3D name={r.unlocked ? "gift" : "ticket"} size={28} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-ink">{r.name}</p>
                      <p className="truncate text-[12.5px] text-muted">
                        {count(w.count, price)}
                        {r.next_points && r.next_at ? ` · ${fill(w.risesOn, { n: r.next_points, date: day(r.next_at) })}` : ""}
                        {r.ends_at ? ` · ${fill(w.leavesOn, { date: day(r.ends_at) })}` : ""}
                      </p>
                    </div>
                    {!r.unlocked && (
                      <span className="num shrink-0 text-[13px] font-semibold text-muted">{fill(w.ofPoints, { have: customer.balance, need: price })}</span>
                    )}
                  </div>
                  {r.unlocked ? (
                    <div className="mt-2.5">
                      <UseRewardButton rewardId={r.id} pendingId={r.pending?.id} size="md" />
                    </div>
                  ) : (
                    <div className="ms-14 mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-sea-500" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        </section>

        <section className="mt-4">
          <SectionTitle>{w.history}</SectionTitle>
          {history.length === 0 ? (
            <p className="rounded-2xl bg-surface p-4 text-sm text-muted shadow-card">{t.customer.card.noHistory}</p>
          ) : (
            <Card className="divide-y divide-line/80">
              {history.map((h, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5">
                  <span
                    className={`num grid size-10 shrink-0 place-items-center rounded-[12px] text-[13px] font-bold ${
                      h.type === "points" ? "bg-sea-50 text-sea-700" : h.type === "reward_redeemed" ? "bg-coral-50" : "bg-surface-2 text-muted"
                    }`}
                  >
                    {h.type === "points" ? `+${h.points}` : h.type === "reward_redeemed" ? <Icon3D name="gift" size={24} /> : <Hourglass className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium text-ink">
                      {h.type === "points"
                        ? fill(w.paid, { amount: formatAmount(h.amount, locale) })
                        : h.type === "reward_redeemed"
                          ? fill(w.tookGift, { reward: h.reward_name ?? "" })
                          : h.type === "expire"
                            ? w.expiredLine
                            : h.type === "convert"
                              ? w.convertLine
                              : w.adjustLine}
                    </p>
                    <p className="truncate text-[12.5px] text-muted">
                      {dayLabel(h.at, locale)} · {formatTime(h.at, locale)}
                      {h.type !== "points" && h.points ? ` · ${count(w.count, Math.abs(h.points))}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </Card>
          )}
          <p className="mt-2.5 text-center text-xs text-faint">
            {t.customer.card.customerLabel}{" "}
            <span dir="ltr" className="tabular">
              {customer.code}
            </span>
          </p>
        </section>
      </div>
    </>
  );
}
