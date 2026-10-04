import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, Megaphone, Search, Settings2 } from "lucide-react";
import { ShopMark } from "@/components/ShopMark";
import { Icon3D, Logo, Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { call } from "@/lib/supabase";
import { pretty } from "@/lib/phone";
import { accountsN, liveN, pausedN, stampsN, t, waitingN } from "@/lib/t";

export const metadata = { title: "الأدمين", robots: { index: false } };

type Overview = { shops: number; live: number; paused: number; customers: number; people: number; stamps: number; today: number; given: number; waiting: number; week: { day: string; stamps: number }[] };
type ShopRow = { id: string; name: string; kind: string; color: string; logo: string | null; goal: number | null; paused: boolean; created_at: string; owner: { name: string; phone: string | null }; customers: number; stamps: number; today: number; last_at: string | null };
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
    <Screen>
      <header className="flex shrink-0 items-center justify-between pt-2">
        <Link href="/me" className="press grid size-11 place-items-center rounded-full bg-ink text-[0.9375rem] font-bold text-white shadow-card" aria-label={t.account}>
          {(me.name?.[0] ?? "A").toUpperCase()}
        </Link>
        <Logo />
      </header>
      <div className="mt-[1.8dvh] flex shrink-0 items-center justify-between gap-2">
        <h1 className="text-[1.75rem] font-bold leading-tight">{t.admin}</h1>
        <nav className="flex gap-1.5">
          <Link href="/admin/traffic" className="press flex h-10 items-center gap-1.5 rounded-full bg-brand px-3.5 text-[0.875rem] font-bold text-white shadow-[0_10px_22px_-12px_rgb(108_71_255/0.8)]">
            <BarChart3 className="size-4" /> {t.aTraffic}
          </Link>
          <Link href="/admin/news" className="press grid size-10 place-items-center rounded-full bg-surface shadow-card" aria-label={t.aNews}>
            <Megaphone className="size-[1.125rem]" />
          </Link>
          <Link href="/admin/settings" className="press grid size-10 place-items-center rounded-full bg-surface shadow-card" aria-label={t.aSettings}>
            <Settings2 className="size-[1.125rem]" />
          </Link>
        </nav>
      </div>

      {/* the four numbers, two by two, each one line high */}
      <div className="mt-[1.6dvh] grid shrink-0 grid-cols-2 gap-2">
        {tiles.map((x) => (
          <div key={x.label} className="flex items-center gap-2.5 rounded-[1.125rem] bg-surface px-3 py-2.5 shadow-card">
            <Icon3D name={x.icon} size={28} className="shrink-0" />
            <span className="min-w-0">
              <span className="flex items-baseline gap-1.5">
                <span className="num text-[1.375rem] font-bold leading-none">{x.value}</span>
                <span className="truncate text-[0.8125rem] font-semibold">{x.label}</span>
              </span>
              <span className="mt-0.5 block truncate text-[0.7188rem] text-muted">{x.sub}</span>
            </span>
          </div>
        ))}
      </div>

      {o && (
        <section className="mt-[1.6dvh] shrink-0 rounded-[1.25rem] bg-surface px-3.5 py-3 shadow-card">
          <h2 className="text-[0.9375rem] font-bold">{t.aWeek}</h2>
          <div className="mt-2 flex h-[5.25rem] items-end gap-2" dir="ltr">
            {o.week.map((w, i) => {
              const last = i === o.week.length - 1;
              return (
                <div key={w.day} className="flex flex-1 flex-col items-center gap-1" title={`${weekday(w.day)} · ${w.stamps}`}>
                  {(last || w.stamps === max) && w.stamps > 0 && <span className="num text-[0.6875rem] font-semibold text-muted">{w.stamps}</span>}
                  <span className={`w-full rounded-t-[0.25rem] ${last ? "bg-brand" : "bg-brand/35"}`} style={{ height: `${Math.max(0.25, (w.stamps / max) * 3.4)}rem` }} />
                  <span className="text-[0.6562rem] text-faint">{weekday(w.day)}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="mt-[1.8dvh] flex shrink-0 gap-1 rounded-[1.125rem] bg-ink/[0.06] p-1">
        {[
          { id: "shops", label: t.aShops },
          { id: "people", label: t.aPeople },
        ].map((x) => (
          <Link key={x.id} href={`/admin?tab=${x.id}`} className={`flex h-10 flex-1 items-center justify-center rounded-[0.875rem] text-[0.9375rem] font-semibold ${tab === x.id ? "bg-surface text-ink shadow-card" : "text-muted"}`}>
            {x.label}
          </Link>
        ))}
      </div>

      <form action="/admin" className="relative mt-2 shrink-0">
        <input type="hidden" name="tab" value={tab} />
        <Search className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-faint" />
        <input name="q" defaultValue={q} placeholder={t.aSearch} className="h-11 w-full rounded-[16px] bg-surface ps-11 pe-4 shadow-card outline-none placeholder:text-faint focus:shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-brand)]" />
      </form>

      {!people && (
        <ul className="mb-[2dvh] mt-2 min-h-0 divide-y divide-line overflow-y-auto overscroll-contain rounded-[1.375rem] bg-surface shadow-card">
          {(shops ?? []).length === 0 && <li className="p-4 text-center text-[0.9375rem] text-muted">{t.aNothing}</li>}
          {(shops ?? []).map((s) => (
            <li key={s.id}>
              <Link href={`/admin/shops/${s.id}`} className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-canvas/60">
                <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-[0.875rem]" style={{ background: s.color }}>
                  <ShopMark shop={s} size={28} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[0.9688rem] font-semibold">{s.name}</span>
                    {s.paused && <span className="shrink-0 rounded-full bg-coral-soft px-2 py-0.5 text-[0.6875rem] font-bold text-coral">{t.aPaused}</span>}
                    {!s.goal && <span className="shrink-0 rounded-full bg-line px-2 py-0.5 text-[0.6875rem] font-bold text-muted">{t.aNoCard}</span>}
                  </span>
                  <span className="block truncate text-[0.7812rem] text-muted">
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
                  <span className="num block text-[0.9375rem] font-bold">{s.customers}</span>
                  <span className="block text-[0.6875rem] text-muted">{t.aCustomers}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {people && (
        <ul className="mb-[2dvh] mt-2 min-h-0 divide-y divide-line overflow-y-auto overscroll-contain rounded-[1.375rem] bg-surface shadow-card">
          {(persons ?? []).length === 0 && <li className="p-4 text-center text-[0.9375rem] text-muted">{t.aNothing}</li>}
          {(persons ?? []).map((p) => (
            <li key={p.id}>
              <Link href={`/admin/people/${p.id}`} className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-canvas/60">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[linear-gradient(145deg,#ffb18a,#ff6b4a)] text-[1rem] font-bold text-white">{(p.name?.[0] ?? "؟").toUpperCase()}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[0.9688rem] font-semibold">{p.name || t.someone}</span>
                  {p.admin && <span className="shrink-0 rounded-full bg-ink px-2 py-0.5 text-[0.6875rem] font-bold text-white">{t.aAdminBadge}</span>}
                </span>
                <span className="block truncate text-[0.7812rem] text-muted">
                  {p.phone && <span dir="ltr" className="num inline-block">{pretty(p.phone)}</span>}
                  {p.shop ? ` · ${t.aShopOf} ${p.shop}` : ""} · {day(p.created_at)}
                </span>
              </span>
              <span className="shrink-0 text-end">
                <span className="num block text-[0.9375rem] font-bold">{p.cards}</span>
                <span className="block text-[0.6875rem] text-muted">{t.aCards}</span>
              </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
