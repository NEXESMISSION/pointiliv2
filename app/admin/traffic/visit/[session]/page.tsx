import Link from "next/link";
import { Eye, LogIn, Monitor, MousePointerClick, Smartphone, Tablet, UserPlus } from "lucide-react";
import {
  appName,
  countryName,
  deviceName,
  duration,
  pageName,
  personLabel,
  roleName,
  sourceName,
  type TrafficSession,
} from "@/components/admin/traffic/model";
import { TopBar } from "@/components/nav/TopBar";
import { Badge } from "@/components/ui/Badge";
import { Card, SectionTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatDateTime, formatTime, initials, timeAgo } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { rpc } from "@/lib/session";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.admin.traffic.visitTitle };
}

const APPS = new Set(["facebook", "messenger", "instagram", "tiktok", "snapchat", "linkedin"]);

export default async function VisitPage({ params }: { params: Promise<{ session: string }> }) {
  const { session } = await params;
  const v = /^[A-Za-z0-9_-]{8,40}$/.test(session) ? await rpc<TrafficSession | null>("admin_traffic_session", { p_session: session }) : null;
  const { t, locale, count } = await getI18n();
  const w = t.admin.traffic;

  if (!v) {
    return (
      <div className="animate-fade space-y-3">
        <TopBar back="/admin/traffic?tab=people" title={w.visitTitle} />
        <EmptyState title={w.notFound} />
      </div>
    );
  }

  const f = v.first;
  const who = personLabel(w, v.user, v.visitor);
  const DeviceIcon = f?.device === "desktop" ? Monitor : f?.device === "tablet" ? Tablet : Smartphone;
  const source = f?.utm_source || f?.referrer || (f?.in_app && APPS.has(f.in_app) ? f.in_app : null) || "direct";
  const views = v.events.filter((e) => e.kind === "view").length;
  const place = [f?.city, f?.country ? countryName(locale, f.country, w) : null].filter(Boolean).join(", ");

  const facts: [string, string][] = [
    [w.started, formatDateTime(v.started, locale)],
    [w.duration, `${duration(w, v.seconds)} · ${count(w.pages, views)}`],
    [w.source, [sourceName(w, source), f?.utm_campaign].filter(Boolean).join(" · ")],
    [w.deviceLabel, [deviceName(w, f?.device), f?.os, f?.in_app ? appName(w, f.in_app) : f?.browser].filter(Boolean).join(" · ")],
    [w.place, place || w.unknown],
    [w.screen, [f?.vw && f?.vh ? `${f.vw}×${f.vh}` : null, f?.lang].filter(Boolean).join(" · ") || w.unknown],
  ];

  return (
    <div className="animate-fade space-y-2.5">
      <TopBar back="/admin/traffic?tab=people" title={w.visitTitle} subtitle={timeAgo(v.last_at, locale)} />

      <Card className="p-3">
        <div className="flex items-center gap-3">
          {v.user ? (
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-600 text-base font-semibold text-white">{initials(who)}</span>
          ) : (
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-canvas text-body">
              <DeviceIcon className="size-5" aria-hidden />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-ink">{who}</p>
            <p className="truncate text-[13px] text-muted">
              {v.user ? (
                <>
                  {v.user.business ?? roleName(w, v.user.role)}
                  {v.user.phone && (
                    <>
                      {" · "}
                      <span dir="ltr">{v.user.phone}</span>
                    </>
                  )}
                </>
              ) : (
                roleName(w, "visitor")
              )}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {v.user && !v.signed_in && <Badge tone="neutral">{w.signedOut}</Badge>}
            {f?.test && <Badge tone="warning">{w.testBadge}</Badge>}
            {f?.bot && <Badge tone="danger">{w.botBadge}</Badge>}
          </div>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-line pt-3">
          {facts.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[11px] font-medium text-muted">{label}</dt>
              <dd className="line-clamp-2 break-words text-[13px] font-medium text-ink" dir="auto">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <section>
        <SectionTitle>{w.journey}</SectionTitle>
        <Card className="max-h-[calc(100dvh-27rem)] divide-y divide-line/70 overflow-y-auto overscroll-contain lg:max-h-[calc(100dvh-22rem)]">
          {v.events.map((e, i) => {
            const Icon = e.kind === "view" ? Eye : e.kind === "click" ? MousePointerClick : e.kind === "login" ? LogIn : UserPlus;
            const tone = e.kind === "view" ? "bg-brand-50 text-brand-600" : e.kind === "click" ? "bg-canvas text-muted" : "bg-success-50 text-success-600";
            const label = e.kind === "click" ? (e.target?.match(/«(.*)»/)?.[1] ?? e.target ?? "") : pageName(w, e.path);
            return (
              <div key={i} className={`flex items-center gap-2.5 px-3 py-2 ${e.kind === "click" ? "ps-7" : ""}`}>
                <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${tone}`}>
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-ink">
                    <span className="text-muted">{w.events[e.kind]}</span> <b className="font-medium" dir="auto">{label}</b>
                  </span>
                  {e.kind === "view" && e.seconds != null && e.seconds > 0 && <span className="block text-[11px] text-muted">{duration(w, e.seconds)}</span>}
                </span>
                <span className="shrink-0 text-[11px] text-faint tabular">{formatTime(e.at, locale)}</span>
              </div>
            );
          })}
        </Card>
      </section>

      {v.other_visits.length > 0 && (
        <section>
          <SectionTitle>{w.otherVisits}</SectionTitle>
          <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
            {v.other_visits.map((o) => (
              <Link key={o.session} href={`/admin/traffic/visit/${o.session}`} className="shrink-0 rounded-xl bg-white px-3 py-2 text-xs ring-1 ring-inset ring-line hover:bg-canvas">
                <b className="block font-semibold text-ink">{formatDate(o.started, locale, { year: undefined })}</b>
                <span className="text-muted">{count(w.pages, o.views)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
