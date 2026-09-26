import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { TopBar } from "@/components/nav/TopBar";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MemberActions } from "@/components/merchant/MemberActions";
import { rpc } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";
import { formatDate, formatDateTime } from "@/lib/format";
import type { MembershipDetail, MembershipStatus } from "@/lib/types";

export const metadata = { robots: { index: false, follow: false } } satisfies Metadata;

const TONE: Record<MembershipStatus, "success" | "warning" | "danger" | "neutral"> = {
  active: "success",
  expiring_soon: "warning",
  expired: "danger",
  used_up: "danger",
  cancelled: "neutral",
};

/**
 * One member. The answer the owner came for is the first thing on the screen —
 * valid or not, and until when — and the buttons that change it are directly
 * under it. The entry log sits last, because it settles arguments rather than
 * starting them.
 */
export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { t, locale, fill }] = await Promise.all([params, getI18n()]);
  const res = await rpc<MembershipDetail | { ok: false }>("merchant_membership", { p_id: id });
  if (!("membership" in res)) notFound();
  const m = res.membership;
  const w = t.merchant.abonili;

  return (
    <div className="mx-auto max-w-md">
      <TopBar title={m.full_name || fill(w.code, { code: m.code })} back="/members" subtitle={m.plan_name} />

      <Card className="p-4 text-center">
        <Badge tone={TONE[m.status]}>{w.status[m.status]}</Badge>
        <p dir="ltr" className="mt-2 text-3xl font-semibold tracking-tight text-ink tabular">
          {m.sessions_left !== null
            ? fill(w.sessionsLeft, { n: m.sessions_left })
            : m.days_left !== null
              ? fill(w.daysLeft, { n: m.days_left })
              : "—"}
        </p>
        <p className="mt-0.5 text-sm text-muted">{m.ends_at ? formatDate(m.ends_at, locale) : w.noEnd}</p>

        <div className="mt-4">
          <MemberActions member={m} />
        </div>
      </Card>

      <Card className="mt-3 divide-y divide-line/80 overflow-hidden text-sm">
        <Row label={w.phone} value={<span dir="ltr">{m.phone_masked ?? m.phone}</span>} />
        <Row label={w.history} value={String(m.checkins)} />
        {!m.linked && <Row label="" value={<span className="text-muted">{w.notLinked}</span>} />}
      </Card>

      <section className="mt-4">
        <h2 className="mb-1.5 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">{w.history}</h2>
        {res.history.length === 0 ? (
          <p className="px-1 text-sm text-muted">{w.historyEmpty}</p>
        ) : (
          <Card className="max-h-[34dvh] divide-y divide-line/80 overflow-y-auto">
            {res.history.map((h) => (
              <p key={h.at} className="px-3.5 py-2 text-sm text-body">
                {formatDateTime(h.at, locale)}
              </p>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}
