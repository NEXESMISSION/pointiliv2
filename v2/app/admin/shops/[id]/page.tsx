import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Gift, MessageCircle, Phone } from "lucide-react";
import { AdminPlan } from "@/components/AdminPlan";
import { AdminTrial } from "@/components/AdminTrial";
import { AdminShopActions } from "@/components/AdminShopActions";
import { AdminPhoneCheck } from "@/components/AdminPhoneCheck";
import { AdminShopEdit } from "@/components/AdminShopEdit";
import { AdminItemsSwitch } from "@/components/AdminItemsSwitch";
import { AdminStoreSwitch } from "@/components/AdminStoreSwitch";
import { AdminWheelSwitch } from "@/components/AdminWheelSwitch";
import { Ago } from "@/components/Ago";
import { Presence } from "@/components/Presence";
import { ShopMark } from "@/components/ShopMark";
import { Card, Cell, Empty, Lat, Num, Page, Pill, Row, Stat, Stats, Table, When } from "@/components/console";
import { screenName } from "@/lib/screens";
import { call } from "@/lib/supabase";
import { digits, pretty } from "@/lib/phone";
import { fill, monthsSaid, stampsN, t } from "@/lib/t";

export const metadata = { title: "محل" };

type Shop = {
  id: string; name: string; kind: string; color: string; logo: string | null; goal: number | null; gift: string | null; paused: boolean; created_at: string;
  owner: {
    id: string; name: string; phone: string | null; tester: boolean; admin: boolean;
    phone_check: "ask" | "sent" | null; phone_given: string | null; phone_given_at: string | null; phone_ok_at: string | null;
  } | null;
  seen: {
    created_at: string; first_at: string | null; last_at: string | null; n: number; ms: number;
    visits: { id: string; at: string; end_at: string; ms: number; pages: number; device: string | null; os: string | null; browser: string | null; city: string | null; country: string | null; source: string; path: { route: string; screen: string | null; ms: number }[] }[];
  } | null;
  stamp_gap: number; stamp_logo: boolean; items_on: boolean;
  held: { id: string; at: string; until: string; state: "waiting" | "lost" | "done" | "back"; name: string | null; item: string | null }[];
  store_on: boolean;
  trial_until: string;
  trial_over: boolean;
  wheel_on: boolean;
  wheel: { id: number; name: string; chance: number }[];
  wheel_fell: { name: string; n: number }[];
  store: { id: number; name: string; cost: number }[];
  orders: { at: string; name: string; qty: number; cost: number; status: "waiting" | "given" | "cancelled"; who: string | null }[];
  items: { id: number; name: string; gone: boolean; at: string; n: number; n30: number; last_at: string | null }[];
  devices: { id: string; since: string; last_at: string | null; device: string | null; os: string | null; browser: string | null; city: string | null; app: boolean | null; here: boolean | null }[];
  plan: {
    paid_until: string | null; paid: boolean; offer_until: string | null; offer: boolean;
    log: { id: number; kind: "paid" | "until" | "end" | "trial"; months: number | null; until: string | null; note: string | null; method: string | null; amount: number | null; shown: boolean; seen: string | null; at: string }[];
    payments: { id: string; method: string; months: number; status: "pending" | "paid" | "refused"; at: string }[];
  };
  customers: number; stamps: number; today: number; given: number; waiting: number;
  recent: { at: string; kind: "stamp" | "gift"; given: boolean; name: string | null; phone: string | null; item: string | null }[];
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

/** a scan by a phone without an account, by how it ended */
const HELD: Record<string, { tone: "brand" | "coral" | "mint" | "grey"; say: string }> = {
  waiting: { tone: "brand", say: "بلا كونت · يستنّى" },
  lost: { tone: "coral", say: "بلا كونت · ضاع" },
  done: { tone: "mint", say: "عمل كونت وخذاه" },
  back: { tone: "mint", say: "رجّعهولو بيدو" },
};

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
              <div className="flex justify-between gap-3">
                <dt className="text-muted">شكل التامبون</dt>
                <dd className="text-end font-semibold text-body">{s.stamp_logo && s.logo ? "اللوغو متاعو" : "عادي"}</dd>
              </div>
            </dl>
          </Card>

          <Card title={t.aOwner}>
            <p className="truncate text-[0.9375rem] font-bold text-ink">{s.owner?.name || t.someone}</p>
            {/* on the site right now? live, every 15 seconds */}
            <Presence user={s.owner?.id} className="mt-0.5" />
            {s.owner?.phone ? (
              <>
                <p className="mt-0.5 text-[0.875rem] text-body">
                  <Num>{pretty(s.owner.phone)}</Num>
                </p>
                <span className="mt-3 flex flex-wrap gap-2">
                  <a href={`tel:+216${digits(s.owner.phone)}`} className="inline-flex h-9 items-center gap-1.5 rounded-[0.625rem] bg-brand px-3.5 text-[0.8438rem] font-bold text-white hover:bg-brand-deep">
                    <Phone className="size-4" /> {t.aCall}
                  </a>
                  <a href={`https://wa.me/216${digits(s.owner.phone)}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-[0.625rem] bg-[#25D366] px-3.5 text-[0.8438rem] font-bold text-white hover:opacity-90">
                    <MessageCircle className="size-4" /> واتساب
                  </a>
                </span>
              </>
            ) : (
              <p className="mt-1 text-[0.8125rem] text-faint">بلا نومرو</p>
            )}
            {/* a number that looks made up: ask for the real one (it covers the owner's screens until given) */}
            {s.owner && !s.owner.admin && (
              <AdminPhoneCheck id={s.owner.id} state={s.owner.phone_check} given={s.owner.phone_given} givenAt={s.owner.phone_given_at} okAt={s.owner.phone_ok_at} />
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

          {/* every phone the owner is signed in on now: one sign-in each, a sign-out ends it */}
          <Card title="التليفونات المحلولة" actions={<Pill tone={s.devices.length > 1 ? "brand" : "grey"}><Num>{s.devices.length}</Num></Pill>}>
            {!s.devices.length ? (
              <p className="text-[0.8125rem] text-faint">موش محلول على حتى تليفون توّا</p>
            ) : (
              <ul className="space-y-2.5 text-[0.8438rem]">
                {s.devices.map((d) => (
                  <li key={d.id} className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 font-semibold text-body">
                        {d.here && <span className="size-2 shrink-0 rounded-full bg-mint" aria-label="متّصل توّا" />}
                        {d.device || d.os || d.browser ? <Parts of={[DEVICES[d.device ?? ""] ?? d.device, d.os, d.app ? "التطبيق" : d.browser]} /> : <span className="text-muted">ما نعرفوش (تحلّ قبل)</span>}
                      </span>
                      <span className="block text-[0.75rem] text-muted">
                        {d.city && <>{/^[؀-ۿ]/.test(d.city) ? d.city : <Lat>{d.city}</Lat>} · </>}
                        محلول من <When>{when(d.since)}</When>
                      </span>
                    </span>
                    <span className="shrink-0 text-end text-[0.75rem] text-muted">{d.last_at ? <Ago at={d.last_at} /> : "—"}</span>
                  </li>
                ))}
              </ul>
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
            {/* more days of trial: not a subscription, the owner is told plainly */}
            {!s.plan.paid && <AdminTrial shopId={s.id} until={s.trial_until} over={s.trial_over} />}
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
                          {l.kind === "trial"
                            ? `زيادة تجربة حتى ${day(l.until ?? l.at)}`
                            : l.kind === "end"
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

          {/* the wheel: the founder's switch for this shop, its prizes and chances, and what fell */}
          <Card title="الروليت" actions={<Pill tone={s.wheel_on ? "brand" : "grey"}>{s.wheel_on ? "مخدومة" : "الكادو العادي"}</Pill>}>
            <AdminWheelSwitch id={s.id} on={s.wheel_on} hasCard={!!s.goal} store={s.store_on} />
            {s.wheel_on && (
              <div className="mt-4 grid gap-4 border-t border-line pt-3 lg:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-[0.8125rem] font-bold text-muted">الكادوات والحظ</p>
                  {s.wheel.length ? (
                    <ul className="space-y-1 text-[0.875rem]">
                      {s.wheel.map((x) => (
                        <li key={x.id} className="flex justify-between gap-3">
                          <bdi className="truncate font-semibold text-body">{x.name}</bdi>
                          <span className="shrink-0 text-muted">
                            <Num>{x.chance}%</Num>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[0.8125rem] text-faint">المولى مازال ما حطّ حتى كادو (الحريف ياخو الكادو متاع الكارط)</p>
                  )}
                </div>
                <div>
                  <p className="mb-1.5 text-[0.8125rem] font-bold text-muted">شنوّة طاح</p>
                  {s.wheel_fell.length ? (
                    <ul className="space-y-1 text-[0.875rem]">
                      {s.wheel_fell.map((x) => (
                        <li key={x.name} className="flex justify-between gap-3">
                          <bdi className="truncate font-semibold text-body">{x.name}</bdi>
                          <span className="shrink-0 text-muted">
                            ×<Num>{x.n}</Num>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[0.8125rem] text-faint">حتى روليت ما تدوّرت</p>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* the store: the founder's switch for this shop, what is on sale, and the latest orders */}
          <Card title="الماغازة" actions={<Pill tone={s.store_on ? "brand" : "grey"}>{s.store_on ? "مخدومة" : "الكارط العادية"}</Pill>}>
            <AdminStoreSwitch id={s.id} on={s.store_on} hasCard={!!s.goal} />
            {s.store_on && (
              <div className="mt-4 grid gap-4 border-t border-line pt-3 lg:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-[0.8125rem] font-bold text-muted">شنوّة فيها</p>
                  {s.store.length ? (
                    <ul className="space-y-1 text-[0.875rem]">
                      {s.store.map((x) => (
                        <li key={x.id} className="flex justify-between gap-3">
                          <bdi className="truncate font-semibold text-body">{x.name}</bdi>
                          <span className="shrink-0 text-muted">
                            <Num>{x.cost}</Num> تامبون
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[0.8125rem] text-faint">المولى مازال ما حطّ حتى حاجة</p>
                  )}
                </div>
                <div>
                  <p className="mb-1.5 text-[0.8125rem] font-bold text-muted">آخر الطلبيات</p>
                  {s.orders.length ? (
                    <ul className="space-y-1 text-[0.8125rem]">
                      {s.orders.map((o, i) => (
                        <li key={i} className="flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate">
                            <Num>{o.qty}</Num>× <bdi className="font-semibold text-body">{o.name}</bdi>
                            <span className="text-muted"> · {o.who ?? t.someone}</span>
                          </span>
                          <Pill tone={o.status === "given" ? "mint" : o.status === "waiting" ? "brand" : "grey"}>{o.status === "given" ? "تسلّمت" : o.status === "waiting" ? "تستنّى" : "تبطّلت"}</Pill>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[0.8125rem] text-faint">حتى طلبية</p>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* what the owner wrote in «شنوّة تبيع», and how many tampons each one got */}
          <Card
            title="شنوّة يبيع"
            hint={s.items.length ? undefined : "ما كتب حتى حاجة"}
            actions={s.items.length > 0 && <Pill tone={s.items_on ? "mint" : "grey"}>{s.items_on ? "يسأل على شنوّة التامبون" : "مطفي"}</Pill>}
            pad={false}
          >
            {/* the founder's switch: the counter asks which thing each tampon is for */}
            <AdminItemsSwitch id={s.id} on={s.items_on} count={s.items.filter((x) => !x.gone).length} />
            {s.items.length > 0 && (
              <Table head={["الحاجة", "تامبونات", "30 يوم", "آخر مرّة", "تزادت"]} words={[0]}>
                {s.items.map((x) => (
                  <Row key={x.id}>
                    <Cell strong>
                      <span className={`block truncate ${x.gone ? "text-faint line-through" : ""}`}>
                        <bdi>{x.name}</bdi>
                      </span>
                    </Cell>
                    <Cell n strong>{x.n}</Cell>
                    <Cell n muted>{x.n30}</Cell>
                    <Cell muted>{x.last_at ? <Ago at={x.last_at} /> : "—"}</Cell>
                    <Cell muted><When>{day(x.at)}</When></Cell>
                  </Row>
                ))}
              </Table>
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
                <Table head={[t.aVisitWhen, t.aVisitStayed, "عدّى على", t.aVisitPhone, t.aVisitPlace, t.aVisitFrom]} words={[2, 3, 4, 5]}>
                  {s.seen.visits.map((v) => (
                    // the whole visit, step by step with its taps, on the traffic page
                    <Row key={v.id} href={`/admin/traffic?tab=visits&v=${v.id}`}>
                      <Cell strong>
                        <Ago at={v.at} />
                        <span className="block text-[0.75rem] font-normal text-muted">
                          <When>{when(v.at)}</When>
                        </span>
                      </Cell>
                      <Cell n strong>
                        {v.ms > 0 ? dur(v.ms) : "—"}
                      </Cell>
                      <Cell muted className="min-w-[16rem]">
                        {/* the pages in the order they went through them, with the time on each */}
                        <span className="flex flex-wrap items-center gap-1">
                          {v.path.map((w, i) => (
                            <span key={i} className="inline-flex items-center gap-1">
                              {i > 0 && <span className="text-faint" aria-hidden>←</span>}
                              <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-2 py-0.5 text-[0.75rem] font-semibold text-body">
                                <bdi>{screenName(w.route, w.screen)}</bdi>
                                {w.ms >= 1000 && <bdi className="font-normal text-muted">{dur(w.ms)}</bdi>}
                              </span>
                            </span>
                          ))}
                          {v.pages > v.path.length && <span className="text-[0.75rem] text-muted">+<Num>{v.pages - v.path.length}</Num></span>}
                          {!v.path.length && <span className="text-faint">—</span>}
                        </span>
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

            <Card title={t.aRecent} hint={s.held.some((h) => h.state === "lost") ? `${s.held.filter((h) => h.state === "lost").length} سكان ضاع (ما عملش كونت)` : undefined} pad={false}>
              {s.recent.length + s.held.length === 0 ? (
                <Empty>{t.aNothing}</Empty>
              ) : (
                <Table head={["شنوّة", "شكون", "وقتاش"]} words={[1]}>
                  {[
                    ...s.recent.map((r) => ({ ...r, held: null as (typeof s.held)[number] | null })),
                    // the scans without an account: whether the tampon was ever collected
                    ...s.held.map((h) => ({ at: h.at, kind: "held" as const, given: false, name: h.name, phone: null, item: h.item, held: h })),
                  ]
                    .sort((a, b) => b.at.localeCompare(a.at))
                    .map((r, i) => (
                    <Row key={i}>
                      <Cell>
                        {r.held ? (
                          <Pill tone={HELD[r.held.state]!.tone}>{HELD[r.held.state]!.say}</Pill>
                        ) : (
                          <Pill tone={r.kind === "stamp" ? "brand" : "coral"}>{r.kind === "stamp" ? <><Num>+1</Num> تامبون</> : "كادو"}</Pill>
                        )}
                        {r.item && <span className="ms-1.5 font-semibold text-body"><bdi>{r.item}</bdi></span>}
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
