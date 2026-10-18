import { notFound } from "next/navigation";
import { CalendarClock, ChevronRight, Gift, MessageCircle, Phone, Smartphone, Stamp, Users } from "lucide-react";
import { AdminPlan } from "@/components/AdminPlan";
import { PlanImage } from "@/components/PlanImage";
import { AdminTrial } from "@/components/AdminTrial";
import { AdminShopActions } from "@/components/AdminShopActions";
import { AdminPhoneCheck } from "@/components/AdminPhoneCheck";
import { AdminForms, type IdForm } from "@/components/AdminForms";
import { AdminShopEdit } from "@/components/AdminShopEdit";
import { AdminItemsSwitch } from "@/components/AdminItemsSwitch";
import { AdminStoreSwitch } from "@/components/AdminStoreSwitch";
import { AdminWheelSwitch } from "@/components/AdminWheelSwitch";
import { Ago } from "@/components/Ago";
import { Presence } from "@/components/Presence";
import { ShopMark } from "@/components/ShopMark";
import { Visits, type Seen } from "@/components/Visits";
import { box, Card, Cell, CLink, Empty, Facts, Lat, Num, Page, Pill, Row, Table, When } from "@/components/console";
import { siteOrigin } from "@/lib/origin";
import { call } from "@/lib/supabase";
import { digits, pretty } from "@/lib/phone";
import { counted, fill, monthsSaid, stampsN, t } from "@/lib/t";

export const metadata = { title: "محل" };

type Shop = {
  id: string; name: string; kind: string; color: string; logo: string | null; goal: number | null; gift: string | null; paused: boolean; created_at: string;
  owner: {
    id: string; name: string; phone: string | null; tester: boolean; admin: boolean;
    phone_check: "ask" | "sent" | null; phone_given: string | null; phone_given_at: string | null; phone_ok_at: string | null;
  } | null;
  seen: Seen | null;
  stamp_gap: number; stamp_logo: boolean; items_on: boolean;
  held: { id: string; at: string; until: string; state: "waiting" | "lost" | "done" | "back"; name: string | null; item: string | null }[];
  store_on: boolean;
  trial_until: string;
  trial_over: boolean;
  /** false: the trial's clock waits for the shop's first customer (shops opened since 14 Oct 2026) */
  trial_started?: boolean;
  wheel_on: boolean;
  wheel_allowed: boolean;
  wheel: { id: number; name: string; chance: number }[];
  wheel_fell: { name: string; n: number }[];
  store: { id: number; name: string; cost: number }[];
  orders: { at: string; name: string; qty: number; cost: number; status: "waiting" | "given" | "cancelled"; who: string | null }[];
  items: { id: number; name: string; gone: boolean; at: string; n: number; n30: number; last_at: string | null }[];
  devices: { id: string; since: string; last_at: string | null; device: string | null; os: string | null; browser: string | null; city: string | null; app: boolean | null; here: boolean | null }[];
  plan: {
    paid_until: string | null; paid: boolean; offer_until: string | null; offer: boolean;
    log: { id: number; kind: "paid" | "until" | "end" | "trial"; months: number | null; until: string | null; note: string | null; method: string | null; amount: number | null; shown: boolean; seen: string | null; at: string }[];
  };
  customers: number; stamps: number; today: number; given: number; waiting: number;
  recent: { at: string; kind: "stamp" | "gift"; given: boolean; name: string | null; phone: string | null; item: string | null }[];
  top: { name: string | null; phone: string | null; stamps: number; gifts: number; goal: number | null }[];
};

const TZ = "Africa/Tunis";
const when = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: TZ }).format(new Date(iso));
const day = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "long", year: "numeric", timeZone: TZ }).format(new Date(iso));
/** To the second: for the moment an account was opened. */
const exact = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23", timeZone: TZ }).format(new Date(iso));

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

/** a scan by a phone without an account, by how it ended */
const HELD: Record<string, { tone: "brand" | "coral" | "mint" | "grey"; say: string }> = {
  waiting: { tone: "brand", say: "سكانا بلا كونت · يستنّى" },
  lost: { tone: "coral", say: "سكانا بلا كونت · ضاع" },
  done: { tone: "mint", say: "عمل كونت وخذاه" },
  back: { tone: "mint", say: "مولى المحل رجّعهولو" },
};

/**
 * One shop, remade 18 Oct 2026 (the founder: «much cleaner», and the visits
 * «something better to understand»).
 *
 * On top, the shop itself: its mark and name, where its year stands, its
 * owner with the two ways to reach him, and its five numbers. Under it, two
 * columns: in the wide one what the shop lives — the owner's visits (each
 * one in words, a strip of the last 30 days, the replay), its customers, its
 * latest tampons; on the side what the founder sets — the year, the options
 * as switches, the owner's phones and account, the shop's card, and the
 * founder's last-resort buttons at the very end.
 */
export default async function AdminShop({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [s, forms, origin] = await Promise.all([call<Shop | null>("admin_shop", { p_id: id }), call<IdForm[]>("admin_forms", { p_shop: id }), siteOrigin()]);
  if (!s) notFound();

  // where the shop's year stands, in one pill
  const year = s.plan.paid && s.plan.paid_until
    ? { tone: "mint" as const, say: `خلّص · حتى ${day(s.plan.paid_until)}` }
    : s.plan.offer && s.plan.offer_until
      ? { tone: "brand" as const, say: `العرض · يوفى ${when(s.plan.offer_until)}` }
      : s.trial_over
        ? { tone: "coral" as const, say: "التجربة وفات وما خلّصش" }
        : s.trial_started === false
          ? { tone: "grey" as const, say: "التجربة تبدا مع أوّل حريف" }
          : { tone: "brand" as const, say: `في التجربة · توفى ${when(s.trial_until)}` };
  const test = !!(s.owner?.tester || s.owner?.admin);
  const kind = t.kinds[s.kind as keyof typeof t.kinds] ?? s.kind;

  return (
    <Page
      title={s.name}
      hint={s.goal ? `${kind} · ${stampsN(s.goal)} = ${s.gift}` : `${kind} · ما عملش الكارط`}
      actions={
        <CLink href="/admin/shops">
          <ChevronRight className="size-4" /> المحلات
        </CLink>
      }
    >
      {/* the shop itself: who it is, where its year stands, its owner, its numbers */}
      <section className={`${box} overflow-hidden`}>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4 p-5">
          <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-[1.125rem]" style={{ background: s.color }}>
            <ShopMark shop={s} size={38} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2">
              <b className="truncate text-[1.25rem] text-ink">{s.name}</b>
              <Pill tone={year.tone}>{year.say}</Pill>
              {s.paused && <Pill tone="coral">موقّف</Pill>}
              {test && <Pill>تجربة، موش حقيقي</Pill>}
            </p>
            <p className="mt-1 text-[0.875rem] text-muted">
              {kind} · تحلّ <Ago at={s.created_at} />
            </p>
          </div>
          {/* the owner, and the two ways to reach him */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-0 text-end">
              <p className="truncate text-[0.9375rem] font-bold text-ink">{s.owner?.name || "مولى المحل"}</p>
              {s.owner?.phone ? (
                <p className="text-[0.8125rem] text-muted">
                  <Num>{pretty(s.owner.phone)}</Num>
                </p>
              ) : (
                <p className="text-[0.8125rem] text-faint">بلا نومرو</p>
              )}
              {/* on the site right now? live, every 15 seconds */}
              <Presence user={s.owner?.id} className="mt-0.5 justify-end" />
            </div>
            {s.owner?.phone && (
              <span className="flex gap-2">
                <a href={`tel:+216${digits(s.owner.phone)}`} className="inline-flex h-10 items-center gap-1.5 rounded-[0.75rem] bg-brand px-4 text-[0.875rem] font-bold text-white hover:bg-brand-deep">
                  <Phone className="size-4" /> كلّمو
                </a>
                <a href={`https://wa.me/216${digits(s.owner.phone)}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-[0.75rem] bg-[#25D366] px-4 text-[0.875rem] font-bold text-white hover:opacity-90">
                  <MessageCircle className="size-4" /> واتساب
                </a>
              </span>
            )}
          </div>
        </div>
        {/* its five numbers, in one strip */}
        <dl className="grid grid-cols-2 gap-px border-t border-line/80 bg-line/80 sm:grid-cols-3 xl:grid-cols-5">
          {[
            { icon: Users, label: "حرفاء", n: s.customers, tone: "text-ink" },
            { icon: Stamp, label: "تامبونات اليوم", n: s.today, tone: "text-brand" },
            { icon: Stamp, label: "تامبونات في الكل", n: s.stamps, tone: "text-ink" },
            { icon: Gift, label: "كادوات تعطاو", n: s.given, tone: "text-coral" },
            { icon: Gift, label: "كادوات يستنّاو", n: s.waiting, tone: "text-ink" },
          ].map((x) => (
            <div key={x.label} className="bg-surface px-5 py-3.5">
              <dt className="flex items-center gap-1.5 text-[0.75rem] font-semibold text-muted">
                <x.icon className="size-3.5" /> {x.label}
              </dt>
              <dd className={`mt-1 text-[1.5rem] font-bold leading-none ${x.tone}`}>
                <Num>{x.n}</Num>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        {/* ── what the shop lives ── */}
        <div className="min-w-0 space-y-5">
          {s.seen && (
            <Card title="كل مرّة دخل" hint="وقتاش دخل، قدّاش قعد، وشنوّة عمل" pad={false}>
              <Visits seen={s.seen} />
            </Card>
          )}

          <div className="grid gap-5 2xl:grid-cols-2">
            <Card title="أحسن الحرفاء" hint="اللي عندهم أكثر تامبونات" pad={false}>
              {s.top.length === 0 ? (
                <Empty>مازال حتى حريف</Empty>
              ) : (
                <Table head={["الحريف", "كادوات", "الكارط"]}>
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

            <Card title="آخر الحركة" hint={s.held.some((h) => h.state === "lost") ? `${s.held.filter((h) => h.state === "lost").length} سكان ضاع (الحريف ما عملش كونت)` : "التامبونات والكادوات الأخرانين"} pad={false}>
              {s.recent.length + s.held.length === 0 ? (
                <Empty>مازال حتى حركة</Empty>
              ) : (
                <Table head={["شنوّة صار", "الحريف", "وقتاش"]} words={[1]}>
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
                            <Pill tone={r.kind === "stamp" ? "brand" : "coral"}>{r.kind === "stamp" ? <><Num>+1</Num> تامبون</> : r.given ? "خذا الكادو" : "ربح كادو"}</Pill>
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

          {/* what the owner wrote in «شنوّة تبيع», and how many tampons each one got */}
          {s.items.length > 0 && (
            <Card title="شنوّة يبيع" hint={s.items_on ? "قدّاش من تامبون خذات كل حاجة" : "كتبهم، أما «شنوّة يبيع» مطفي"} pad={false}>
              <Table head={["الحاجة", "تامبونات في الكل", "آخر 30 يوم", "آخر مرّة", "تزادت نهار"]} words={[0]}>
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
            </Card>
          )}

          {/* the wheel's prizes and what fell, once the founder allowed it */}
          {s.wheel_allowed && (
            <Card title="الروليت" hint={s.wheel_on ? "تخدم عند الحرفاء" : "مسموحة، أما مولى المحل مازال ما خدّمهاش"}>
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-[0.8125rem] font-bold text-muted">الكادوات والحظ متاع كل وحدة</p>
                  {s.wheel.length ? (
                    <ul className="space-y-1.5 text-[0.875rem]">
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
                    <p className="text-[0.8125rem] text-faint">مازال ما حطّ حتى كادو</p>
                  )}
                </div>
                <div>
                  <p className="mb-2 text-[0.8125rem] font-bold text-muted">شنوّة طاح للحرفاء</p>
                  {s.wheel_fell.length ? (
                    <ul className="space-y-1.5 text-[0.875rem]">
                      {s.wheel_fell.map((x) => (
                        <li key={x.name} className="flex justify-between gap-3">
                          <bdi className="truncate font-semibold text-body">{x.name}</bdi>
                          <span className="shrink-0 text-muted">{counted(x.n, "مرّة", "زوز مرّات", "مرّات", "مرّة")}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[0.8125rem] text-faint">حتى حد مازال ما دوّرها</p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* the store: what is on sale, and the latest orders */}
          {s.store_on && (
            <Card title="الماغازة" hint="شنوّة فيها، وآخر ما شراو الحرفاء">
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-[0.8125rem] font-bold text-muted">شنوّة فيها</p>
                  {s.store.length ? (
                    <ul className="space-y-1.5 text-[0.875rem]">
                      {s.store.map((x) => (
                        <li key={x.id} className="flex justify-between gap-3">
                          <bdi className="truncate font-semibold text-body">{x.name}</bdi>
                          <span className="shrink-0 text-muted">{stampsN(x.cost)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[0.8125rem] text-faint">مازال ما حطّ حتى حاجة</p>
                  )}
                </div>
                <div>
                  <p className="mb-2 text-[0.8125rem] font-bold text-muted">آخر الطلبيات</p>
                  {s.orders.length ? (
                    <ul className="space-y-1.5 text-[0.8125rem]">
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
                    <p className="text-[0.8125rem] text-faint">حتى طلبية مازال</p>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* ── what the founder sets ── */}
        <aside className="min-w-0 space-y-5">
          {/* the shop's year: where it stands, the founder's hand on it, and its story */}
          <Card title="الأبونمان" actions={<Pill tone={year.tone}>{s.plan.paid ? "خلّص" : s.trial_over ? "ما خلّصش" : "في التجربة"}</Pill>}>
            <AdminPlan shopId={s.id} paidUntil={s.plan.paid_until} paid={s.plan.paid} shop={s.name} owner={s.owner?.name ?? null} />
            {/* more days of trial: not a subscription, the owner is told plainly */}
            {!s.plan.paid && <AdminTrial shopId={s.id} until={s.trial_until} over={s.trial_over} started={s.trial_started !== false} />}
            {s.plan.log.length > 0 && (
              <div className="mt-4 border-t border-line pt-3">
                <p className="mb-2 flex items-center gap-1.5 text-[0.8125rem] font-bold text-muted">
                  <CalendarClock className="size-4" /> شنوّة صار في الأبونمان
                </p>
                <ul className="space-y-2.5 text-[0.8438rem]">
                  {s.plan.log.map((l) => (
                    <li key={l.id} className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="font-semibold text-body">
                          {l.kind === "trial"
                            ? `زيادة في التجربة حتى ${day(l.until ?? l.at)}`
                            : l.kind === "end"
                              ? "وقّفنا الأبونمان"
                              : l.kind === "until"
                                ? fill(t.aPlanLogUntil, { date: day(l.until ?? l.at) })
                                : fill(t.aPlanLogPaid, { d: monthsSaid(l.months ?? 0) })}
                        </span>
                        <span className="block text-[0.75rem] text-muted">
                          {l.amount !== null && (l.amount === 0 ? t.aPlanExtra : `${l.amount} ${t.payCurrency}`)}
                          {l.method && <> · {l.method === "cash" ? t.aPlanCash : l.method === "d17" ? "D17" : l.method.charAt(0).toUpperCase() + l.method.slice(1)}</>}
                          {l.note && <> · «{l.note}»</>}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1 text-[0.75rem] text-muted">
                        {when(l.at)}
                        <span className="flex items-center gap-1.5">
                          {l.shown && <Pill tone={l.seen ? "mint" : "grey"}>{l.seen ? "شافها" : "مازال ما شافهاش"}</Pill>}
                          {/* the subscription's picture, to send the owner (old ones too) */}
                          {(l.kind === "paid" || l.kind === "until") && (
                            <PlanImage plan={{ id: l.id, at: l.at, kind: l.kind, months: l.months, until: l.until, amount: l.amount, method: l.method, shop: s.name, owner: s.owner?.name ?? null }} />
                          )}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          {/* the shop's options: one line and one switch each */}
          <Card title="الخيارات" hint="حاجات تخدّمهم إنت للمحل هذا">
            <div className="divide-y divide-line/70">
              <AdminWheelSwitch id={s.id} on={s.wheel_allowed} active={s.wheel_on} hasCard={!!s.goal} store={s.store_on} />
              <AdminStoreSwitch id={s.id} on={s.store_on} hasCard={!!s.goal} />
              <AdminItemsSwitch id={s.id} on={s.items_on} count={s.items.filter((x) => !x.gone).length} />
            </div>
          </Card>

          {/* the owner's account: when it was made, when last seen, the phones it is open on, his real number */}
          <Card title="الكونت متاع مولى المحل">
            <Facts
              rows={[
                s.seen && { label: "عمل الكونت", value: <Ago at={s.seen.created_at} />, sub: <When>{exact(s.seen.created_at)}</When> },
                s.seen && { label: "آخر مرّة شفناه", value: s.seen.last_at ? <Ago at={s.seen.last_at} /> : <span className="text-faint">عمرو ما دخل</span>, sub: s.seen.last_at ? <When>{when(s.seen.last_at)}</When> : undefined },
              ]}
            />
            <p className="mb-2 mt-4 flex items-center gap-1.5 border-t border-line pt-3 text-[0.8125rem] font-bold text-muted">
              <Smartphone className="size-4" /> التليفونات اللي محلول عليهم
              <span className="ms-auto">
                <Pill tone={s.devices.length > 1 ? "brand" : "grey"}>
                  <Num>{s.devices.length}</Num>
                </Pill>
              </span>
            </p>
            {!s.devices.length ? (
              <p className="text-[0.8125rem] text-faint">موش محلول على حتى تليفون توّا</p>
            ) : (
              <ul className="space-y-2.5 text-[0.8438rem]">
                {s.devices.map((d) => (
                  <li key={d.id} className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 font-semibold text-body">
                        {d.here && <span className="size-2 shrink-0 rounded-full bg-mint" aria-label="متّصل توّا" />}
                        {d.device || d.os || d.browser ? <Parts of={[DEVICES[d.device ?? ""] ?? d.device, d.os, d.app ? "الأبليكاسيون" : d.browser]} /> : <span className="text-muted">ما نعرفوش</span>}
                      </span>
                      <span className="block text-[0.75rem] text-muted">
                        {d.city && <>{/^[؀-ۿ]/.test(d.city) ? d.city : <Lat>{d.city}</Lat>} · </>}
                        من <When>{when(d.since)}</When>
                      </span>
                    </span>
                    <span className="shrink-0 text-end text-[0.75rem] text-muted">{d.last_at ? <Ago at={d.last_at} /> : "—"}</span>
                  </li>
                ))}
              </ul>
            )}
            {/* a number that looks made up: ask for the real one (it covers the owner's screens until given) */}
            {s.owner && !s.owner.admin && (
              <AdminPhoneCheck id={s.owner.id} state={s.owner.phone_check} given={s.owner.phone_given} givenAt={s.owner.phone_given_at} okAt={s.owner.phone_ok_at} />
            )}
          </Card>

          {/* the shop's own card, and the founder's hand on it */}
          <Card title="المحل والكارط">
            <Facts
              rows={[
                { label: "الكارط", value: s.goal ? <>{stampsN(s.goal)} = <bdi>{s.gift}</bdi></> : <span className="text-faint">ما عملهاش</span> },
                { label: "التامبون يبان", value: s.stamp_logo && s.logo ? "باللوغو متاعو" : "علامة عادية" },
                { label: "تحلّ نهار", value: <When>{day(s.created_at)}</When> },
              ]}
            />
            <div className="mt-4">
              <AdminShopEdit shop={{ id: s.id, name: s.name, kind: s.kind, goal: s.goal, gift: s.gift, stamp_gap: s.stamp_gap }} />
            </div>
          </Card>

          {/* forms of identification: the founder's fields, a QR each; the owner sees the answers at every tampon */}
          <Card title="الفورمات" hint="خانات يعمّرهم الحريف (طلبة، شركاء…)، كل فورم بالـQR متاعو" actions={<Pill tone={forms?.length ? "brand" : "grey"}><Num>{forms?.length ?? 0}</Num></Pill>}>
            <AdminForms shop={s.id} forms={forms ?? []} origin={origin} />
          </Card>

          {/* the founder's last-resort buttons, at the very end */}
          <Card title="حاجات أخرى">
            <AdminShopActions id={s.id} paused={s.paused} owner={s.owner ? { id: s.owner.id, tester: s.owner.tester, admin: s.owner.admin } : null} />
          </Card>
        </aside>
      </div>
    </Page>
  );
}
