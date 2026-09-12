import type { Metadata } from "next";
import { Gift, QrCode, RefreshCw, UserPlus, Users } from "lucide-react";
import { Segmented, TopBar } from "@/components/nav/TopBar";
import { BarChart, Donut } from "@/components/merchant/Charts";
import { Card, SectionTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/Stat";
import { rpc } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/config";
import { formatDate, formatNumber, pctChange } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.ops.analytics.title };
}

type Analytics = {
  days: number;
  customers_total: number;
  new_customers: number;
  new_customers_prev: number;
  active_customers: number;
  returning_customers: number;
  stamps: number;
  stamps_prev: number;
  redemptions: number;
  redemptions_prev: number;
  returning_rate: number;
  series: { date: string; stamps: number; redemptions: number; new_customers: number }[];
};

const RANGES = [
  { key: "7", label: "d7" },
  { key: "30", label: "d30" },
  { key: "90", label: "m3" },
] as const;

/** Day + month only, in the reader's language — the axis stays compact. */
function shortDate(d: string, locale: Locale) {
  return formatDate(`${d}T00:00:00Z`, locale, { year: undefined, timeZone: "UTC" });
}

/** 90 days of daily bars is unreadable on a phone; group into weeks. */
function bucket(series: Analytics["series"], key: "stamps" | "redemptions", days: number, locale: Locale) {
  if (days <= 30) return series.map((s) => ({ label: shortDate(s.date, locale), value: s[key] }));
  const out: { label: string; value: number }[] = [];
  for (let i = 0; i < series.length; i += 7) {
    const chunk = series.slice(i, i + 7);
    out.push({ label: shortDate(chunk[0]!.date, locale), value: chunk.reduce((acc, s) => acc + s[key], 0) });
  }
  return out;
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { t, locale, fill } = await getI18n();
  const { days = "30" } = await searchParams;
  const active = RANGES.some((r) => r.key === days) ? days : "30";
  const a = await rpc<Analytics>("merchant_analytics", { p_days: Number(active) });
  const w = t.ops.analytics;

  return (
    <div className="mx-auto max-w-4xl">
      <TopBar title={w.title} large back="/dashboard" />
      <div className="mb-5">
        <Segmented active={active} items={RANGES.map((r) => ({ key: r.key, label: w.range[r.label], href: `/analytics?days=${r.key}` }))} />
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard tint="white" icon={<Users className="size-5" />} label={w.totalCustomers} value={formatNumber(a.customers_total, locale)} sub={fill(w.cameBack, { n: formatNumber(a.returning_rate, locale) })} />
        <StatCard tint="white" icon={<UserPlus className="size-5" />} label={w.newCustomers} value={formatNumber(a.new_customers, locale)} change={pctChange(a.new_customers, a.new_customers_prev)} sub={w.vsPrevious} />
        <StatCard tint="white" icon={<RefreshCw className="size-5" />} label={w.returningCustomers} value={formatNumber(a.returning_customers, locale)} sub={fill(w.ofActive, { n: formatNumber(a.active_customers, locale) })} />
        <StatCard tint="white" icon={<QrCode className="size-5" />} label={w.stampsIssued} value={formatNumber(a.stamps, locale)} change={pctChange(a.stamps, a.stamps_prev)} sub={w.vsPrevious} />
        <StatCard tint="white" icon={<Gift className="size-5" />} label={w.rewardsGiven} value={formatNumber(a.redemptions, locale)} change={pctChange(a.redemptions, a.redemptions_prev)} sub={w.vsPrevious} />
      </section>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle>{Number(active) > 30 ? w.stampsByWeek : w.stampsByDay}</SectionTitle>
          <BarChart label={w.stampsIssued} data={bucket(a.series, "stamps", a.days, locale)} />
        </Card>
        <Card className="p-5">
          <SectionTitle>{w.newVsReturning}</SectionTitle>
          <Donut a={a.returning_customers} b={a.active_customers - a.returning_customers} aLabel={w.returning} bLabel={w.newOnes} />
        </Card>
        <Card className="p-5">
          <SectionTitle>{w.rewardsGiven}</SectionTitle>
          <BarChart label={w.rewardsGiven} color="#D97706" data={bucket(a.series, "redemptions", a.days, locale)} />
        </Card>
      </div>
    </div>
  );
}
