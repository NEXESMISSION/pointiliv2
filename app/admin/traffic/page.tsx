import Link from "next/link";
import { Activity, Clock, Eye, LogIn, Monitor, Smartphone, Tablet, UserPlus, Users } from "lucide-react";
import { VisitorBars } from "@/components/admin/traffic/Bars";
import { AutoRefresh, Pills, TogglePill } from "@/components/admin/traffic/Controls";
import { RankList } from "@/components/admin/traffic/RankList";
import { WeekHeat } from "@/components/admin/traffic/WeekHeat";
import {
  RANGES,
  appName,
  countryName,
  deviceName,
  duration,
  isRange,
  pageName,
  personLabel,
  TABS,
  rangeWindow,
  roleName,
  sourceName,
  trafficHref,
  clicksPageHref,
  type Range,
  type Tab,
  type Traffic,
  type TrafficVisit,
} from "@/components/admin/traffic/model";
import { Segmented, TopBar } from "@/components/nav/TopBar";
import { Badge } from "@/components/ui/Badge";
import { Card, SectionTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/Stat";
import { formatNumber, initials, pctChange, timeAgo } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { rpc } from "@/lib/session";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.admin.traffic.title };
}

export default async function TrafficPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(sp.tab ?? "") ? (sp.tab as Tab) : "overview";
  const range: Range = isRange(sp.range) ? sp.range : "d7";
  const all = sp.all === "1";
  const { from, to } = rangeWindow(range);
  const d = await rpc<Traffic>("admin_traffic", { p_from: from.toISOString(), p_to: to.toISOString(), p_all: all });
  const { t, locale, count, fill } = await getI18n();
  const w = t.admin.traffic;
  const n = (v: number) => formatNumber(v, locale);
  const k = d.kpis;
  const clicksHref = (path: string) => clicksPageHref(path, "mobile", range, all);

  return (
    <div className="animate-fade space-y-2.5">
      <TopBar
        back="/admin"
        title={w.title}
        large
        action={
          <Link
            href={trafficHref("people", range, all)}
            aria-label={count(w.live, d.live.count)}
            className="flex h-8 items-center gap-1.5 rounded-full bg-surface px-2.5 text-[13px] font-semibold text-ink ring-1 ring-inset ring-line"
          >
            <span className={`size-2 rounded-full ${d.live.count ? "animate-pulse bg-success-500" : "bg-faint"}`} />
            <span className="tabular">{n(d.live.count)}</span>
          </Link>
        }
      />
      <Segmented active={tab} items={TABS.map((key) => ({ key, label: w.tabs[key], href: trafficHref(key, range, all) }))} />
      <div className="flex items-center justify-between gap-2">
        <Pills active={range} items={RANGES.map((r) => ({ key: r, label: w.ranges[r], href: trafficHref(tab, r, all) }))} />
        <TogglePill on={all} href={trafficHref(tab, range, !all)} label={w.withMine} hint={w.withMineHint} />
      </div>

      {tab === "overview" && (
        <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            <StatCard label={w.visitors} value={n(k.visitors)} icon={<Users />} tint="brand" change={delta(k.visitors, d.prev.visitors)} sub={fill(w.newVisitors, { n: n(k.new_visitors) })} />
            <StatCard
              label={w.visits}
              value={n(k.sessions)}
              icon={<Activity />}
              change={delta(k.sessions, d.prev.sessions)}
              sub={k.sessions ? fill(w.perVisit, { n: formatNumber(Math.round((k.views / k.sessions) * 10) / 10, locale) }) : undefined}
            />
            <StatCard label={w.avgTime} value={duration(w, k.avg_seconds)} icon={<Clock />} sub={k.bounce != null ? fill(w.bounce, { n: k.bounce }) : undefined} />
            <StatCard label={w.views} value={n(k.views)} icon={<Eye />} change={delta(k.views, d.prev.views)} sub={count(w.clicks, k.clicks)} />
            <StatCard label={w.accounts} value={n(k.signed_in)} icon={<LogIn />} sub={count(w.logins, k.logins)} />
            <StatCard label={w.signups} value={n(k.signups)} icon={<UserPlus />} />
          </div>
          <Card className="p-3 lg:p-4">
            <SectionTitle className="mb-0">{d.unit === "hour" ? w.chartHour : w.chartDay}</SectionTitle>
            <VisitorBars series={d.series} unit={d.unit} />
          </Card>
        </>
      )}

      {tab === "people" && (
        <>
          <AutoRefresh />
          <Card className="p-3">
            <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
              <span className={`size-2.5 rounded-full ${d.live.count ? "animate-pulse bg-success-500" : "bg-faint"}`} />
              {count(w.live, d.live.count)}
            </p>
            {d.live.people.length > 0 && (
              <div className="no-scrollbar -mx-3 mt-2 flex gap-1.5 overflow-x-auto px-3">
                {d.live.people.map((p) => {
                  const chip = (
                    <>
                      <b className="font-semibold text-ink">{p.name || `${w.visitor} ${p.visitor.slice(0, 4)}`}</b>
                      <span className="text-muted">{pageName(w, p.path)}</span>
                    </>
                  );
                  const cls = "flex shrink-0 items-center gap-1.5 rounded-full bg-canvas px-3 py-1.5 text-xs";
                  return p.session ? (
                    <Link key={p.visitor} href={`/admin/traffic/visit/${p.session}`} className={`${cls} hover:bg-line/60`}>
                      {chip}
                    </Link>
                  ) : (
                    <span key={p.visitor} className={cls}>
                      {chip}
                    </span>
                  );
                })}
              </div>
            )}
          </Card>
          <section>
            <SectionTitle>{w.recent}</SectionTitle>
            {d.recent.length === 0 ? (
              <EmptyState icon={<Users />} title={w.emptyTitle}>
                {w.emptyBody}
              </EmptyState>
            ) : (
              <Card className="max-h-[calc(100dvh-25.5rem)] divide-y divide-line/80 overflow-y-auto overscroll-contain lg:max-h-[calc(100dvh-20rem)]">
                {d.recent.map((v) => (
                  <VisitRow key={v.session} v={v} />
                ))}
              </Card>
            )}
          </section>
        </>
      )}

      {tab === "times" && (
        <Card className="p-3 lg:p-4">
          <SectionTitle>{w.heatTitle}</SectionTitle>
          <WeekHeat visits={d.heat_visits} stamps={d.heat_stamps} />
        </Card>
      )}

      {tab === "sources" && (
        <div className="grid max-h-[calc(100dvh-19rem)] grid-cols-2 gap-2 overflow-y-auto overscroll-contain lg:max-h-none lg:grid-cols-3">
          <RankList title={w.sources} empty={w.heatNone} rows={d.sources.map((s) => ({ key: s.k, label: sourceName(w, s.k), n: s.n }))} />
          <RankList title={w.apps} empty={w.heatNone} rows={d.browsers.map((s) => ({ key: s.k, label: appName(w, s.k), n: s.n }))} />
          <RankList title={w.devices} empty={w.heatNone} rows={d.devices.map((s) => ({ key: s.k, label: deviceName(w, s.k), n: s.n }))} />
          <RankList title={w.systems} empty={w.heatNone} rows={d.os.map((s) => ({ key: s.k, label: s.k === "unknown" ? w.unknown : s.k, n: s.n }))} />
          <RankList
            title={w.places}
            empty={w.heatNone}
            rows={
              d.cities.length
                ? d.cities.map((s) => ({ key: s.k, label: s.k, n: s.n }))
                : d.countries.map((s) => ({ key: s.k, label: countryName(locale, s.k, w), n: s.n }))
            }
          />
          <RankList title={w.audience} empty={w.heatNone} rows={d.audience.map((s) => ({ key: s.k, label: roleName(w, s.k), n: s.n }))} />
          {d.campaigns.length > 0 && (
            <div className="col-span-2 lg:col-span-3">
              <RankList title={w.campaigns} empty={w.heatNone} rows={d.campaigns.map((s) => ({ key: s.k, label: <span dir="auto">{s.k}</span>, n: s.n }))} />
            </div>
          )}
        </div>
      )}

      {tab === "pages" && (
        <div className="grid max-h-[calc(100dvh-19rem)] gap-2 overflow-y-auto overscroll-contain lg:max-h-none lg:grid-cols-2">
          <RankList
            title={w.topPages}
            empty={w.heatNone}
            action={
              <Link href={clicksHref(d.pages[0]?.path ?? "/")} className="text-[13px] font-semibold text-brand-700">
                {w.clicksLink}
              </Link>
            }
            rows={d.pages.map((p) => ({
              key: p.path,
              label: pageName(w, p.path),
              n: p.views,
              href: clicksHref(p.path),
              sub: (
                <>
                  <span dir="ltr">{p.path}</span>
                  {p.seconds != null && ` · ${fill(w.onPage, { t: duration(w, p.seconds) })}`}
                  {p.clicks > 0 && ` · ${count(w.clicks, p.clicks)}`}
                </>
              ),
            }))}
          />
          <RankList title={w.entryPages} empty={w.heatNone} rows={d.entries.map((s) => ({ key: s.k, label: pageName(w, s.k), n: s.n, sub: <span dir="ltr">{s.k}</span> }))} />
        </div>
      )}
    </div>
  );
}

/** No arrow when there is nothing on either side to compare. */
const delta = (cur: number, prev: number) => (cur || prev ? pctChange(cur, prev) : null);

async function VisitRow({ v }: { v: TrafficVisit }) {
  const { t, locale, count } = await getI18n();
  const w = t.admin.traffic;
  const DeviceIcon = v.device === "desktop" ? Monitor : v.device === "tablet" ? Tablet : Smartphone;
  const place = v.city || (v.country ? countryName(locale, v.country, w) : null);
  const who = personLabel(w, v.user, v.visitor);
  return (
    <Link href={`/admin/traffic/visit/${v.session}`} className="flex items-center gap-2.5 px-3 py-2 transition hover:bg-canvas/70">
      {v.user ? (
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-semibold text-white">{initials(who)}</span>
      ) : (
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-canvas text-body">
          <DeviceIcon className="size-5" aria-hidden />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[15px] font-medium text-ink">{who}</span>
          {v.user && <span className="shrink-0 text-xs text-muted">{v.user.business ?? roleName(w, v.user.role)}</span>}
          {v.user && !v.signed_in && <Badge tone="neutral">{w.signedOut}</Badge>}
        </span>
        <span className="block truncate text-[13px] text-muted">
          {[sourceName(w, v.source), place, count(w.pages, v.views), v.seconds ? duration(w, v.seconds) : null].filter(Boolean).join(" · ")}
        </span>
      </span>
      <span className="shrink-0 text-xs text-faint">{timeAgo(v.last_at, locale)}</span>
    </Link>
  );
}
