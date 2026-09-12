import { notFound } from "next/navigation";
import { CalendarDays, Clock, Gift, Mail, MapPin, Phone, Stamp, Tag, Users } from "lucide-react";
import { BusinessStatusButton, CancelSubscriptionButton, GrantPlanButton, PaymentActions } from "@/components/admin/AdminActions";
import { PaymentBadge, categoryIcon, isPast, type AdminBusinessDetail } from "@/components/admin/shared";
import { BusinessAvatar } from "@/components/CardIcon";
import { TopBar } from "@/components/nav/TopBar";
import { Badge, SubscriptionBadge } from "@/components/ui/Badge";
import { Card, SectionTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/Stat";
import { formatDate, formatDateTime, formatNumber, formatTND, timeAgo } from "@/lib/format";
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

  return (
    <div className="animate-fade">
      <TopBar title={b.name} subtitle={category} back="/admin/businesses" />

      <div className="grid gap-5 lg:grid-cols-3 lg:items-start">
        <div className="space-y-5 lg:col-span-2">
          {/* Info */}
          <Card className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <BusinessAvatar logo={b.logo_url} icon={categoryIcon(b.category)} size={56} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold text-ink">{b.name}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {suspended ? <Badge tone="danger">{w.suspended}</Badge> : <Badge tone="success">{w.active}</Badge>}
                  <SubscriptionBadge status={sub.status} plan={sub.plan} />
                </div>
              </div>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <Info icon={<Tag className="size-4" />} label={w.category} value={category} />
              <Info icon={<Users className="size-4" />} label={w.owner} value={b.owner.name ?? "—"} />
              <Info icon={<Phone className="size-4" />} label={w.ownerPhone} value={b.owner.phone ? formatPhone(b.owner.phone) : "—"} ltr={!!b.owner.phone} />
              <Info icon={<Mail className="size-4" />} label={w.ownerEmail} value={b.owner.email ?? "—"} ltr={!!b.owner.email} />
              {b.phone && <Info icon={<Phone className="size-4" />} label={w.businessPhone} value={formatPhone(b.phone)} ltr />}
              <Info icon={<MapPin className="size-4" />} label={w.address} value={b.address ?? "—"} />
              <Info icon={<CalendarDays className="size-4" />} label={w.created} value={formatDate(b.created_at, locale)} />
            </dl>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label={w.customers} value={formatNumber(b.stats.customers, locale)} icon={<Users className="size-5" />} tint="brand" />
            <StatCard
              label={w.stamps}
              value={formatNumber(b.stats.stamps, locale)}
              icon={<Stamp className="size-5" />}
              tint="amber"
              sub={fill(w.stampsTodaySub, { n: formatNumber(b.stats.stamps_today, locale) })}
            />
            <StatCard label={w.redemptions} value={formatNumber(b.stats.redemptions, locale)} icon={<Gift className="size-5" />} tint="rose" />
            <StatCard label={w.lastStamp} value={<span className="text-lg">{timeAgo(b.stats.last_stamp_at, locale)}</span>} icon={<Clock className="size-5" />} tint="green" />
          </div>

          {/* Loyalty card */}
          <section>
            <SectionTitle>{w.card}</SectionTitle>
            <Card className="p-4 sm:p-5">
              {b.card ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 flex-1 truncate font-semibold text-ink">{b.card.name}</p>
                    {b.card.active ? <Badge tone="success">{w.cardLive}</Badge> : <Badge tone="neutral">{w.cardPaused}</Badge>}
                  </div>
                  <p className="text-sm text-muted">
                    {fill(w.cardRule, { stamps: b.card.stamps_required, cooldown: cooldownLabel(b.card.cooldown_minutes, t.data.cooldown, fill).toLowerCase() })}
                  </p>
                  {b.rewards.length > 0 && (
                    <ul className="space-y-1.5">
                      {b.rewards.map((r, i) => (
                        <li key={i} className="flex items-center gap-2 rounded-xl bg-canvas px-3 py-2 text-sm">
                          <Gift className="size-4 shrink-0 text-brand-600" />
                          <span className="min-w-0 flex-1 truncate text-ink">{r.name}</span>
                          <span className="shrink-0 text-xs text-muted tabular">{fill(w.rewardStamps, { n: r.stamps_required })}</span>
                          {!r.active && <Badge tone="neutral">{w.rewardOff}</Badge>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted">{w.noCard}</p>
              )}
            </Card>
          </section>

          {/* Subscriptions history */}
          <section>
            <SectionTitle>{w.subscriptions}</SectionTitle>
            <Card className="divide-y divide-line/80 overflow-hidden">
              {b.subscriptions.length === 0 ? (
                <p className="p-4 text-sm text-muted">{w.noSubscriptions}</p>
              ) : (
                b.subscriptions.map((s) => {
                  const running = s.status === "active" && !isPast(s.expires_at);
                  return (
                    <div key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
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
            </Card>
          </section>

          {/* Payments history */}
          <section>
            <SectionTitle>{w.payments}</SectionTitle>
            <Card className="divide-y divide-line/80 overflow-hidden">
              {b.payments.length === 0 ? (
                <p className="p-4 text-sm text-muted">{w.noPayments}</p>
              ) : (
                b.payments.map((p) => (
                  <div key={p.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span dir="ltr" className="font-mono text-sm font-semibold text-ink">
                          {p.payment_reference}
                        </span>
                        <PaymentBadge status={p.status} />
                      </div>
                      <p className="mt-0.5 text-sm text-muted">
                        <span className="font-semibold text-ink">{formatTND(p.amount, locale)}</span> · {planName(p.plan, p.plan)} · {methods[p.method] ?? p.method} ·{" "}
                        {formatDateTime(p.created_at, locale)}
                      </p>
                    </div>
                    {p.status === "pending" && <PaymentActions id={p.id} businessName={b.name} planLabel={planName(p.plan, p.plan)} amount={p.amount} />}
                  </div>
                ))
              )}
            </Card>
          </section>
        </div>

        {/* Side column */}
        <div className="space-y-5 lg:sticky lg:top-6">
          <section>
            <SectionTitle>{w.subscription}</SectionTitle>
            <Card className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-lg font-bold text-ink">{planName(sub.plan, t.data.plans.none)}</p>
                <SubscriptionBadge status={sub.status} plan={sub.plan} />
              </div>
              <dl className="mt-3 space-y-2 text-sm">
                <Row label={sub.open ? w.expiresLabel : w.expiredLabel} value={formatDate(sub.expires_at, locale)} />
                <Row label={w.daysLeftLabel} value={sub.open ? count(w.daysLeftValue, sub.days_left) : "—"} />
                {sub.price ? <Row label={w.price} value={formatTND(sub.price, locale)} /> : null}
              </dl>
              {sub.status === "expiring_soon" && <p className="mt-3 rounded-xl bg-warning-50 px-3 py-2 text-sm font-medium text-warning-700">{w.renewalSoon}</p>}
              {!sub.open && <p className="mt-3 rounded-xl bg-danger-50 px-3 py-2 text-sm font-medium text-danger-600">{w.qrPaused}</p>}
            </Card>
          </section>

          <section>
            <SectionTitle>{w.actions}</SectionTitle>
            <Card className="space-y-2.5 p-4">
              <GrantPlanButton businessId={b.id} businessName={b.name} />
              <BusinessStatusButton id={b.id} name={b.name} status={b.status} />
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}

function Info({ icon, label, value, ltr = false }: { icon: React.ReactNode; label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-canvas text-muted">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs text-muted">{label}</dt>
        <dd className="break-words font-medium text-ink">{ltr ? <span dir="ltr">{value}</span> : value}</dd>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-ink tabular">{value}</dd>
    </div>
  );
}
