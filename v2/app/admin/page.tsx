import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ShopMark } from "@/components/ShopMark";
import { Card, Cell, CLink, Empty, Num, Page, Pill, Row, Stat, Stats, Table } from "@/components/console";
import { call } from "@/lib/supabase";
import { pretty } from "@/lib/phone";
import { accountsN, liveN, pausedN, t, waitingN } from "@/lib/t";

export const metadata = { title: "الكونسول" };

type Overview = { shops: number; live: number; paused: number; customers: number; people: number; stamps: number; today: number; given: number; waiting: number; week: { day: string; stamps: number }[] };
type ShopRow = { id: string; name: string; kind: string; color: string; logo: string | null; goal: number | null; paused: boolean; created_at: string; owner: { name: string; phone: string | null }; customers: number; stamps: number; today: number; last_at: string | null };
type PersonRow = { id: string; name: string; phone: string | null; admin: boolean; created_at: string; shop: string | null; cards: number; stamps: number };

const TZ = "Africa/Tunis";
const day = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "short", timeZone: TZ }).format(new Date(iso));
const weekday = (d: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { weekday: "short", timeZone: TZ }).format(new Date(`${d}T12:00:00`));

/** The console's first page: the numbers, the week, and the newest of each kind. Nothing long — the long lists have pages of their own. */
export default async function Console() {
  const [o, shops, people] = await Promise.all([call<Overview>("admin_overview"), call<ShopRow[]>("admin_shops", { p_q: null }), call<PersonRow[]>("admin_people", { p_q: null })]);
  const week = o?.week ?? [];
  const max = Math.max(1, ...week.map((w) => w.stamps));
  const live = o?.live ?? 0;
  const paused = o?.paused ?? 0;

  return (
    <Page title={t.admin} hint="كل شي في Pointili، من هوني">
      <Stats cols={5}>
        <Stat label={t.aShops} value={o?.shops ?? 0} sub={!o?.shops ? t.aNothing : paused ? `${liveN(live)} · ${pausedN(paused)}` : t.aAllLive} />
        <Stat label={t.aCustomers} value={o?.customers ?? 0} sub={accountsN(o?.people ?? 0)} />
        <Stat label={t.aToday} value={o?.today ?? 0} sub={`${o?.stamps ?? 0} ${t.aInAll}`} tone="brand" />
        <Stat label={t.aGiven} value={o?.given ?? 0} sub={waitingN(o?.waiting ?? 0)} tone="coral" />
        <Stat label="كارطات" value={(people ?? []).reduce((n, p) => n + p.cards, 0)} sub="في الكل" />
      </Stats>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_1fr]">
        <Card title={t.aWeek} fill>
          {week.length === 0 ? (
            <Empty>{t.aNothing}</Empty>
          ) : (
            // side by side with the latest accounts, the week is as tall as they are
            <div className="flex h-[11rem] items-end gap-3 xl:h-full xl:min-h-[11rem]" dir="ltr">
              {week.map((w, i) => {
                const last = i === week.length - 1;
                return (
                  <div key={w.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5" title={`${weekday(w.day)} · ${w.stamps}`}>
                    <span className="text-[0.75rem] font-bold text-muted">
                      <Num>{w.stamps || ""}</Num>
                    </span>
                    <span className={`w-full rounded-t-[0.375rem] ${last ? "bg-brand" : "bg-brand/30"}`} style={{ height: `${Math.max(3, (w.stamps / max) * 100)}%` }} />
                    <bdi className="text-[0.75rem] text-faint">{weekday(w.day)}</bdi>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="آخر الكونتات" actions={<CLink href="/admin/people">الكل</CLink>} pad={false}>
          {(people ?? []).length === 0 ? (
            <Empty>{t.aNothing}</Empty>
          ) : (
            <Table head={["الكونت", t.aCards, t.aCreated]}>
              {(people ?? []).slice(0, 6).map((p) => (
                <Row key={p.id} href={`/admin/people/${p.id}`}>
                  <Cell>
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[linear-gradient(145deg,#ffb18a,#ff6b4a)] text-[0.8125rem] font-bold text-white">{(p.name?.[0] ?? "؟").toUpperCase()}</span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5">
                          <b className="truncate font-semibold text-ink">{p.name || t.someone}</b>
                          {p.admin && <Pill tone="ink">{t.aAdminBadge}</Pill>}
                        </span>
                        {p.phone && (
                          <span className="block text-[0.75rem] text-muted">
                            <Num>{pretty(p.phone)}</Num>
                          </span>
                        )}
                      </span>
                    </span>
                  </Cell>
                  <Cell n>{p.cards}</Cell>
                  <Cell n muted>
                    {day(p.created_at)}
                  </Cell>
                </Row>
              ))}
            </Table>
          )}
        </Card>
      </div>

      <Card
        className="mt-4"
        title={t.aShops}
        hint={`${(shops ?? []).length}`}
        pad={false}
        actions={
          <CLink href="/admin/shops">
            الكل <ArrowLeft className="size-3.5" />
          </CLink>
        }
      >
        {(shops ?? []).length === 0 ? (
          <Empty>{t.aNothing}</Empty>
        ) : (
          <Table head={["المحل", t.aCustomers, t.aToday, t.aStamps, t.aLast]}>
            {(shops ?? []).slice(0, 8).map((s) => (
              <Row key={s.id} href={`/admin/shops/${s.id}`}>
                <Cell>
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-[0.625rem]" style={{ background: s.color }}>
                      <ShopMark shop={s} size={22} />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <b className="truncate font-semibold text-ink">{s.name}</b>
                        {s.paused && <Pill tone="coral">{t.aPaused}</Pill>}
                        {!s.goal && <Pill>{t.aNoCard}</Pill>}
                      </span>
                      <span className="block truncate text-[0.75rem] text-muted">
                        {s.owner.name || t.aOwner}
                        {s.owner.phone && <> · <Num>{pretty(s.owner.phone)}</Num></>}
                      </span>
                    </span>
                  </span>
                </Cell>
                <Cell n strong>
                  {s.customers}
                </Cell>
                <Cell n>{s.today}</Cell>
                <Cell n>{s.stamps}</Cell>
                <Cell n muted>
                  {s.last_at ? day(s.last_at) : "—"}
                </Cell>
              </Row>
            ))}
          </Table>
        )}
      </Card>

      <p className="mt-4 text-[0.8125rem] text-faint">
        <Link href="/admin/traffic" className="font-semibold text-brand hover:underline">
          الترافيك
        </Link>{" "}
        يقولك منين جاو، وشنوّة عملو قبل ما يسجّلو.
      </p>
    </Page>
  );
}
