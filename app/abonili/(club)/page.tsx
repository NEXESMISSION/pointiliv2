import Link from "next/link";
import { Door } from "@/components/abonili/Door";
import { abRpc, getAb, requireClub } from "@/lib/abonili/server";
import { longDay, time } from "@/lib/abonili/format";
import type { AbToday } from "@/lib/abonili/types";

export async function generateMetadata() {
  const { a } = await getAb();
  return { title: a.door.title };
}

export default async function DoorPage() {
  const [ctx, { a, intl }] = await Promise.all([requireClub(), getAb()]);
  const today = await abRpc<AbToday>("ab_today");

  const stats = [
    { n: today.active, label: a.door.statIn, color: "var(--ab-lime)" },
    { n: today.ending_week, label: a.door.statWeek, color: "var(--ab-amber)" },
    { n: today.visits_today, label: a.door.statToday, color: "var(--ab-text)" },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
      <div className="space-y-5">
        <header>
          <p className="text-[13px] font-semibold ab-faint">{longDay(ctx.today, intl)}</p>
          <h1 className="ab-h1 mt-1">{ctx.club.name}</h1>
        </header>
        <Door suspended={ctx.club.status === "suspended"} />
      </div>

      <aside className="space-y-5">
        <div className="grid grid-cols-3 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="ab-panel px-3 py-3.5">
              <p className="ab-num text-[34px]" style={{ color: s.color }}>{s.n}</p>
              <p className="mt-1.5 text-[12px] font-semibold leading-tight ab-faint">{s.label}</p>
            </div>
          ))}
        </div>

        <section>
          <h2 className="ab-h2">{a.door.today}</h2>
          {today.visits.length === 0 ? (
            <p className="ab-panel p-4 text-[14px] ab-faint">{a.door.todayEmpty}</p>
          ) : (
            <ol className="ab-panel ab-divide overflow-hidden">
              {today.visits.map((v) => (
                <li key={`${v.member_id}-${v.at}`}>
                  <Link href={`/abonili/members/${v.member_id}`} className="ab-row">
                    <span className="ab-ltr w-12 shrink-0 text-[14px] font-bold ab-dim">{time(v.at, intl)}</span>
                    <span className="ab-grow ab-trunc text-[15px] font-semibold" dir="auto">{v.name}</span>
                    <span className="ab-ltr text-[13px] font-bold ab-faint">#{v.code}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>
      </aside>
    </div>
  );
}
