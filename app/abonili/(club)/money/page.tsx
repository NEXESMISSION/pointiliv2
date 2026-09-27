import Link from "next/link";
import { ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import { abRpc, getAb, requireClub } from "@/lib/abonili/server";
import { day, dayTime, money, monthName, waLink } from "@/lib/abonili/format";
import type { AbMethod, AbMoney } from "@/lib/abonili/types";

export async function generateMetadata() {
  const { a } = await getAb();
  return { title: a.money.title };
}

/** "2026-09" → "2026-09-01", anything else → null (this month) */
function parseMonth(m: string | undefined): string | null {
  return m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) ? `${m}-01` : null;
}
function shift(month: string, by: number): string {
  const [y, mo] = month.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, mo - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function MoneyPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const sp = await searchParams;
  const [ctx, { a, count, fill, intl, locale }] = await Promise.all([requireClub("/abonili/money"), getAb()]);
  const data = await abRpc<AbMoney>("ab_money", { p_month: parseMonth(sp.m) });

  const thisMonth = ctx.today.slice(0, 7);
  const shown = data.month.slice(0, 7);
  const methods = (Object.entries(data.by_method) as [AbMethod, number][]).sort((x, y) => y[1] - x[1]);
  const max = Math.max(1, ...methods.map(([, v]) => v));
  const expected = data.due.reduce((s, d) => s + Number(d.price ?? 0), 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="ab-top">
        <h1 className="ab-h1">{a.money.title}</h1>
        <nav className="flex items-center gap-1">
          <Link href={`/abonili/money?m=${shift(shown, -1)}`} className="ab-btn ab-btn-quiet ab-btn-sm !px-2.5" aria-label={a.money.prev}>
            <ChevronLeft aria-hidden className="rtl:rotate-180" />
          </Link>
          {shown < thisMonth && (
            <Link href={`/abonili/money?m=${shift(shown, 1)}`} className="ab-btn ab-btn-quiet ab-btn-sm !px-2.5" aria-label={a.money.nextMonth}>
              <ChevronRight aria-hidden className="rtl:rotate-180" />
            </Link>
          )}
        </nav>
      </header>

      <section className="ab-panel p-5">
        <p className="text-[14px] font-semibold ab-faint">{monthName(data.month, intl)}</p>
        <p className="ab-num ab-ltr mt-2 text-[56px]" style={{ color: "var(--ab-lime)" }}>{money(data.total, intl, locale)}</p>
        <p className="mt-2 text-[14px] ab-dim">
          {count(a.money.sales, data.count)} · {fill(a.money.previous, { amount: money(data.previous, intl, locale) })}
        </p>
        {methods.length > 0 && (
          <div className="mt-5 space-y-2">
            {methods.map(([k, v]) => (
              <div key={k} className="flex items-center gap-3 text-[14px]">
                <span className="w-20 shrink-0 font-semibold ab-dim">{a.methods[k]}</span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--ab-surface-2)]">
                  <span className="block h-full rounded-full bg-[var(--ab-lime)]" style={{ width: `${(v / max) * 100}%` }} />
                </span>
                <span className="ab-ltr w-24 shrink-0 text-end font-bold">{money(v, intl, locale)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {shown === thisMonth && (
        <section>
          <h2 className="ab-h2">{a.money.due}</h2>
          <p className="-mt-1 mb-3 text-[13px] ab-faint">{a.money.dueHint}</p>
          {data.due.length === 0 ? (
            <p className="ab-panel p-4 text-[14px] ab-faint">{a.money.dueEmpty}</p>
          ) : (
            <>
              <ul className="ab-panel ab-divide overflow-hidden">
                {data.due.map((d) => (
                  <li key={d.member_id} className="ab-row">
                    <Link href={`/abonili/members/${d.member_id}`} className="ab-grow">
                      <span className="ab-trunc block text-[15px] font-bold" dir="auto">{d.name}</span>
                      <span className="block text-[13px] ab-faint"><bdi>{d.plan_name}</bdi> · <span className="ab-ltr">{day(d.until, intl)}</span></span>
                    </Link>
                    {d.phone && (
                      <a
                        className="ab-btn ab-btn-quiet ab-btn-sm"
                        target="_blank"
                        rel="noopener noreferrer"
                        href={waLink(d.phone, fill(a.money.remindText, { name: d.name.split(" ")[0] ?? d.name, club: ctx.club.name, date: day(d.until, intl) }))}
                      >
                        <MessageCircle aria-hidden />
                        {a.money.remind}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
              {expected > 0 && <p className="mt-2 text-[14px] font-semibold" style={{ color: "var(--ab-amber)" }}>{fill(a.money.expected, { amount: money(expected, intl, locale) })}</p>}
            </>
          )}
        </section>
      )}

      <section>
        <h2 className="ab-h2">{a.money.payments}</h2>
        {data.payments.length === 0 ? (
          <p className="ab-panel p-4 text-[14px] ab-faint">{a.money.noPayments}</p>
        ) : (
          <ul className="ab-panel ab-divide overflow-hidden">
            {data.payments.map((p) => (
              <li key={p.id}>
                <Link href={`/abonili/members/${p.member_id}`} className="ab-row">
                  <span className="ab-grow">
                    <span className="ab-trunc block text-[15px] font-bold" dir="auto">{p.name}</span>
                    <span className="block text-[13px] ab-faint">
                      <bdi>{p.plan_name ?? "—"}</bdi> · {a.methods[p.method]} · <span className="ab-ltr">{dayTime(p.at, intl)}</span>
                    </span>
                  </span>
                  <span className="ab-ltr text-[16px] font-extrabold">{money(p.amount, intl, locale)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
