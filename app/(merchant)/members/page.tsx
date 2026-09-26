import Link from "next/link";
import type { Metadata } from "next";
import { Plus, Search, UserPlus } from "lucide-react";
import { Segmented, TopBar } from "@/components/nav/TopBar";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { rpc } from "@/lib/session";
import { requireMerchant } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";
import { formatDate, timeAgo } from "@/lib/format";
import type { MembershipRow, MembershipsPage, MembershipStatus } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.merchant.abonili.title };
}

const FILTERS = ["all", "expiring", "expired"] as const;

const TONE: Record<MembershipStatus, "success" | "warning" | "danger" | "neutral"> = {
  active: "success",
  expiring_soon: "warning",
  expired: "danger",
  used_up: "danger",
  cancelled: "neutral",
};

/**
 * The roster: who is valid, who is about to stop being valid, who already has.
 * Sorted by the database so the people the owner can still do something about
 * sit at the top — "bientôt fini" before "valide", because the first list is
 * money he can still keep and the second is money already in.
 */
export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string; f?: string }> }) {
  const [ctx, { t, locale, fill }, sp] = await Promise.all([requireMerchant("/members"), getI18n(), searchParams]);
  const w = t.merchant.abonili;
  const q = sp.q ?? "";
  const filter = (FILTERS as readonly string[]).includes(sp.f ?? "") ? sp.f! : "all";

  const [list, expiring] = await Promise.all([
    rpc<MembershipsPage>("merchant_memberships", { p_search: q || null, p_filter: filter, p_limit: 200, p_offset: 0 }),
    rpc<MembershipRow[]>("merchant_memberships_expiring", { p_days: 7 }),
  ]);

  const href = (f: string) => `/members?f=${f}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  /* The "bientôt fini" block is a shortlist of the same people, so the list
     below drops them: one row per person on screen, or it reads as a bug. */
  const showExpiring = filter === "all" && !q && expiring.length > 0;
  const lifted = showExpiring ? new Set(expiring.map((m) => m.id)) : new Set<string>();
  const rows = list.items.filter((m) => !lifted.has(m.id));

  return (
    <div className="mx-auto max-w-2xl">
      <TopBar
        title={w.title}
        large
        back="/lobby"
        subtitle={fill(w.planMembers, { n: list.total })}
        action={
          <Link href="/members/new" aria-label={w.add} className="grid size-9 place-items-center rounded-xl bg-brand-600 text-white shadow-brand transition active:scale-95">
            <Plus className="size-5" />
          </Link>
        }
      />

      {list.total === 0 && !q ? (
        <EmptyState icon={<UserPlus className="size-8" />} title={w.emptyTitle} action={<LinkButton href="/members/new" block>{w.add}</LinkButton>}>
          {w.emptyBody}
        </EmptyState>
      ) : (
        <>
          <div className="mb-3">
            <Segmented active={filter} items={FILTERS.map((f) => ({ key: f, href: href(f), label: w.filters[f] }))} />
          </div>

          <form action="/members" className="relative mb-3">
            {filter !== "all" && <input type="hidden" name="f" value={filter} />}
            <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
            <input
              name="q"
              defaultValue={q}
              type="search"
              inputMode="search"
              placeholder={w.search}
              aria-label={w.search}
              className="h-11 w-full rounded-2xl border border-line bg-white ps-10 pe-4 text-base placeholder:text-faint focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
            />
          </form>

          {/* The money about to walk out. One message now and he renews. */}
          {showExpiring && (
            <section className="mb-4">
              <h2 className="mb-1.5 px-1 text-[13px] font-semibold text-warning-700">{w.expiringTitle}</h2>
              <Card className="divide-y divide-line/80 overflow-hidden">
                {expiring.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 px-3.5 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-ink">{m.full_name || fill(w.code, { code: m.code })}</span>
                      <span className="block truncate text-[13px] text-muted">
                        {m.ends_at ? formatDate(m.ends_at, locale) : w.noEnd}
                      </span>
                    </span>
                    <a
                      href={`https://wa.me/${m.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                        fill(w.whatsappMessage, {
                          name: m.full_name ?? "",
                          business: ctx.business.name,
                          date: m.ends_at ? formatDate(m.ends_at, locale) : "",
                        }),
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-xl bg-[#25d366] px-3 py-1.5 text-xs font-bold text-white"
                    >
                      {w.remind}
                    </a>
                  </div>
                ))}
              </Card>
            </section>
          )}

          {rows.length === 0 && !showExpiring ? (
            <EmptyState title={q ? fill(w.noMatch, { q }) : w.emptyTitle} />
          ) : (
            <div className="max-h-[52dvh] overflow-y-auto pb-2">
              <Card className="divide-y divide-line/80 overflow-hidden">
                {rows.map((m) => (
                  <Link key={m.id} href={`/members/${m.id}`} className="flex items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-canvas/70">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-ink">{m.full_name || fill(w.code, { code: m.code })}</span>
                      <span className="block truncate text-[13px] text-muted">
                        {m.plan_name}
                        {" · "}
                        {m.last_checkin_at ? timeAgo(m.last_checkin_at, locale) : w.never}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <Badge tone={TONE[m.status]}>{w.status[m.status]}</Badge>
                      <span dir="ltr" className="text-[12px] font-medium text-muted tabular">
                        {m.sessions_left !== null
                          ? fill(w.sessionsLeft, { n: m.sessions_left })
                          : m.days_left !== null
                            ? fill(w.daysLeft, { n: m.days_left })
                            : w.noEnd}
                      </span>
                    </span>
                  </Link>
                ))}
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
