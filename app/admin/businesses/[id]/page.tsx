import { notFound } from "next/navigation";
import { Gift, Phone, Store, Users } from "lucide-react";
import { BusinessStatusButton, CancelSubscriptionButton, ExtendSubscriptionButton, ManageSubscription, PaymentActions, ResetPasswordButton } from "@/components/admin/AdminActions";
import { actAsBusiness } from "@/app/actions/admin";
import { PaymentBadge, isPast, type AdminBusinessDetail } from "@/components/admin/shared";
import { BackButton } from "@/components/nav/BackButton";
import { Icon3D, category3D } from "@/components/ui/Icon3D";
import { Badge, SubscriptionBadge } from "@/components/ui/Badge";
import { Card, SectionTitle } from "@/components/ui/Card";
import { formatDate, formatDateTime, formatNumber, formatTND } from "@/lib/format";
import { rateRule } from "@/lib/points";
import { getI18n } from "@/lib/i18n/server";
import { formatPhone } from "@/lib/phone";
import { rpc } from "@/lib/session";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.admin.business.title };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** "5 minutes", "Une fois par jour"… from the number of minutes between two stamps. */
function cooldownLabel(min: number, c: Record<string, string>, fill: (s: string, v: Record<string, string | number>) => string): string {
  switch (min) {
    case 0:
      return c.none!;
    case 5:
      return c.m5!;
    case 60:
      return c.h1!;
    case 240:
      return c.h4!;
    case 720:
      return c.h12!;
    case 1440:
      return c.daily!;
    default:
      return fill(c.custom!, { n: min });
  }
}

export default async function BusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const b = await rpc<AdminBusinessDetail | null>("admin_business", { p_id: id });
  if (!b) notFound();

  const { t, locale, dir, count, fill } = await getI18n();
  const w = t.admin.business;
  const categories = t.data.categories as Record<string, string>;
  const plans = t.data.plans as Record<string, string>;
  const methods = t.data.payments as Record<string, string>;
  const category = categories[b.category] ?? categories.other;
  const planName = (plan: string | null | undefined, fallback: string) => (plan && plans[plan]) || fallback;

  const sub = b.subscription;
  const suspended = b.status === "suspended";

  const days = sub.open ? sub.days_left : 0;
  const unit = locale === "fr" ? (days === 1 ? "jour" : "jours") : days >= 3 && days <= 10 ? "أيام" : "يوم";
  const color = b.card ? "var(--color-brand-600)" : "var(--color-muted)";

  return (
    <div className="animate-fade space-y-4 pb-4">
      {/* the cover: the shop's own colour, its category in 3D */}
      <div className="relative -mx-4 -mt-[calc(0.75rem+env(safe-area-inset-top))] h-44 overflow-hidden rounded-b-[32px] bg-[linear-gradient(145deg,var(--color-brand-400)_0%,var(--color-brand-600)_50%,var(--color-brand-800)_100%)] lg:mx-0 lg:mt-0 lg:rounded-[32px]">
        <span className="absolute -bottom-40 -end-20 size-72 rounded-full border-[34px] border-white/10" aria-hidden />
        <div className="absolute start-4 top-[calc(0.75rem+env(safe-area-inset-top))] lg:top-4">
          <BackButton fallback="/admin/businesses" tone="dark" />
        </div>
        <span className="absolute -bottom-4 end-6" aria-hidden>
          <Icon3D name={category3D(b.category)} size={124} className="-rotate-6" />
        </span>
      </div>

      <div className="flex items-start gap-3 px-1">
        <span className="relative z-10 -mt-12 shrink-0 rounded-[24px] border-4 border-canvas bg-surface p-3.5 shadow-card">
          {b.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.logo_url} alt="" className="size-11 rounded-xl object-cover" />
          ) : (
            <Icon3D name={category3D(b.category)} size={44} />
          )}
        </span>
        <div className="min-w-0 flex-1 pt-1">
          <h1 className="truncate text-[22px] font-bold leading-tight text-ink">{b.name}</h1>
          <p className="truncate text-[13px] text-muted">{[category, b.address].filter(Boolean).join(" · ")}</p>
        </div>
        <span className="pt-1.5">{suspended ? <Badge tone="danger">{w.suspended}</Badge> : <Badge tone="success">{w.active}</Badge>}</span>
      </div>

      {/* «ادخل كمحل»: everything the owner can do, with the founder's hands */}
      <form action={actAsBusiness.bind(null, b.id)}>
        <button type="submit" className="pass-shine press flex w-full items-center gap-4 rounded-[26px] bg-[linear-gradient(145deg,var(--color-brand-400)_0%,var(--color-brand-600)_48%,var(--color-brand-800)_100%)] p-[18px] text-start text-white shadow-pass">
          <span className="grid size-[60px] shrink-0 place-items-center rounded-[20px] bg-white/20">
            <Store className="size-7" />
          </span>
          <span className="min-w-0">
            <span className="block text-xl font-bold">{w.actAs}</span>
            <span className="block truncate text-[13.5px] text-white/85">{w.actAsHint}</span>
          </span>
        </button>
      </form>

      {/* the subscription, by hand */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-bold text-ink">{w.subscription}</p>
          <SubscriptionBadge status={sub.status} plan={sub.plan} />
        </div>
        <div className="mt-1.5 flex items-baseline gap-2">
          {sub.open ? (
            <>
              <span className="text-[13.5px] text-muted">{w.left}</span>
              <span className="num text-[34px] font-bold leading-none text-ink">{days}</span>
              <span className="text-[13.5px] text-muted">
                {unit} · {fill(w.until, { date: formatDate(sub.expires_at, locale) })}
              </span>
            </>
          ) : (
            <span className="text-[13.5px] font-medium text-danger-600">{w.qrPaused}</span>
          )}
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
          <div className={`h-full rounded-full ${days <= 10 ? "bg-coral-500" : "bg-success-500"}`} style={{ width: `${Math.max(2, Math.min(100, (days / 365) * 100))}%` }} />
        </div>
        {sub.price ? <p className="mt-2 text-[13px] text-muted">{w.price} · {formatTND(sub.price, locale)}</p> : null}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <ManageSubscription businessId={b.id} businessName={b.name} />
          <ExtendSubscriptionButton businessId={b.id} />
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2.5">
        {[
          { v: formatNumber(b.stats.customers, locale), l: w.customers },
          { v: formatNumber(b.stats.stamps_today, locale), l: w.scansToday },
          { v: formatNumber(b.stats.redemptions, locale), l: w.redemptions },
        ].map((k) => (
          <div key={k.l} className="rounded-[22px] bg-surface px-2 py-3.5 text-center shadow-card">
            <span className="num block text-[21px] font-bold text-ink">{k.v}</span>
            <span className="block truncate text-[12px] text-muted">{k.l}</span>
          </div>
        ))}
      </div>

      <section>
        <SectionTitle>{w.card}</SectionTitle>
        <Card className="p-4">
          {b.card ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 flex-1 truncate font-semibold text-ink">{b.card.name}</p>
                {b.card.active ? <Badge tone="success">{w.cardLive}</Badge> : <Badge tone="neutral">{w.cardPaused}</Badge>}
              </div>
              {b.card.system === "points" ? (
                <>
                  <p className="text-sm text-muted">
                    {t.points.system} · {rateRule(Number(b.card.dinars_per_point ?? 1), t.points)}
                  </p>
                  {(b.catalog ?? []).length > 0 && (
                    <ul className="space-y-1.5">
                      {(b.catalog ?? []).map((g, i) => (
                        <li key={i} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">
                          <Gift className="size-4 shrink-0 text-sea-600" />
                          <span className="min-w-0 flex-1 truncate text-ink">{g.name}</span>
                          <span className="shrink-0 text-xs text-muted">{count(t.points.count, g.points)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
              <p className="text-sm text-muted">{fill(w.cardRule, { stamps: b.card.stamps_required, cooldown: cooldownLabel(b.card.cooldown_minutes, t.data.cooldown, fill).toLowerCase() })}</p>
              )}
              {b.card.system !== "points" && b.rewards.length > 0 && (
                <ul className="space-y-1.5">
                  {b.rewards.map((r, i) => (
                    <li key={i} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-sm">
                      <Gift className="size-4 shrink-0" style={{ color }} />
                      <span className="min-w-0 flex-1 truncate text-ink">{r.name}</span>
                      <span className="shrink-0 text-xs text-muted">{fill(w.rewardStamps, { n: r.stamps_required })}</span>
                      {!r.active && <Badge tone="neutral">{w.rewardOff}</Badge>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-ink">{w.noCard}</p>
              <p className="mt-0.5 text-[13px] text-muted">{w.noCardHint}</p>
            </div>
          )}
        </Card>
      </section>

      <section>
        <SectionTitle>{w.ownerAccess}</SectionTitle>
        <Card className="divide-y divide-line overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-surface-2 text-body">
              <Users className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-medium text-ink">{b.owner.name ?? "—"}</p>
              {b.owner.phone && <p className="num text-[12.5px] text-muted">{formatPhone(b.owner.phone)}</p>}
            </div>
            {b.owner.phone && (
              <a href={`tel:${b.owner.phone}`} className="press grid size-9 place-items-center rounded-full bg-success-50 text-success-600" aria-label={w.ownerPhone}>
                <Phone className="size-4" />
              </a>
            )}
          </div>
          <div className="px-4 py-3">
            <ResetPasswordButton userId={b.owner.id} label={b.owner.name ?? b.name} />
          </div>
        </Card>
      </section>

      <BusinessStatusButton id={b.id} name={b.name} status={b.status} />

      <section>
        <SectionTitle>{w.history}</SectionTitle>
        <Card className="divide-y divide-line overflow-hidden">
          {b.subscriptions.length === 0 ? (
            <p className="p-4 text-sm text-muted">{w.noSubscriptions}</p>
          ) : (
            b.subscriptions.map((s) => {
              const running = s.status === "active" && !isPast(s.expires_at);
              return (
                <div key={s.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">
                      {planName(s.plan, s.plan)}
                      {s.price ? <span className="font-normal text-muted"> · {formatTND(s.price, locale)}</span> : null}
                    </p>
                    <p className="text-sm text-muted">
                      {formatDate(s.starts_at, locale)} {dir === "rtl" ? "←" : "→"} {formatDate(s.expires_at, locale)}
                    </p>
                  </div>
                  {s.status === "cancelled" ? (
                    <Badge tone="neutral">{w.subCancelled}</Badge>
                  ) : running ? (
                    isPast(s.starts_at) ? <Badge tone="success">{w.subActive}</Badge> : <Badge tone="brand">{w.subUpcoming}</Badge>
                  ) : (
                    <Badge tone="danger">{w.subEnded}</Badge>
                  )}
                  {running && <CancelSubscriptionButton id={s.id} businessName={b.name} planLabel={planName(s.plan, s.plan)} />}
                </div>
              );
            })
          )}
          {b.payments.map((p) => (
            <div key={p.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="num font-mono text-sm font-semibold text-ink">{p.payment_reference}</span>
                  <PaymentBadge status={p.status} />
                </div>
                <p className="mt-0.5 text-sm text-muted">
                  <span className="font-semibold text-ink">{formatTND(p.amount, locale)}</span> · {planName(p.plan, p.plan)} · {methods[p.method] ?? p.method} · {formatDateTime(p.created_at, locale)}
                </p>
              </div>
              {p.status === "pending" && <PaymentActions id={p.id} businessName={b.name} planLabel={planName(p.plan, p.plan)} amount={p.amount} />}
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}

