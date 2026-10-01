import Link from "next/link";
import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { Icon3D, Logo, Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { call } from "@/lib/supabase";
import { pretty } from "@/lib/phone";
import { accountsN, kindIcon, liveN, pausedN, stampsN, t, waitingN } from "@/lib/t";

export const metadata = { title: "الأدمين", robots: { index: false } };

type Overview = { shops: number; live: number; paused: number; customers: number; people: number; stamps: number; today: number; given: number; waiting: number; week: { day: string; stamps: number }[] };
type ShopRow = { id: string; name: string; kind: string; color: string; goal: number | null; paused: boolean; created_at: string; owner: { name: string; phone: string | null }; customers: number; stamps: number; today: number; last_at: string | null };
type PersonRow = { id: string; name: string; phone: string | null; admin: boolean; created_at: string; shop: string | null; cards: number; stamps: number };

const day = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "short", timeZone: "Africa/Tunis" }).format(new Date(iso));
const weekday = (d: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { weekday: "short", timeZone: "Africa/Tunis" }).format(new Date(`${d}T12:00:00`));

/** The founder's console: the whole of Pointili on one screen — numbers, the week, every shop, every person. */
export default async function Admin({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const [me, { tab = "shops", q = "" }] = await Promise.all([getMe(), searchParams]);
  if (!me) redirect("/login?next=/admin");
  if (!me.admin) redirect("/");
  const people = tab === "people";
  const [o, shops, persons] = await Promise.all([
    call<Overview>("admin_overview"),
    people ? Promise.resolve(null) : call<ShopRow[]>("admin_shops", { p_q: q || null }),
    people ? call<PersonRow[]>("admin_people", { p_q: q || null }) : Promise.resolve(null),
  ]);
  const max = Math.max(1, ...(o?.week ?? []).map((w) => w.stamps));
  const live = o?.live ?? 0;
  const paused = o?.paused ?? 0;
  const tiles = [
    { icon: "shop", value: o?.shops ?? 0, label: t.aShops, sub: !o?.shops ? t.aNothing : paused ? `${liveN(live)} · ${pausedN(paused)}` : live === o.shops ? t.aAllLive : liveN(live) },
    { icon: "people", value: o?.customers ?? 0, label: t.aCustomers, sub: accountsN(o?.people ?? 0) },
    { icon: "fire", value: o?.today ?? 0, label: t.aToday, sub: `${stampsN(o?.stamps ?? 0)} ${t.aInAll}` },
    { icon: "gift", value: o?.given ?? 0, label: t.aGiven, sub: waitingN(o?.waiting ?? 0) },
  ];

  return (
    <Screen className="pb-10">
      <header className="flex items-center justify-between pt-2">
        <Link href="/me" className="press grid size-11 place-items-center rounded-full bg-ink text-[15px] font-bold text-white shadow-card" aria-label={t.account}>
          {(me.name?.[0] ?? "A").toUpperCase()}
        </Link>
        <Logo />
      </header>
      <h1 className="mt-5 text-[30px] font-bold leading-tight">{t.admin}</h1>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {tiles.map((x) => (
          <div key={x.label} className="rounded-[22px] bg-surface p-3.5 shadow-card">
            <Icon3D name={x.icon} size={30} />
            <p className="num mt-1 text-[26px] font-bold leading-tight">{x.value}</p>
            <p className="truncate text-[13.5px] font-semibold">{x.label}</p>
            <p className="truncate text-[12px] text-muted">{x.sub}</p>
          </div>
        ))}
      </div>

      {o && (
        <section className="mt-4 rounded-[22px] bg-surface p-4 shadow-card">
          <h2 className="text-[15px] font-bold">{t.aWeek}</h2>
          <div className="mt-3 flex h-28 items-end gap-2" dir="ltr">
            {o.week.map((w, i) => {
              const last = i === o.week.length - 1;
              return (
                <div key={w.day} className="flex flex-1 flex-col items-center gap-1" title={`${weekday(w.day)} · ${w.stamps}`}>
                  {(last || w.stamps === max) && w.stamps > 0 && <span className="num text-[11px] font-semibold text-muted">{w.stamps}</span>}
                  <span className={`w-full rounded-t-[4px] ${last ? "bg-brand" : "bg-brand/35"}`} style={{ height: `${Math.max(4, (w.stamps / max) * 84)}px` }} />
                  <span className="text-[10.5px] text-faint">{weekday(w.day)}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="mt-5 flex gap-1 rounded-[18px] bg-ink/[0.06] p-1">
        {[
          { id: "shops", label: t.aShops },
          { id: "people", label: t.aPeople },
        ].map((x) => (
          <Link key={x.id} href={`/admin?tab=${x.id}`} className={`flex h-10 flex-1 items-center justify-center rounded-[14px] text-[15px] font-semibold ${tab === x.id ? "bg-surface text-ink shadow-card" : "text-muted"}`}>
            {x.label}
          </Link>
        ))}
      </div>

      <form action="/admin" className="relative mt-3">
        <input type="hidden" name="tab" value={tab} />
        <Search className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-faint" />
        <input name="q" defaultValue={q} placeholder={t.aSearch} className="h-12 w-full rounded-[16px] bg-surface ps-11 pe-4 shadow-card outline-none placeholder:text-faint focus:shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-brand)]" />
      </form>

      {!people && (
        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-[22px] bg-surface shadow-card">
          {(shops ?? []).length === 0 && <li className="p-4 text-center text-[15px] text-muted">{t.aNothing}</li>}
          {(shops ?? []).map((s) => (
            <li key={s.id}>
              <Link href={`/admin/shops/${s.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-canvas/60">
                <span className="grid size-11 shrink-0 place-items-center rounded-[14px]" style={{ background: s.color }}>
                  <Icon3D name={kindIcon(s.kind)} size={28} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[15.5px] font-semibold">{s.name}</span>
                    {s.paused && <span className="shrink-0 rounded-full bg-coral-soft px-2 py-0.5 text-[11px] font-bold text-coral">{t.aPaused}</span>}
                    {!s.goal && <span className="shrink-0 rounded-full bg-line px-2 py-0.5 text-[11px] font-bold text-muted">{t.aNoCard}</span>}
                  </span>
                  <span className="block truncate text-[12.5px] text-muted">
                    {s.owner.name || t.aOwner}
                    {s.owner.phone && (
                      <>
                        {" · "}
                        <span dir="ltr" className="num inline-block">{pretty(s.owner.phone)}</span>
                      </>
                    )}
                  </span>
                </span>
                <span className="shrink-0 text-end">
                  <span className="num block text-[15px] font-bold">{s.customers}</span>
                  <span className="block text-[11px] text-muted">{t.aCustomers}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {people && (
        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-[22px] bg-surface shadow-card">
          {(persons ?? []).length === 0 && <li className="p-4 text-center text-[15px] text-muted">{t.aNothing}</li>}
          {(persons ?? []).map((p) => (
            <li key={p.id}>
              <Link href={`/admin/people/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-canvas/60">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[linear-gradient(145deg,#ffb18a,#ff6b4a)] text-[16px] font-bold text-white">{(p.name?.[0] ?? "؟").toUpperCase()}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[15.5px] font-semibold">{p.name || t.someone}</span>
                  {p.admin && <span className="shrink-0 rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold text-white">{t.aAdminBadge}</span>}
                </span>
                <span className="block truncate text-[12.5px] text-muted">
                  {p.phone && <span dir="ltr" className="num inline-block">{pretty(p.phone)}</span>}
                  {p.shop ? ` · ${t.aShopOf} ${p.shop}` : ""} · {day(p.created_at)}
                </span>
              </span>
              <span className="shrink-0 text-end">
                <span className="num block text-[15px] font-bold">{p.cards}</span>
                <span className="block text-[11px] text-muted">{t.aCards}</span>
              </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
