import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Gift, Phone } from "lucide-react";
import { AdminPlan } from "@/components/AdminPlan";
import { AdminShopActions } from "@/components/AdminShopActions";
import { AdminShopEdit } from "@/components/AdminShopEdit";
import { Ago } from "@/components/Ago";
import { ShopMark } from "@/components/ShopMark";
import { Card, Cell, Empty, Lat, Num, Page, Pill, Row, Stat, Stats, Table, When } from "@/components/console";
import { call } from "@/lib/supabase";
import { digits, pretty } from "@/lib/phone";
import { fill, monthsSaid, stampsN, t } from "@/lib/t";

export const metadata = { title: "محل" };

type Shop = {
  id: string; name: string; kind: string; color: string; logo: string | null; goal: number | null; gift: string | null; paused: boolean; created_at: string;
  owner: { id: string; name: string; phone: string | null; tester: boolean; admin: boolean } | null;
  seen: {
    created_at: string; first_at: string | null; last_at: string | null; n: number; ms: number;
    visits: { id: string; at: string; end_at: string; ms: number; pages: number; device: string | null; os: string | null; browser: string | null; city: string | null; country: string | null; source: string }[];
  } | null;
  stamp_gap: number;
  plan: {
    paid_until: string | null; paid: boolean; offer_until: string | null; offer: boolean;
    log: { id: number; kind: "paid" | "until" | "end"; months: number | null; until: string | null; note: string | null; method: string | null; amount: number | null; shown: boolean; seen: string | null; at: string }[];
    payments: { id: string; method: string; months: number; status: "pending" | "paid" | "refused"; at: string }[];
  };
  customers: number; stamps: number; today: number; given: number; waiting: number;
  recent: { at: string; kind: "stamp" | "gift"; given: boolean; name: string | null; phone: string | null }[];
  top: { name: string | null; phone: string | null; stamps: number; gifts: number; goal: number | null }[];
};

const TZ = "Africa/Tunis";
const when = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: TZ }).format(new Date(iso));
const day = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "long", year: "numeric", timeZone: TZ }).format(new Date(iso));
/** To the second: «6 أكتوبر 2026، 19:06:altogether» — for the moment an account was opened. */
const exact = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23", timeZone: TZ }).format(new Date(iso));
/** 45ث · 2د 10ث · 1س 5د — how long they actually stayed. */
function dur(ms: number): string {
  const sec = Math.round((ms || 0) / 1000);
  if (sec < 60) return `${sec}ث`;
  const m = Math.floor(sec / 60);
  if (m < 60) return sec % 60 ? `${m}د ${sec % 60}ث` : `${m}د`;
  return `${Math.floor(m / 60)}س ${m % 60}د`;
}
/** A line made of Arabic and Latin pieces: each Latin one sealed, so they keep their order. */
const Parts = ({ of }: { of: (string | null | undefined)[] }) => {
  const xs = (of.filter(Boolean) as string[]).filter((x) => x !== "?");
  if (!xs.length) return <span className="text-faint">—</span>;
  return (
    <>
      {xs.map((x, i) => (
        <span key={i}>
          {i > 0 && " · "}
          {/^[؀-ۿ]/.test(x) ? x : <Lat>{x}</Lat>}
        </span>
      ))}
    </>
  );
};
const DEVICES: Record<string, string> = { phone: "تليفون", tablet: "تابلات", computer: "PC" };
const SOURCES: Record<string, string> = { facebook: "فيسبوك", instagram: "إنستغرام", google: "Google", tiktok: "تيك توك", whatsapp: "واتساب", direct: "مباشر" };

/** One shop: who owns it on the side, how it is doing in the middle. */
export default async function AdminShop({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const s = await call<Shop | null>("admin_shop", { p_id: id });
  if (!s) notFound();

  return (
    <Page
      title={s.name}
      hint={s.goal ? `${stampsN(s.goal)} ← ${s.gift}` : t.aNoCard}
      actions={
        <Link href="/admin/shops" className="inline-flex h-9 items-center gap-1 rounded-[0.625rem] border border-line bg-surface px-3 text-[0.8438rem] font-semibold text-body hover:border-brand hover:text-brand">
          <ChevronRight className="size-4" /> {t.aShops}
        </Link>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[18rem_1fr]">
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-3">
              <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-[0.875rem]" style={{ background: s.color }}>
                <ShopMark shop={s} size={34} />
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5">
                  <b className="truncate text-[1.0625rem] text-ink">{s.name}</b>
                  {s.paused && <Pill tone="coral">{t.aPaused}</Pill>}
                  {(s.owner?.tester || s.owner?.admin) && <Pill>{t.aTestBadge}</Pill>}
                </p>
                <p className="truncate text-[0.8125rem] text-muted">{t.kinds[s.kind as keyof typeof t.kinds] ?? s.kind}</p>
              </div>
            </div>
            <dl className="mt-4 space-y-2 border-t border-line pt-3 text-[0.8438rem]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">{t.aCreated}</dt>
                <dd className="text-end font-semibold text-body">
                  <Ago at={s.created_at} />
                  <span className="block text-[0.75rem] font-normal text-muted">
                    <When>{when(s.created_at)}</When>
                  </span>
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">الكارط</dt>
                <dd className="min-w-0 text-end font-semibold text-body">{s.goal ? <>{s.gift} ← <Num>{s.goal}</Num></> : t.aNoCard}</dd>
              </div>
            </dl>
          </Card>

          <Card title={t.aOwner}>
            <p className="truncate text-[0.9375rem] font-bold text-ink">{s.owner?.name || t.someone}</p>
            {s.owner?.phone ? (
              <>
                <p className="mt-0.5 text-[0.875rem] text-body">
                  <Num>{pretty(s.owner.phone)}</Num>
                </p>
                <a href={`tel:+216${digits(s.owner.phone)}`} className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-[0.625rem] bg-brand-soft px-3.5 text-[0.8438rem] font-bold text-brand hover:bg-brand hover:text-white">
                  <Phone className="size-4" /> {t.aCall}
                </a>
              </>
            ) : (
              <p className="mt-1 text-[0.8125rem] text-faint">بلا نومرو</p>
            )}
                {s.seen && (
                  <dl className="mt-4 space-y-2 border-t border-line pt-3 text-[0.8125rem]">
                    <div className="flex justify-between gap-3">
                      <dt className="shrink-0 text-muted">{t.aSignedUp}</dt>
                      <dd className="text-end font-semibold text-body">
                        <Ago at={s.seen.created_at} />
                        <span className="block text-[0.75rem] font-normal text-muted">
                          <When>{exact(s.seen.created_at)}</When>
                        </span>
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="shrink-0 text-muted">{t.aLastSeen}</dt>
                      <dd className="text-end font-semibold text-body">
                        {s.seen.last_at ? (
                          <>
                            <Ago at={s.seen.last_at} />
                            <span className="block text-[0.75rem] font-normal text-muted">
                              <When>{when(s.seen.last_at)}</When>
                            </span>
                          </>
                        ) : (
                          <span className="text-faint">{t.never}</span>
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="shrink-0 text-muted">{t.aVisits}</dt>
                      <dd className="text-end font-semibold text-body">
                        <When>{s.seen.n}</When>
                        {s.seen.ms > 0 && <span className="text-muted"> · <When>{dur(s.seen.ms)}</When></span>}
                      </dd>
                    </div>
                  </dl>
                )}
          </Card>

          <AdminShopEdit shop={{ id: s.id, name: s.name, kind: s.kind, goal: s.goal, gift: s.gift, stamp_gap: s.stamp_gap }} />
          <AdminShopActions id={s.id} paused={s.paused} owner={s.owner ? { id: s.owner.id, tester: s.owner.tester, admin: s.owner.admin } : null} />
        </div>

        <div className="min-w-0 space-y-4">
          {/* the shop's year: where it stands, the founder's hand on it, and its story */}
          <Card
            title={t.aPlan}
            actions={
              s.plan.paid && s.plan.paid_until ? (
                <Pill tone="mint">{fill(t.aPlanPaidUntil, { date: day(s.plan.paid_until) })}</Pill>
              ) : s.plan.offer && s.plan.offer_until ? (
                <Pill tone="brand">{fill(t.aPlanOffer, { date: when(s.plan.offer_until) })}</Pill>
              ) : (
                <Pill tone="coral">{t.aPlanNone}</Pill>
              )
            }
          >
            <AdminPlan shopId={s.id} paidUntil={s.plan.paid_until} paid={s.plan.paid} />
            {(s.plan.log.length > 0 || s.plan.payments.some((y) => y.status === "pending")) && (
              <div className="mt-4 border-t border-line pt-3">
                <p className="mb-2 text-[0.8438rem] font-bold text-muted">{t.aPlanHistory}</p>
                <ul className="space-y-1.5 text-[0.875rem]">
                  {s.plan.payments
                    .filter((y) => y.status === "pending")
                    .map((y) => (
                      <li key={y.id} className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-brand">
                          {t.aPlanAsked} · {monthsSaid(y.months)}
                        </span>
                        <span className="text-[0.8125rem] text-muted">{when(y.at)}</span>
                      </li>
                    ))}
                  {s.plan.log.map((l) => (
                    <li key={l.id} className="flex items-center justify-between gap-3">
                      <span className="min-w-0">
                        <span className="font-semibold text-body">
                          {l.kind === "end"
                            ? t.aPlanLogEnd
                            : l.kind === "until"
                              ? fill(t.aPlanLogUntil, { date: day(l.until ?? l.at) })
                              : fill(t.aPlanLogPaid, { d: monthsSaid(l.months ?? 0) })}
                          {l.amount !== null && <span className="font-normal text-muted"> · {l.amount === 0 ? t.aPlanExtra : `${l.amount} ${t.payCurrency}`}</span>}
                          {l.method && <span className="font-normal text-muted"> · {l.method === "cash" ? t.aPlanCash : l.method === "d17" ? "D17" : l.method.charAt(0).toUpperCase() + l.method.slice(1)}</span>}
                        </span>
                        {l.note && <span className="block truncate text-[0.8125rem] text-muted">«{l.note}»</span>}
                      </span>
                      <span className="flex shrink-0 items-center gap-2 text-[0.8125rem] text-muted">
                        {l.shown && <Pill tone={l.seen ? "mint" : "grey"}>{l.seen ? t.aPlanSeen : t.aPlanNotSeen}</Pill>}
                        {when(l.at)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Stats cols={5}>
            <Stat label={t.aCustomers} value={s.customers} />
            <Stat label={t.aToday} value={s.today} tone="brand" />
            <Stat label={t.aStamps} value={s.stamps} />
            <Stat label={t.aGiven} value={s.given} tone="coral" />
            <Stat label="كادو يستنّى" value={s.waiting} />
          </Stats>

          {s.seen && (
            <Card title={t.aVisitsTitle} hint={t.aVisitsHint} pad={false}>
              {!s.seen.visits.length ? (
                <Empty>{t.aNoVisits}</Empty>
              ) : (
                <Table head={[t.aVisitWhen, t.aVisitStayed, t.aVisitPages, t.aVisitPhone, t.aVisitPlace, t.aVisitFrom]} words={[3, 4, 5]}>
                  {s.seen.visits.map((v) => (
                    <Row key={v.id}>
                      <Cell strong>
                        <Ago at={v.at} />
                        <span className="block text-[0.75rem] font-normal text-muted">
                          <When>{when(v.at)}</When>
                        </span>
                      </Cell>
                      <Cell n strong>
                        {v.ms > 0 ? dur(v.ms) : "—"}
                      </Cell>
                      <Cell n muted>
                        {v.pages}
                      </Cell>
                      <Cell muted>
                        <Parts of={[DEVICES[v.device ?? ""] ?? v.device, v.browser]} />
                      </Cell>
                      <Cell muted>
                        <Parts of={[v.city, v.country]} />
                      </Cell>
                      <Cell muted>
                        <Parts of={[SOURCES[v.source] ?? v.source]} />
                      </Cell>
                    </Row>
                  ))}
                </Table>
              )}
            </Card>
          )}


          <div className="grid gap-4 2xl:grid-cols-2">
            <Card title={t.aTop} pad={false}>
              {s.top.length === 0 ? (
                <Empty>{t.aNothing}</Empty>
              ) : (
                <Table head={["الحريف", "كادو", "تامبون"]}>
                  {s.top.map((c, i) => (
                    <Row key={i}>
                      <Cell strong>
                        <span className="block truncate">{c.name ?? t.someone}</span>
                        {c.phone && (
                          <span className="block text-[0.75rem] font-normal text-muted">
                            {/* the RPC hands back only the tail of a customer's number */}
                            <Num>{c.phone}</Num>
                          </span>
                        )}
                      </Cell>
                      <Cell n>{c.gifts > 0 ? <span className="inline-flex items-center gap-1 font-bold text-coral"><Gift className="size-3.5" />{c.gifts}</span> : "—"}</Cell>
                      <Cell n strong>
                        {(c.goal ?? s.goal) ? `${Math.min(c.stamps, c.goal ?? s.goal ?? 0)}/${c.goal ?? s.goal}` : c.stamps}
                      </Cell>
                    </Row>
                  ))}
                </Table>
              )}
            </Card>

            <Card title={t.aRecent} pad={false}>
              {s.recent.length === 0 ? (
                <Empty>{t.aNothing}</Empty>
              ) : (
                <Table head={["شنوّة", "شكون", "وقتاش"]} words={[1]}>
                  {s.recent.map((r, i) => (
                    <Row key={i}>
                      <Cell>
                        <Pill tone={r.kind === "stamp" ? "brand" : "coral"}>{r.kind === "stamp" ? <><Num>+1</Num> تامبون</> : "كادو"}</Pill>
                      </Cell>
                      <Cell muted>
                        <span className="block truncate">{r.name ?? (r.phone ? <Num>{r.phone}</Num> : t.someone)}</span>
                      </Cell>
                      <Cell n muted>
                        <Ago at={r.at} className="font-semibold text-body" />
                        <span className="block text-[0.75rem]">
                          <When>{when(r.at)}</When>
                        </span>
                      </Cell>
                    </Row>
                  ))}
                </Table>
              )}
            </Card>
          </div>
        </div>
      </div>
    </Page>
  );
}
