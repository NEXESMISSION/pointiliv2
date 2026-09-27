import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { MemberRow } from "@/components/abonili/MemberRow";
import { abRpc, getAb, requireClub } from "@/lib/abonili/server";
import type { AbFilter, AbMembersPage } from "@/lib/abonili/types";

const FILTERS: AbFilter[] = ["all", "active", "soon", "expired"];

export async function generateMetadata() {
  const { a } = await getAb();
  return { title: a.members.title };
}

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ f?: string; q?: string }> }) {
  const sp = await searchParams;
  const f: AbFilter = FILTERS.includes(sp.f as AbFilter) ? (sp.f as AbFilter) : "all";
  const q = (sp.q ?? "").slice(0, 80);
  const [ctx, { a }] = await Promise.all([requireClub("/abonili/members"), getAb()]);
  const page = await abRpc<AbMembersPage>("ab_members", { p_filter: f, p_search: q || null });

  const href = (filter: AbFilter) => {
    const u = new URLSearchParams();
    if (filter !== "all") u.set("f", filter);
    if (q) u.set("q", q);
    const s = u.toString();
    return `/abonili/members${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-5">
      <header className="ab-top">
        <h1 className="ab-h1">{a.members.title}</h1>
        {ctx.counts.plans > 0 && (
          <Link href="/abonili/members/new" className="ab-btn ab-btn-sm">
            <Plus aria-hidden />
            {a.members.add}
          </Link>
        )}
      </header>

      {ctx.counts.plans === 0 ? (
        <div className="ab-panel space-y-4 p-5">
          <p className="text-[16px] font-semibold">{a.members.noPlans}</p>
          <Link href="/abonili/plans" className="ab-btn">{a.members.createPlan}</Link>
        </div>
      ) : (
        <>
          <form action="/abonili/members" className="relative">
            {f !== "all" && <input type="hidden" name="f" value={f} />}
            <Search aria-hidden className="pointer-events-none absolute top-1/2 size-5 -translate-y-1/2 ab-faint start-4" />
            <input name="q" defaultValue={q} placeholder={a.members.search} aria-label={a.members.search}
              className="ab-input ps-12" type="search" autoComplete="off" />
          </form>

          <nav className="ab-chips" aria-label={a.members.title}>
            {FILTERS.map((x) => (
              <Link key={x} href={href(x)} className="ab-chip" aria-current={x === f ? "page" : undefined}>
                {a.members.filters[x]} <b>{page.counts[x]}</b>
              </Link>
            ))}
          </nav>

          {page.items.length === 0 ? (
            <div className="ab-panel space-y-4 p-5">
              <p className="text-[15px] ab-dim">{ctx.counts.members === 0 ? a.members.emptyAll : a.members.empty}</p>
              {ctx.counts.members === 0 && (
                <Link href="/abonili/members/new" className="ab-btn">
                  <Plus aria-hidden />
                  {a.members.add}
                </Link>
              )}
            </div>
          ) : (
            <ul className="ab-panel ab-divide overflow-hidden">
              {page.items.map((m) => (
                <li key={m.id}>
                  <MemberRow m={m} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
