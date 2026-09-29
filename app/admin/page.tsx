import Link from "next/link";
import { ChevronRight, Plus, Settings, Ticket } from "lucide-react";
import type { AdminOverview } from "@/components/admin/shared";
import { Card } from "@/components/ui/Card";
import { Icon3D, type Icon3DName } from "@/components/ui/Icon3D";
import { formatNumber, formatTND, greeting } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { rpc } from "@/lib/session";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.admin.dashboard.home };
}

const TODO_ICON: Record<AdminOverview["todo"][number]["kind"], Icon3DName> = { renew: "hourglass", no_card: "gift", quiet: "phone" };

/** The founder's home (board 9): open a shop, three numbers, the money, what not to forget. */
export default async function AdminDashboard() {
  const o = await rpc<AdminOverview>("admin_overview");
  const { t, locale, count, fill } = await getI18n();
  const d = t.admin.dashboard;
  const months = o.revenue_months ?? [];
  const top = Math.max(1, ...months.map((m) => m.amount));
  const monthName = (m: string) => new Intl.DateTimeFormat(locale === "fr" ? "fr-TN" : "ar-TN", { month: "short", timeZone: "Africa/Tunis" }).format(new Date(`${m}-15T12:00:00Z`));
  const inDays = (n: number) => (locale === "fr" ? `dans ${n} jour${n === 1 ? "" : "s"}` : `بعد ${n} ${n >= 3 && n <= 10 ? "أيام" : "يوم"}`);
  const todoLine = (x: AdminOverview["todo"][number]) => (x.kind === "renew" ? fill(d.todoRenew, { when: inDays(x.days ?? 0) }) : x.kind === "no_card" ? d.todoNoCard : d.todoQuiet);
  const todoCta = (x: AdminOverview["todo"][number]) => (x.kind === "renew" ? d.renew : x.kind === "no_card" ? d.finish : d.call);

  return (
    <div className="animate-fade space-y-4">
      <header className="flex items-center justify-between">
        <span className="grid size-[42px] place-items-center rounded-full bg-[linear-gradient(145deg,var(--color-brand-400),var(--color-brand-600))] text-[15px] font-bold text-white shadow-[0_0_0_3px_var(--color-surface),var(--shadow-card)]">P</span>
        <Link href="/admin/more" className="press grid size-[42px] place-items-center rounded-full bg-surface text-ink shadow-card" aria-label={t.nav.admin.more}>
          <Settings className="size-5" />
        </Link>
      </header>

      <div>
        <p className="flex items-center gap-1.5 text-sm text-muted">
          {greeting(locale)} <Icon3D name="wave" size={20} />
        </p>
        <h1 className="mt-0.5 text-[30px] font-bold leading-tight text-ink">{d.home}</h1>
      </div>

      <Link href="/admin/businesses/new" className="pass-shine press flex items-center gap-4 rounded-[26px] bg-[linear-gradient(145deg,var(--color-brand-400)_0%,var(--color-brand-600)_48%,var(--color-brand-800)_100%)] p-[18px] text-white shadow-pass">
        <span className="grid size-[60px] shrink-0 place-items-center rounded-[20px] bg-white/20">
          <Plus className="size-8" />
        </span>
        <span className="min-w-0">
          <span className="block text-xl font-bold">{d.newShop}</span>
          <span className="block truncate text-[13.5px] text-white/85">{d.newShopHint}</span>
        </span>
      </Link>

      <div className="grid grid-cols-3 gap-2.5">
        {(
          [
            { icon: "shop", v: formatNumber(o.active_businesses, locale), l: d.shopsOpen, href: "/admin/businesses" },
            { icon: "people", v: formatNumber(o.customers, locale), l: d.customersShort, href: "/admin/customers" },
            { icon: "fire", v: formatNumber(o.stamps_today, locale), l: d.scansToday, href: "/admin/traffic" },
          ] as { icon: Icon3DName; v: string; l: string; href: string }[]
        ).map((k) => (
          <Link key={k.l} href={k.href} className="press rounded-[22px] bg-surface px-2 py-3.5 text-center shadow-card">
            <Icon3D name={k.icon} size={30} className="mx-auto" />
            <span className="num mt-1 block text-[21px] font-bold leading-tight text-ink">{k.v}</span>
            <span className="block truncate text-[12px] text-muted">{k.l}</span>
          </Link>
        ))}
      </div>

      <section>
        <div className="mb-2.5 flex items-baseline justify-between px-0.5">
          <h2 className="text-lg font-bold text-ink">{d.money}</h2>
          <Link href="/admin/subscriptions" className="text-sm font-medium text-brand-600">
            {t.common.seeAll}
          </Link>
        </div>
        <Link href="/admin/subscriptions" className="press flex items-end gap-4 rounded-[24px] bg-surface p-4 shadow-card">
          <span className="min-w-0">
            <span className="block text-[13px] text-muted">{d.thisMonth}</span>
            <span className="num mt-0.5 block text-[28px] font-bold leading-tight text-ink">{formatTND(o.revenue_month, locale)}</span>
            <span className="mt-2 inline-block rounded-full bg-success-50 px-2.5 py-1 text-xs font-semibold text-success-600">{fill(d.subsChip, { n: o.active_subscriptions })}</span>
          </span>
          <span className="flex h-[76px] flex-1 items-end gap-1.5" dir="ltr" aria-label={d.money}>
            {months.map((m, i) => (
              <span
                key={m.m}
                title={`${monthName(m.m)} · ${formatTND(m.amount, locale)}`}
                className={`flex-1 rounded-t-[4px] rounded-b-[2px] ${i === months.length - 1 ? "bg-brand-600" : "bg-brand-100"}`}
                style={{ height: `${Math.max(6, (m.amount / top) * 100)}%` }}
              />
            ))}
          </span>
        </Link>
      </section>

      {o.pending_payments > 0 && (
        <Link href="/admin/payments?status=pending" className="press flex items-center gap-3 rounded-[20px] bg-coral-50 px-4 py-3.5 text-coral-700">
          <Ticket className="size-5 shrink-0" />
          <span className="flex-1 text-sm font-semibold">{count(d.paymentsWaiting, o.pending_payments)}</span>
          <ChevronRight className="rtl:-scale-x-100 size-4" />
        </Link>
      )}

      <section>
        <h2 className="mb-2.5 px-0.5 text-lg font-bold text-ink">{d.todo}</h2>
        {o.todo?.length ? (
          <Card className="divide-y divide-line overflow-hidden">
            {o.todo.slice(0, 2).map((x) => (
              <Link key={`${x.kind}-${x.id}`} href={`/admin/businesses/${x.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2/70">
                <span className={`grid size-9 shrink-0 place-items-center rounded-[11px] ${x.kind === "renew" ? "bg-coral-50" : x.kind === "no_card" ? "bg-brand-100" : "bg-surface-2"}`}>
                  <Icon3D name={TODO_ICON[x.kind]} size={26} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-ink">{x.name}</span>
                  <span className="block truncate text-[12.5px] text-muted">{todoLine(x)}</span>
                </span>
                <span className="shrink-0 rounded-xl bg-brand-100 px-3 py-1.5 text-[13px] font-semibold text-brand-700">{todoCta(x)}</span>
              </Link>
            ))}
          </Card>
        ) : (
          <p className="rounded-[20px] bg-surface p-4 text-sm text-muted shadow-card">{d.allClear}</p>
        )}
      </section>
    </div>
  );
}
