import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { CancelSale } from "@/components/abonili/CancelSale";
import { CardShare } from "@/components/abonili/CardShare";
import { MemberActions } from "@/components/abonili/MemberActions";
import { Verdict } from "@/components/abonili/Verdict";
import { abRpc, getAb, requireClub } from "@/lib/abonili/server";
import { cardPath, day, dayTime, dayYear, money, phoneLocal } from "@/lib/abonili/format";
import type { AbMemberDetail, AbPlan, AbResult } from "@/lib/abonili/types";
import { siteUrl } from "@/lib/url";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata() {
  const { a } = await getAb();
  return { title: a.members.title };
}

export default async function MemberPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string; renew?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!UUID.test(id)) notFound();
  const [ctx, { a, fill, intl, locale }] = await Promise.all([requireClub(`/abonili/members/${id}`), getAb()]);
  const [detail, plans] = await Promise.all([
    abRpc<AbMemberDetail | Extract<AbResult, { ok: false }>>("ab_member", { p_id: id }),
    abRpc<AbPlan[]>("ab_plans"),
  ]);
  if (!detail.ok) notFound();
  const { member: m, periods, visits } = detail;
  const url = `${siteUrl()}${cardPath(m.card_token)}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/abonili/members" className="inline-flex items-center gap-1 text-[14px] font-semibold ab-dim">
        <ChevronLeft aria-hidden className="size-4 rtl:rotate-180" />
        {a.member.back}
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="space-y-6">
          <Verdict m={m}>
            <MemberActions m={m} plans={plans} suspended={ctx.club.status === "suspended"} startWith={sp.renew ? "renew" : null} />
          </Verdict>

          <section>
            <h2 className="ab-h2">{a.member.history}</h2>
            <ul className="ab-panel ab-divide overflow-hidden">
              {periods.length === 0 && <li className="p-4 text-[14px] ab-faint">{a.status.none}</li>}
              {periods.map((p) => (
                <li key={p.id} className="ab-row items-start">
                  <span className="ab-grow">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className={`text-[15px] font-bold ${p.cancelled ? "line-through ab-faint" : ""}`} dir="auto">{p.plan_name}</span>
                      <span className="ab-pill !h-6 !text-[12px]" data-s={p.state === "current" ? "active" : p.state === "upcoming" ? "upcoming" : "none"}>
                        {a.member.period[p.state]}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-[13px] ab-faint">
                      <span className="ab-ltr">{day(p.starts_on, intl)}</span>
                      {p.ends_on && <> → <span className="ab-ltr">{dayYear(p.ends_on, intl)}</span></>}
                      {p.sessions !== null && <> · {fill(a.member.used, { used: p.used, total: p.sessions })}</>}
                    </span>
                    {(p.state === "current" || p.state === "upcoming") && <span className="mt-1.5 block"><CancelSale periodId={p.id} /></span>}
                  </span>
                  <span className={`ab-ltr text-[15px] font-bold ${p.cancelled ? "line-through ab-faint" : ""}`}>{money(p.paid, intl, locale)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="ab-h2">{a.member.visits}</h2>
            {visits.length === 0 ? (
              <p className="ab-panel p-4 text-[14px] ab-faint">{a.member.noVisits}</p>
            ) : (
              <ul className="ab-panel grid grid-cols-2 gap-px overflow-hidden sm:grid-cols-3">
                {visits.map((v) => (
                  <li key={v} className="ab-ltr bg-[var(--ab-surface)] px-4 py-2.5 text-[14px] font-semibold ab-dim">{dayTime(v, intl)}</li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section className={`ab-panel space-y-3 p-4 ${sp.new ? "border-[var(--ab-lime)]" : ""}`}>
            <h2 className="text-[17px] font-extrabold">{a.member.card}</h2>
            <p className="text-[13px] ab-faint">{a.member.cardHint}</p>
            <CardShare url={url} name={m.name} club={ctx.club.name} phone={m.phone} />
          </section>

          <dl className="ab-panel ab-divide overflow-hidden text-[14px]">
            <div className="flex justify-between gap-3 px-4 py-3"><dt className="ab-faint">{a.member.paid}</dt><dd className="ab-ltr font-bold">{money(detail.paid_total, intl, locale)}</dd></div>
            <div className="flex justify-between gap-3 px-4 py-3"><dt className="ab-faint">{a.member.visitsTotal}</dt><dd className="font-bold">{detail.visits_total}</dd></div>
            {m.phone && <div className="flex justify-between gap-3 px-4 py-3"><dt className="ab-faint">{a.add.phone}</dt><dd className="ab-ltr font-bold">{phoneLocal(m.phone)}</dd></div>}
            <div className="px-4 py-3 ab-faint">{fill(a.member.memberSince, { date: dayYear(m.created_at, intl) })}</div>
          </dl>

          {m.note && <p className="ab-panel whitespace-pre-line p-4 text-[14px] ab-dim" dir="auto">{m.note}</p>}
        </aside>
      </div>
    </div>
  );
}
