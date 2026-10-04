import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { AdminNewsActions } from "@/components/AdminNewsActions";
import { AdminNewsForm } from "@/components/AdminNewsForm";
import { NewsCard } from "@/components/NewsCard";
import { Icon3D } from "@/components/ui";
import { pretty } from "@/lib/phone";
import { getMe } from "@/lib/session";
import { call } from "@/lib/supabase";
import { t } from "@/lib/t";

export const metadata = { title: "الأخبار", robots: { index: false } };

type Row = { id: string; title: string; body: string; icon: string; cta_label: string | null; cta_href: string | null; active: boolean; published_at: string; only: boolean; audience: number; seen: number; clicked: number };
type Person = { id: string; name: string; phone: string | null; shop: string; admin: boolean; seen_at: string | null; clicked_at: string | null };
type Detail = Omit<Row, "audience" | "seen" | "clicked"> & { people: Person[] };

const when = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Africa/Tunis" }).format(new Date(iso));
const pct = (a: number, b: number) => (b ? `${Math.round((a * 100) / b)}%` : "—");

/**
 * The founder's news for the owners: every piece published, with how many of
 * the owners it was for have seen it and tapped its button — a new one
 * written with its card shown live — and any one piece, owner by owner: who
 * saw it (and when), who tapped, who not yet.
 */
export default async function AdminNews({ searchParams }: { searchParams: Promise<{ id?: string; new?: string }> }) {
  const [me, sp] = await Promise.all([getMe(), searchParams]);
  if (!me) redirect("/login?next=/admin/news");
  if (!me.admin) redirect("/");
  const id = sp.id && /^[0-9a-f-]{36}$/i.test(sp.id) ? sp.id : null;
  const making = !id && sp.new === "1";
  const [rows, one] = await Promise.all([!id && !making ? call<Row[]>("admin_news_list") : null, id ? call<Detail>("admin_news", { p_id: id }) : null]);

  return (
    <main className="safe-t safe-b mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden px-[clamp(1rem,5vw,1.5rem)] md:max-w-xl">
      <header className="flex shrink-0 items-center gap-2.5 pt-2">
        <Link href={id || making ? "/admin/news" : "/admin"} className="press grid size-11 shrink-0 place-items-center rounded-full bg-surface shadow-card" aria-label="back">
          <ChevronRight className="size-5" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-[1.5rem] font-bold">{making ? t.aNewsNew : t.aNews}</h1>
        {!id && !making && (
          <Link href="/admin/news?new=1" className="press flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-brand px-3.5 text-[0.875rem] font-bold text-white shadow-[0_10px_22px_-12px_rgb(108_71_255/0.8)]">
            <Plus className="size-4" strokeWidth={2.6} /> {t.aNewsNew}
          </Link>
        )}
      </header>

      <section className="-mx-1 mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-4">
        {making ? <AdminNewsForm /> : id ? one ? <Piece one={one} /> : <p className="mt-6 text-center text-[0.9375rem] text-muted">{t.aNothing}</p> : <List rows={rows ?? []} />}
      </section>
    </main>
  );
}

function List({ rows }: { rows: Row[] }) {
  return (
    <>
      <p className="px-0.5 text-[0.875rem] leading-relaxed text-muted">{t.aNewsHint}</p>
      {rows.length === 0 ? (
        <div className="mt-8 flex flex-col items-center text-center">
          <Icon3D name="bell" size={72} className="animate-float" />
          <p className="mt-3 text-[1rem] font-bold">{t.aNewsEmpty}</p>
          <Link href="/admin/news?new=1" className="press mt-4 inline-flex h-11 items-center gap-1.5 rounded-full bg-brand px-5 text-[0.9375rem] font-bold text-white">
            <Plus className="size-4" strokeWidth={2.6} /> {t.aNewsNew}
          </Link>
        </div>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {rows.map((n) => (
            <li key={n.id}>
              <Link href={`/admin/news?id=${n.id}`} className="press flex items-center gap-3 rounded-[1.25rem] bg-surface p-3 shadow-card">
                <span className="grid size-12 shrink-0 place-items-center rounded-[1rem] bg-brand-soft">
                  <Icon3D name={n.icon} size={30} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <b className="min-w-0 truncate text-[0.9688rem]">{n.title}</b>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] font-bold ${n.active ? "bg-mint-soft text-mint" : "bg-line text-muted"}`}>{n.active ? t.aNewsLive : t.aNewsStopped}</span>
                  </span>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-line">
                    <span className="block h-full rounded-full bg-brand" style={{ width: n.audience ? `${(n.seen / n.audience) * 100}%` : "0%" }} />
                  </span>
                  <span className="mt-1 block truncate text-[0.75rem] text-muted tabular-nums">
                    {when(n.published_at)} · {t.aNewsSeen} {n.seen}/{n.audience}
                    {n.cta_href ? ` · ${t.aNewsTaps} ${n.clicked}` : ""}
                  </span>
                </span>
                <ChevronLeft className="size-4 shrink-0 text-faint" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Piece({ one }: { one: Detail }) {
  // the founder's own shops are listed, but left out of the numbers
  const owners = one.people.filter((p) => !p.admin);
  const seen = owners.filter((p) => p.seen_at);
  const clicked = owners.filter((p) => p.clicked_at);
  const saw = one.people.filter((p) => p.seen_at);
  const notYet = one.people.filter((p) => !p.seen_at);
  const tiles = [
    { label: t.aNewsAudience, value: String(owners.length), sub: when(one.published_at) },
    { label: t.aNewsSeen, value: String(seen.length), sub: pct(seen.length, owners.length) },
    ...(one.cta_href ? [{ label: t.aNewsClicked, value: String(clicked.length), sub: pct(clicked.length, seen.length) }] : []),
  ];

  return (
    <>
      <div className="rounded-[1.5rem] bg-[rgb(20_16_40/0.45)] px-5 pb-5 pt-14">
        <NewsCard news={one} />
      </div>

      <div className={`mt-3 grid gap-2 ${tiles.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {tiles.map((x) => (
          <div key={x.label} className="rounded-[1.125rem] bg-surface px-3 py-2.5 shadow-card">
            <span className="num block text-[1.375rem] font-bold leading-none">{x.value}</span>
            <span className="mt-1 block truncate text-[0.75rem] font-semibold">{x.label}</span>
            <span className="block truncate text-[0.6875rem] text-muted tabular-nums">{x.sub}</span>
          </div>
        ))}
      </div>

      <p className="mt-3 flex items-center gap-2 px-0.5 text-[0.8125rem] text-muted">
        <span className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-bold ${one.active ? "bg-mint-soft text-mint" : "bg-line text-muted"}`}>{one.active ? t.aNewsLive : t.aNewsStopped}</span>
        {one.cta_href && (
          <span dir="ltr" className="min-w-0 truncate">
            → {one.cta_href}
          </span>
        )}
      </p>
      <AdminNewsActions id={one.id} active={one.active} />

      <People title={t.aNewsSeen} people={saw} seen />
      <People title={t.aNewsNotYet} people={notYet} />
    </>
  );
}

function People({ title, people, seen = false }: { title: string; people: Person[]; seen?: boolean }) {
  return (
    <section className="mt-4">
      <h2 className="mb-1.5 px-0.5 text-[0.9375rem] font-bold">
        {title} <span className="num text-[0.8125rem] font-semibold text-muted">{people.filter((p) => !p.admin).length}</span>
      </h2>
      {people.length === 0 ? (
        <p className="rounded-[1.125rem] bg-surface px-4 py-3 text-[0.875rem] text-muted shadow-card">{t.aNothing}</p>
      ) : (
        <ul className="divide-y divide-line rounded-[1.25rem] bg-surface shadow-card">
          {people.map((p) => (
            <li key={p.id}>
              <Link href={`/admin/people/${p.id}`} className="flex items-center gap-2.5 px-3.5 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <b className="min-w-0 truncate text-[0.9062rem]">{p.shop}</b>
                    {p.admin && <span className="shrink-0 rounded-full bg-ink px-1.5 py-0.5 text-[0.625rem] font-bold text-white">{t.aNewsYou}</span>}
                  </span>
                  <span className="block truncate text-[0.75rem] text-muted">
                    {p.name || t.aOwner}
                    {p.phone && (
                      <>
                        {" · "}
                        <span dir="ltr" className="num">
                          {pretty(p.phone)}
                        </span>
                      </>
                    )}
                  </span>
                </span>
                {seen && p.seen_at && <span className="shrink-0 text-[0.75rem] text-muted tabular-nums">{when(p.seen_at)}</span>}
                {p.clicked_at && (
                  <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-brand-soft px-2 py-0.5 text-[0.6875rem] font-bold text-brand">
                    <Check className="size-3" strokeWidth={3} /> {t.aNewsTapped}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
