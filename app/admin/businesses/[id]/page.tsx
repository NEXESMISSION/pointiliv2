import { notFound } from "next/navigation";
import { CalendarDays, Clock, Gift, Mail, MapPin, Phone, Stamp, Tag, Users } from "lucide-react";
import { BusinessStatusButton, CancelSubscriptionButton, GrantPlanButton, PaymentActions } from "@/components/admin/AdminActions";
import { PaymentBadge, categoryIcon, isPast, type AdminBusinessDetail } from "@/components/admin/shared";
import { BusinessAvatar } from "@/components/CardIcon";
import { TopBar } from "@/components/nav/TopBar";
import { Badge, SubscriptionBadge } from "@/components/ui/Badge";
import { Card, SectionTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/Stat";
import { COOLDOWN_OPTIONS, PAYMENT_METHODS, PLAN_LABEL, categoryLabel } from "@/lib/constants";
import { formatDate, formatDateTime, formatNumber, formatTND, timeAgo } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { rpc } from "@/lib/session";

export const metadata = { title: "Business" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cooldownLabel(min: number) {
  return COOLDOWN_OPTIONS.find((o) => o.value === min)?.label ?? (min === 0 ? "No limit" : `${min} minutes`);
}

export default async function BusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const b = await rpc<AdminBusinessDetail | null>("admin_business", { p_id: id });
  if (!b) notFound();

  const sub = b.subscription;
  const suspended = b.status === "suspended";

  return (
    <div className="animate-fade">
      <TopBar title={b.name} subtitle={categoryLabel(b.category)} back="/admin/businesses" />

      <div className="grid gap-5 lg:grid-cols-3 lg:items-start">
        <div className="space-y-5 lg:col-span-2">
          {/* Info */}
          <Card className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <BusinessAvatar logo={b.logo_url} icon={categoryIcon(b.category)} size={56} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold text-ink">{b.name}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {suspended ? <Badge tone="danger">Suspended</Badge> : <Badge tone="success">Active</Badge>}
                  <SubscriptionBadge status={sub.status} plan={sub.plan} />
                </div>
              </div>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <Info icon={<Tag className="size-4" />} label="Category" value={categoryLabel(b.category)} />
              <Info icon={<Users className="size-4" />} label="Owner" value={b.owner.name ?? "—"} />
              <Info icon={<Phone className="size-4" />} label="Owner phone" value={b.owner.phone ? formatPhone(b.owner.phone) : "—"} />
              <Info icon={<Mail className="size-4" />} label="Owner email" value={b.owner.email ?? "—"} />
              {b.phone && <Info icon={<Phone className="size-4" />} label="Business phone" value={formatPhone(b.phone)} />}
              <Info icon={<MapPin className="size-4" />} label="Address" value={b.address ?? "—"} />
              <Info icon={<CalendarDays className="size-4" />} label="Created" value={formatDate(b.created_at)} />
            </dl>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Customers" value={formatNumber(b.stats.customers)} icon={<Users className="size-5" />} tint="brand" />
            <StatCard label="Stamps" value={formatNumber(b.stats.stamps)} icon={<Stamp className="size-5" />} tint="amber" sub={`${formatNumber(b.stats.stamps_today)} today`} />
            <StatCard label="Redemptions" value={formatNumber(b.stats.redemptions)} icon={<Gift className="size-5" />} tint="rose" />
            <StatCard label="Last stamp" value={<span className="text-lg">{timeAgo(b.stats.last_stamp_at)}</span>} icon={<Clock className="size-5" />} tint="green" />
          </div>

          {/* Loyalty card */}
          <section>
            <SectionTitle>Loyalty card</SectionTitle>
            <Card className="p-4 sm:p-5">
              {b.card ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 flex-1 truncate font-semibold text-ink">{b.card.name}</p>
                    {b.card.active ? <Badge tone="success">Live</Badge> : <Badge tone="neutral">Paused</Badge>}
                  </div>
                  <p className="text-sm text-muted">
                    {b.card.stamps_required} stamps · limit: {cooldownLabel(b.card.cooldown_minutes).toLowerCase()} per customer
                  </p>
                  {b.rewards.length > 0 && (
                    <ul className="space-y-1.5">
                      {b.rewards.map((r, i) => (
                        <li key={i} className="flex items-center gap-2 rounded-xl bg-canvas px-3 py-2 text-sm">
                          <Gift className="size-4 shrink-0 text-brand-600" />
                          <span className="min-w-0 flex-1 truncate text-ink">{r.name}</span>
                          <span className="shrink-0 text-xs text-muted tabular">{r.stamps_required} stamps</span>
                          {!r.active && <Badge tone="neutral">Off</Badge>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted">This business has not set up its loyalty card yet.</p>
              )}
            </Card>
          </section>

          {/* Subscriptions history */}
          <section>
            <SectionTitle>Subscriptions</SectionTitle>
            <Card className="divide-y divide-line/80 overflow-hidden">
              {b.subscriptions.length === 0 ? (
                <p className="p-4 text-sm text-muted">No subscriptions yet.</p>
              ) : (
                b.subscriptions.map((s) => {
                  const running = s.status === "active" && !isPast(s.expires_at);
                  return (
                    <div key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-ink">
                          {PLAN_LABEL[s.plan] ?? s.plan}
                          {s.price ? <span className="font-normal text-muted"> · {formatTND(s.price)}</span> : null}
                        </p>
                        <p className="text-sm text-muted">
                          {formatDate(s.starts_at)} → {formatDate(s.expires_at)}
                        </p>
                      </div>
                      {s.status === "cancelled" ? (
                        <Badge tone="neutral">Cancelled</Badge>
                      ) : running ? (
                        isPast(s.starts_at) ? <Badge tone="success">Active</Badge> : <Badge tone="brand">Upcoming</Badge>
                      ) : (
                        <Badge tone="danger">Ended</Badge>
                      )}
                      {running && <CancelSubscriptionButton id={s.id} businessName={b.name} plan={s.plan} />}
                    </div>
                  );
                })
              )}
            </Card>
          </section>

          {/* Payments history */}
          <section>
            <SectionTitle>Payments</SectionTitle>
            <Card className="divide-y divide-line/80 overflow-hidden">
              {b.payments.length === 0 ? (
                <p className="p-4 text-sm text-muted">No payments yet.</p>
              ) : (
                b.payments.map((p) => (
                  <div key={p.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-ink">{p.payment_reference}</span>
                        <PaymentBadge status={p.status} />
                      </div>
                      <p className="mt-0.5 text-sm text-muted">
                        <span className="font-semibold text-ink">{formatTND(p.amount)}</span> · {PLAN_LABEL[p.plan] ?? p.plan} ·{" "}
                        {PAYMENT_METHODS[p.method as keyof typeof PAYMENT_METHODS] ?? p.method} · {formatDateTime(p.created_at)}
                      </p>
                    </div>
                    {p.status === "pending" && <PaymentActions id={p.id} businessName={b.name} plan={p.plan} amount={p.amount} />}
                  </div>
                ))
              )}
            </Card>
          </section>
        </div>

        {/* Side column */}
        <div className="space-y-5 lg:sticky lg:top-6">
          <section>
            <SectionTitle>Subscription</SectionTitle>
            <Card className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-lg font-bold text-ink">{PLAN_LABEL[sub.plan ?? ""] ?? "No plan"}</p>
                <SubscriptionBadge status={sub.status} plan={sub.plan} />
              </div>
              <dl className="mt-3 space-y-2 text-sm">
                <Row label={sub.open ? "Expires" : "Expired"} value={formatDate(sub.expires_at)} />
                <Row label="Days left" value={sub.open ? `${sub.days_left} day${sub.days_left === 1 ? "" : "s"}` : "—"} />
                {sub.price ? <Row label="Price" value={formatTND(sub.price)} /> : null}
              </dl>
              {sub.status === "expiring_soon" && <p className="mt-3 rounded-xl bg-warning-50 px-3 py-2 text-sm font-medium text-warning-700">Renewal due soon.</p>}
              {!sub.open && <p className="mt-3 rounded-xl bg-danger-50 px-3 py-2 text-sm font-medium text-danger-600">The QR code is paused until a plan is activated.</p>}
            </Card>
          </section>

          <section>
            <SectionTitle>Actions</SectionTitle>
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

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-canvas text-muted">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs text-muted">{label}</dt>
        <dd className="break-words font-medium text-ink">{value}</dd>
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
