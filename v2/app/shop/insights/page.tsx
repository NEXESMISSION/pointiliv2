import { redirect } from "next/navigation";
import { CalendarDays, Gift, Hourglass, Repeat, Sparkles, Trophy, Users } from "lucide-react";
import { Top } from "@/components/Top";
import { Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { call } from "@/lib/supabase";
import { customersN, daysN, fill, t, visitsN } from "@/lib/t";

export const dynamic = "force-dynamic";
export const metadata = { title: "شكون رجع؟", robots: { index: false } };

type Insights = {
  ok: boolean;
  customers: number;
  visited: number;
  returning: number;
  visits: number;
  back_visits: number;
  median_gap: number | null;
  rhythm: number;
  active: number;
  cooling: number;
  lost: number;
  early: number;
  early_of: number;
  new_30: number;
  new_prev: number;
  near: number;
  given: number;
  reset_days: number | null;
  resetting: number;
  weekdays: number[];
  hours: number[];
  cooling_list: { name: string | null; days: number; stamps: number; goal: number; n: number }[];
  champions: { name: string | null; n: number; days: number }[];
};

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
const hour = (h: number) => `${String(h).padStart(2, "0")}:00`;
const card = "rounded-[1.375rem] bg-surface shadow-card";

/**
 * «شكون رجع؟» — the owner's insights (the founder, 6 Nov 2026: «a small analytics page to track the
 * customers who come back and who did not, and how long — KPIs that make the owner say wow, clean,
 * and costing us nothing much»). One call when it opens (shop_insights: every number in one query,
 * nothing kept, nothing polled), read top to bottom as a story: how many came back, how often, who is
 * slipping away right now and is worth a word, when they come, and who never misses.
 *
 * A customer is active, cooling or lost against the shop's own rhythm — the median days between two
 * visits — not a number picked for every trade: a café's week is a barber's month.
 */
export default async function ShopInsights({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const [me, { from }] = await Promise.all([getMe(), searchParams]);
  if (!me) redirect("/shop/new");
  if (!me.shop) redirect("/shop/setup");
  if (!me.shop.goal) redirect("/shop/card");
  const s = await call<Insights>("shop_insights");

  if (!s?.ok) {
    return (
      <Screen>
        <Top back={from === "settings" ? "/shop/stats?from=settings" : "/shop/stats"} title={t.insTitle} />
        <p className="mt-8 text-center text-[0.9375rem] text-muted">{t.errNetwork}</p>
      </Screen>
    );
  }

  const rate = pct(s.returning, s.visited);
  const early = s.early_of >= 3 ? pct(s.early, s.early_of) : null;
  const gap = s.median_gap === null ? null : Math.max(1, Math.round(s.median_gap));
  const r = s.rhythm;
  const seg = s.active + s.cooling + s.lost;
  const growth = s.new_prev > 0 ? pct(s.new_30 - s.new_prev, s.new_prev) : null;
  const week = s.weekdays ?? [];
  const weekMax = Math.max(1, ...week);
  const bestDay = week.some((n) => n > 0) ? week.indexOf(Math.max(...week)) : null;
  const hours = s.hours ?? [];
  const bestHour = hours.some((n) => n > 0) ? hours.indexOf(Math.max(...hours)) : null;
  const young = s.visited < 3;

  const tiles = [
    { icon: CalendarDays, value: gap === null ? "—" : String(gap), unit: gap === null ? "" : gap === 1 ? "نهار" : gap === 2 ? "يومين" : gap <= 10 ? "أيّام" : "يوم", label: t.insGap },
    { icon: Repeat, value: String(s.back_visits), unit: "", label: t.insBack },
    { icon: Users, value: String(s.active), unit: "", label: t.insActive },
    { icon: Sparkles, value: early === null ? "—" : `${early}%`, unit: "", label: t.insEarly },
  ];

  return (
    <Screen>
      <Top back={from === "settings" ? "/shop/stats?from=settings" : "/shop/stats"} title={t.insTitle} hint={t.insSub} />

      {/* how many came back: the number a loyalty card is for */}
      <section className="mt-[2dvh] shrink-0 overflow-hidden rounded-[1.5rem] bg-[linear-gradient(140deg,#8f75ff_0%,#6c47ff_50%,#4a2ad6_100%)] p-4 text-white shadow-[0_18px_40px_-20px_rgb(74_42_214/0.9)]">
        <div className="flex items-center gap-4">
          <span
            className="relative grid size-[6.25rem] shrink-0 place-items-center rounded-full"
            style={{ background: `conic-gradient(#fff ${rate * 3.6}deg, rgb(255 255 255 / 0.18) 0deg)` }}
            aria-hidden
          >
            <span className="grid size-[5.1rem] place-items-center rounded-full bg-[#5b38ee]">
              <span className={`num font-bold leading-none ${rate >= 100 ? "text-[1.375rem]" : "text-[1.75rem]"}`}>{rate}%</span>
            </span>
          </span>
          <span className="min-w-0">
            <span className="block text-[1.25rem] font-bold leading-tight">{t.insRate}</span>
            <span className="mt-1 block text-[0.875rem] text-white/85">{fill(t.insRateSub, { a: s.returning, b: customersN(s.visited) })}</span>
          </span>
        </div>
      </section>

      {/* four numbers that say what the card does */}
      <div className="mt-[1.6dvh] grid shrink-0 grid-cols-2 gap-2">
        {tiles.map((x) => (
          <div key={x.label} className={`${card} flex flex-col gap-1 px-3.5 py-3`}>
            <x.icon className="size-5 text-brand" strokeWidth={2.3} />
            <span className="mt-0.5 flex items-baseline gap-1">
              <span className="num text-[1.625rem] font-bold leading-none">{x.value}</span>
              {x.unit && <span className="text-[0.875rem] font-semibold text-muted">{x.unit}</span>}
            </span>
            <span className="text-[0.8125rem] leading-snug text-muted">{x.label}</span>
          </div>
        ))}
      </div>

      {/* the good news and the one to act on, in one line each */}
      <div className="mt-[1.6dvh] flex shrink-0 flex-wrap gap-1.5">
        {s.new_30 > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-mint-soft px-3 py-1.5 text-[0.8125rem] font-bold text-mint">
            {fill(t.insNew, { n: customersN(s.new_30) })}
            {/* only a rise is said here: a green chip is good news */}
            {growth !== null && growth > 0 && <span className="num opacity-80">· {fill(t.insNewUp, { pct: growth })}</span>}
          </span>
        )}
        {s.near > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-[0.8125rem] font-bold text-brand">
            <Gift className="size-3.5" /> {fill(t.insNear, { n: customersN(s.near) })}
          </span>
        )}
        {s.reset_days && s.resetting > 0 ? (
          <span className="flex items-center gap-1.5 rounded-full bg-coral-soft px-3 py-1.5 text-[0.8125rem] font-bold text-coral">
            <Hourglass className="size-3.5" /> {fill(t.insResetting, { n: customersN(s.resetting) })}
          </span>
        ) : null}
      </div>

      {young ? (
        <p className={`${card} mt-[2dvh] shrink-0 px-4 py-5 text-center text-[0.9375rem] leading-relaxed text-muted`}>{t.insEmpty}</p>
      ) : (
        <>
          {/* where the customers stand, against the shop's own rhythm */}
          <section className={`${card} mt-[2dvh] shrink-0 px-3.5 py-3`}>
            <h2 className="text-[0.9375rem] font-bold">{t.insWhere}</h2>
            <div className="mt-2.5 flex h-3 overflow-hidden rounded-full bg-line" aria-hidden>
              <span className="bg-brand" style={{ width: `${pct(s.active, seg)}%` }} />
              <span className="bg-[#F5A524]" style={{ width: `${pct(s.cooling, seg)}%` }} />
              <span className="bg-coral/70" style={{ width: `${pct(s.lost, seg)}%` }} />
            </div>
            <ul className="mt-2.5 space-y-1.5 text-[0.8125rem]">
              {[
                { n: s.active, dot: "bg-brand", name: t.insSegActive, hint: fill(t.insSegActiveHint, { days: daysN(2 * r) }) },
                { n: s.cooling, dot: "bg-[#F5A524]", name: t.insSegCooling, hint: fill(t.insSegCoolingHint, { a: 2 * r, b: 4 * r }) },
                { n: s.lost, dot: "bg-coral/70", name: t.insSegLost, hint: fill(t.insSegLostHint, { days: daysN(4 * r) }) },
              ].map((x) => (
                <li key={x.name} className="flex items-center gap-2">
                  <span className={`size-2.5 shrink-0 rounded-full ${x.dot}`} />
                  <b className="text-ink">{x.name}</b>
                  <span className="min-w-0 flex-1 truncate text-muted">{x.hint}</span>
                  <span className="num font-bold text-ink">{x.n}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* who is slipping away right now, the nearest their gift first: worth a word at the counter */}
          {s.cooling_list.length > 0 && (
            <section className={`${card} mt-[1.6dvh] shrink-0 px-3.5 py-3`}>
              <h2 className="text-[0.9375rem] font-bold">{t.insCooling}</h2>
              <ul className="mt-1.5 divide-y divide-line" data-clarity-mask="true">
                {s.cooling_list.map((c, i) => (
                  <li key={i} className="flex items-center gap-3 py-2">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#FFF4DD] text-[0.875rem] font-bold text-[#B7791F]">{(c.name?.[0] ?? "؟").toUpperCase()}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.9375rem] font-semibold">{c.name ?? t.someone}</span>
                      <span className="block text-[0.75rem] text-muted">{fill(t.insCoolingRow, { days: daysN(c.days) })}</span>
                    </span>
                    <span className="num shrink-0 text-[0.8125rem] font-bold text-body">
                      {Math.min(c.stamps, c.goal)}/{c.goal}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* when they come: the week's shape these 90 days, its best day and its busiest hour */}
          {bestDay !== null && (
            <section className={`${card} mt-[1.6dvh] shrink-0 px-3.5 py-3`}>
              <h2 className="text-[0.9375rem] font-bold">{t.insWhen}</h2>
              <p className="mt-1 text-[0.8125rem] text-muted">
                {t.insBestDay}: <b className="text-ink">{t.insWeekdays[bestDay]}</b>
                {bestHour !== null && (
                  <>
                    {" · "}
                    {t.insBestHour}: <b className="num text-ink">{hour(bestHour)}</b>
                  </>
                )}
              </p>
              <div className="mt-2 flex h-16 items-end gap-1.5">
                {week.map((n, i) => (
                  <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                    <span className={`w-full rounded-t-[0.25rem] ${i === bestDay ? "bg-brand" : "bg-brand/25"}`} style={{ height: `${Math.max(6, (n / weekMax) * 100)}%` }} />
                    <span className={`text-[0.75rem] ${i === bestDay ? "font-bold text-brand" : "text-faint"}`}>{t.insWeekdaysShort[i]}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* the ones who never miss */}
          {s.champions.length > 0 && (
            <section className={`${card} mb-[2dvh] mt-[1.6dvh] shrink-0 px-3.5 py-3`}>
              <h2 className="flex items-center gap-1.5 text-[0.9375rem] font-bold">
                <Trophy className="size-4 text-[#F5A524]" /> {t.insChampions}
              </h2>
              <ul className="mt-1.5 divide-y divide-line" data-clarity-mask="true">
                {s.champions.map((c, i) => (
                  <li key={i} className="flex items-center gap-3 py-2">
                    <span className={`num grid size-8 shrink-0 place-items-center rounded-full text-[0.8125rem] font-bold ${i === 0 ? "bg-[#FFF4DD] text-[#B7791F]" : "bg-brand-soft text-brand"}`}>{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold">{c.name ?? t.someone}</span>
                    <span className="shrink-0 text-[0.8125rem] font-bold text-body">{visitsN(c.n)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </Screen>
  );
}
