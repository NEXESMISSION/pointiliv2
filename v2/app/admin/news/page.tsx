import Link from "next/link";
import { Check, ChevronRight, Plus } from "lucide-react";
import { AdminNewsActions } from "@/components/AdminNewsActions";
import { AdminNewsForm } from "@/components/AdminNewsForm";
import { NewsCard } from "@/components/NewsCard";
import { Icon3D } from "@/components/ui";
import { Card, Cell, CLink, Empty, Lat, Num, Page, Pill, Row, Stat, Stats, Table } from "@/components/console";
import { pretty } from "@/lib/phone";
import { call } from "@/lib/supabase";
import { t } from "@/lib/t";

export const metadata = { title: "الأخبار" };

type Row_ = { id: string; title: string; body: string; icon: string; cta_label: string | null; cta_href: string | null; active: boolean; published_at: string; only: boolean; audience: number; seen: number; clicked: number };
type Person = { id: string; name: string; phone: string | null; shop: string; admin: boolean; seen_at: string | null; clicked_at: string | null };
type Detail = Omit<Row_, "audience" | "seen" | "clicked"> & { people: Person[] };

const TZ = "Africa/Tunis";
const when = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: TZ }).format(new Date(iso));
const pct = (a: number, b: number) => (b ? `${Math.round((a * 100) / b)}%` : "—");

/** The news the founder sends the owners: what went out, and who saw it. */
export default async function AdminNews({ searchParams }: { searchParams: Promise<{ id?: string; new?: string }> }) {
  const sp = await searchParams;
  const id = sp.id && /^[0-9a-f-]{36}$/i.test(sp.id) ? sp.id : null;
  const making = !id && sp.new === "1";
  const [rows, one] = await Promise.all([!id && !making ? call<Row_[]>("admin_news_list") : null, id ? call<Detail>("admin_news", { p_id: id }) : null]);

  const back = (
    <Link href="/admin/news" className="inline-flex h-9 items-center gap-1 rounded-[0.625rem] border border-line bg-surface px-3 text-[0.8438rem] font-semibold text-body hover:border-brand hover:text-brand">
      <ChevronRight className="size-4" /> {t.aNews}
    </Link>
  );

  if (making)
    return (
      <Page title={t.aNewsNew} hint={t.aNewsRule} actions={back}>
        <Card className="max-w-[38rem]">
          <AdminNewsForm />
        </Card>
      </Page>
    );

  if (id) {
    if (!one) return <Page title={t.aNews} actions={back}><Empty>{t.aNothing}</Empty></Page>;
    return <Piece one={one} back={back} />;
  }

  return (
    <Page
      title={t.aNews}
      hint={t.aNewsHint}
      actions={
        <CLink kind="main" href="/admin/news?new=1">
          <Plus className="size-4" strokeWidth={2.6} /> {t.aNewsNew}
        </CLink>
      }
    >
      <Card pad={false}>
        {!rows?.length ? (
          <div className="flex flex-col items-center py-12 text-center">
            <Icon3D name="bell" size={64} />
            <p className="mt-3 text-[1rem] font-bold text-ink">{t.aNewsEmpty}</p>
            <CLink kind="main" href="/admin/news?new=1" className="mt-4">
              <Plus className="size-4" strokeWidth={2.6} /> {t.aNewsNew}
            </CLink>
          </div>
        ) : (
          <Table head={["الخبر", "الحالة", t.aNewsAudience, t.aNewsSeen, t.aNewsTaps, "تنشر"]}>
            {rows.map((n) => (
              <Row key={n.id} href={`/admin/news?id=${n.id}`}>
                <Cell>
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="grid size-10 shrink-0 place-items-center rounded-[0.625rem] bg-brand-soft">
                      <Icon3D name={n.icon} size={24} />
                    </span>
                    <span className="min-w-0">
                      <b className="block truncate font-semibold text-ink">{n.title}</b>
                      <span className="block truncate text-[0.75rem] text-muted">{n.body}</span>
                    </span>
                  </span>
                </Cell>
                <Cell n>
                  <Pill tone={n.active ? "mint" : "grey"}>{n.active ? t.aNewsLive : t.aNewsStopped}</Pill>
                </Cell>
                <Cell n>{n.audience}</Cell>
                <Cell n strong>
                  {n.seen} <span className="text-[0.75rem] font-normal text-muted">{pct(n.seen, n.audience)}</span>
                </Cell>
                <Cell n>{n.cta_href ? n.clicked : "—"}</Cell>
                <Cell n muted>
                  {when(n.published_at)}
                </Cell>
              </Row>
            ))}
          </Table>
        )}
      </Card>
    </Page>
  );
}

function Piece({ one, back }: { one: Detail; back: React.ReactNode }) {
  // the founder's own shops are listed, but left out of the numbers
  const owners = one.people.filter((p) => !p.admin);
  const seen = owners.filter((p) => p.seen_at);
  const clicked = owners.filter((p) => p.clicked_at);

  return (
    <Page title={one.title} hint={`${t.aCreated} ${when(one.published_at)}`} actions={back}>
      <div className="grid gap-4 xl:grid-cols-[22rem_1fr]">
        <div className="space-y-4">
          <Card title={t.aNewsPreview}>
            <div className="rounded-[1rem] bg-[rgb(20_16_40/0.45)] px-4 pb-4 pt-12">
              <NewsCard news={one} />
            </div>
          </Card>

          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={one.active ? "mint" : "grey"}>{one.active ? t.aNewsLive : t.aNewsStopped}</Pill>
              {one.cta_href && (
                <span className="min-w-0 truncate text-[0.75rem] text-muted">
                  → <Lat>{one.cta_href}</Lat>
                </span>
              )}
            </div>
            <AdminNewsActions id={one.id} active={one.active} />
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          <Stats cols={3}>
            <Stat label={t.aNewsAudience} value={owners.length} sub="مولى" />
            <Stat label={t.aNewsSeen} value={seen.length} sub={pct(seen.length, owners.length)} tone="brand" />
            <Stat label={t.aNewsClicked} value={one.cta_href ? clicked.length : "—"} sub={one.cta_href ? pct(clicked.length, seen.length) : "بلا بوتون"} tone="coral" />
          </Stats>

          <Card title="الموالي" hint={`${one.people.length}`} pad={false}>
            <Table head={["المحل", t.aOwner, t.phone, "شافها", ""]} words={[1]}>
              {one.people.map((p) => (
                <Row key={p.id} href={`/admin/people/${p.id}`}>
                  <Cell strong>
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate">{p.shop}</span>
                      {p.admin && <Pill tone="ink">{t.aNewsYou}</Pill>}
                    </span>
                  </Cell>
                  <Cell muted>
                    <span className="block truncate">{p.name || t.aOwner}</span>
                  </Cell>
                  <Cell n muted>
                    {p.phone ? <Num>{pretty(p.phone)}</Num> : "—"}
                  </Cell>
                  <Cell n muted>
                    {p.seen_at ? when(p.seen_at) : <span className="text-faint">{t.aNewsNotYet}</span>}
                  </Cell>
                  <Cell n>
                    {p.clicked_at && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-brand-soft px-2 py-0.5 text-[0.6875rem] font-bold text-brand">
                        <Check className="size-3" strokeWidth={3} /> {t.aNewsTapped}
                      </span>
                    )}
                  </Cell>
                </Row>
              ))}
            </Table>
            {one.people.length === 0 && <Empty>{t.aNothing}</Empty>}
          </Card>
        </div>
      </div>
    </Page>
  );
}
