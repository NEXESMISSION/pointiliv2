import { Gift, QrCode, RefreshCw, UserPlus, Users } from "lucide-react";
import { Segmented, TopBar } from "@/components/nav/TopBar";
import { BarChart, Donut } from "@/components/merchant/Charts";
import { Card, SectionTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/Stat";
import { rpc } from "@/lib/session";
import { formatNumber, pctChange } from "@/lib/format";

export const metadata = { title: "Analytics" };

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
  { key: "7", label: "7 days" },
  { key: "30", label: "30 days" },
  { key: "90", label: "3 months" },
];

function shortDate(d: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
}

/** 90 days of daily bars is unreadable on a phone; group into weeks. */
function bucket(series: Analytics["series"], key: "stamps" | "redemptions", days: number) {
  if (days <= 30) return series.map((s) => ({ label: shortDate(s.date), value: s[key] }));
  const out: { label: string; value: number }[] = [];
  for (let i = 0; i < series.length; i += 7) {
    const chunk = series.slice(i, i + 7);
    out.push({ label: shortDate(chunk[0]!.date), value: chunk.reduce((a, s) => a + s[key], 0) });
  }
  return out;
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days = "30" } = await searchParams;
  const active = RANGES.some((r) => r.key === days) ? days : "30";
  const a = await rpc<Analytics>("merchant_analytics", { p_days: Number(active) });

  return (
    <div className="mx-auto max-w-4xl">
      <TopBar title="Analytics" large back="/dashboard" />
      <div className="mb-5">
        <Segmented active={active} items={RANGES.map((r) => ({ ...r, href: `/analytics?days=${r.key}` }))} />
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard tint="white" icon={<Users className="size-5" />} label="Total customers" value={formatNumber(a.customers_total)} sub={`${a.returning_rate}% came back`} />
        <StatCard tint="white" icon={<UserPlus className="size-5" />} label="New customers" value={formatNumber(a.new_customers)} change={pctChange(a.new_customers, a.new_customers_prev)} sub="vs previous" />
        <StatCard tint="white" icon={<RefreshCw className="size-5" />} label="Returning customers" value={formatNumber(a.returning_customers)} sub={`of ${formatNumber(a.active_customers)} active`} />
        <StatCard tint="white" icon={<QrCode className="size-5" />} label="Stamps issued" value={formatNumber(a.stamps)} change={pctChange(a.stamps, a.stamps_prev)} sub="vs previous" />
        <StatCard tint="white" icon={<Gift className="size-5" />} label="Rewards redeemed" value={formatNumber(a.redemptions)} change={pctChange(a.redemptions, a.redemptions_prev)} sub="vs previous" />
      </section>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle>Stamps {Number(active) > 30 ? "by week" : "by day"}</SectionTitle>
          <BarChart label="Stamps" data={bucket(a.series, "stamps", a.days)} />
        </Card>
        <Card className="p-5">
          <SectionTitle>New vs returning customers</SectionTitle>
          <Donut a={a.returning_customers} b={a.active_customers - a.returning_customers} aLabel="Returning" bLabel="New" />
        </Card>
        <Card className="p-5">
          <SectionTitle>Rewards redeemed</SectionTitle>
          <BarChart label="Rewards redeemed" color="#D97706" data={bucket(a.series, "redemptions", a.days)} />
        </Card>
      </div>
    </div>
  );
}
