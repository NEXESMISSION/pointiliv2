import { redirect } from "next/navigation";
import { Top } from "@/components/Top";
import { Icon3D, Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { call } from "@/lib/supabase";
import { t } from "@/lib/t";

export const metadata = { title: "الأرقام", robots: { index: false } };

type Stats = {
  customers: number; stamps: number; today: number; week: number; given: number; waiting: number;
  returning: number; new_week: number;
  days: { day: string; stamps: number }[];
  top: { name: string | null; stamps: number; goal: number | null; gifts: number; last_at: string | null }[];
};

const TZ = "Africa/Tunis";
const weekday = (d: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { weekday: "narrow", timeZone: TZ }).format(new Date(`${d}T12:00:00`));
const day = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "short", timeZone: TZ }).format(new Date(iso));

/**
 * The owner's numbers, on their own screen — the four that matter at the top,
 * the week as a row of bars, and the customers who come back the most. It is
 * where today's three numbers went when they left the home: the home is for
 * the code, this is for looking.
 */
export default async function ShopStats() {
  const me = await getMe();
  if (!me) redirect("/shop/new");
  if (!me.shop) redirect("/shop/setup");
  if (!me.shop.goal) redirect("/shop/card");
  const s = await call<Stats>("shop_stats");
  const days = s?.days ?? [];
  const max = Math.max(1, ...days.map((d) => d.stamps));
  const tiles = [
    { icon: "fire", value: s?.today ?? 0, label: t.numToday },
    { icon: "people", value: s?.customers ?? 0, label: t.statCustomers },
    { icon: "star", value: s?.stamps ?? 0, label: t.statStamps },
    { icon: "gift", value: s?.given ?? 0, label: t.statGiven },
  ];

  return (
    <Screen>
      <Top back="/shop" title={t.statsTitle} hint={t.statsHint} />

      <div className="mt-[2dvh] grid shrink-0 grid-cols-2 gap-2">
        {tiles.map((x) => (
          <div key={x.label} className="flex items-center gap-2.5 rounded-[1.125rem] bg-surface px-3 py-[clamp(0.625rem,1.6dvh,1rem)] shadow-card">
            <Icon3D name={x.icon} size={28} className="shrink-0" />
            <span className="min-w-0">
              <span className="num block text-[1.375rem] font-bold leading-none">{x.value}</span>
              <span className="mt-0.5 block truncate text-[0.75rem] text-muted">{x.label}</span>
            </span>
          </div>
        ))}
      </div>

      <section className="mt-[2dvh] shrink-0 rounded-[1.25rem] bg-surface px-3.5 py-3 shadow-card">
        <h2 className="text-[0.9375rem] font-bold">
          {t.statWeek} <span className="num text-[0.8125rem] font-semibold text-muted">{s?.week ?? 0}</span>
        </h2>
        <div className="mt-2 flex h-[9dvh] min-h-[4.5rem] items-end gap-1.5" dir="ltr">
          {days.map((d, i) => {
            const last = i === days.length - 1;
            return (
              <div key={d.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${weekday(d.day)} · ${d.stamps}`}>
                {d.stamps > 0 && <span className="num text-[0.6875rem] font-bold text-muted">{d.stamps}</span>}
                <span className={`w-full rounded-t-[0.25rem] ${last ? "bg-brand" : "bg-brand/30"}`} style={{ height: `${Math.max(4, (d.stamps / max) * 100)}%` }} />
                <bdi className="text-[0.6875rem] text-faint">{weekday(d.day)}</bdi>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-2 grid shrink-0 grid-cols-2 gap-2">
        <p className="rounded-[1.125rem] bg-surface px-3.5 py-2.5 text-[0.8125rem] text-muted shadow-card">
          <span className="num block text-[1.125rem] font-bold text-ink">{s?.returning ?? 0}</span>
          {t.statReturning}
        </p>
        <p className="rounded-[1.125rem] bg-surface px-3.5 py-2.5 text-[0.8125rem] text-muted shadow-card">
          <span className="num block text-[1.125rem] font-bold text-ink">{s?.new_week ?? 0}</span>
          {t.statNewWeek}
        </p>
      </div>

      <section className="mt-[2dvh] flex min-h-0 flex-1 flex-col pb-3">
        <h2 className="mb-2 px-0.5 text-[0.9375rem] font-bold">{t.statTop}</h2>
        <div data-list className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-[1.25rem] bg-surface shadow-card">
          {!s?.top.length ? (
            <p className="grid h-full place-items-center p-4 text-center text-[0.9062rem] text-muted">{t.customersEmpty}</p>
          ) : (
            <ul className="divide-y divide-line">
              {s.top.map((c, i) => (
                <li key={i} className="flex items-center gap-3 px-3.5 py-2.5">
                  <span className="num grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-[0.8125rem] font-bold text-brand">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9062rem] font-semibold">{c.name ?? t.someone}</span>
                    {c.last_at && <span className="block text-[0.75rem] text-muted">{day(c.last_at)}</span>}
                  </span>
                  {c.gifts > 0 && <span className="num shrink-0 rounded-full bg-coral-soft px-2 py-0.5 text-[0.75rem] font-bold text-coral">🎁 {c.gifts}</span>}
                  <span className="num shrink-0 text-[0.875rem] font-bold text-body">
                    {c.goal ? `${Math.min(c.stamps, c.goal)}/${c.goal}` : c.stamps}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </Screen>
  );
}
