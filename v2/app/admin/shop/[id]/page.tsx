import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronDown, Gift, MessageCircle, Moon, Phone, Smartphone, Stamp } from "lucide-react";
import { Face, ShopNote } from "@/components/AdminBoard";
import { PILL, standing, type AccessShop } from "@/lib/board";
import { AdminShopMore } from "@/components/AdminShopMore";
import { digits, spaced } from "@/lib/phone";
import { screenName } from "@/lib/screens";
import { call } from "@/lib/supabase";
import { agoSaid, counted, daysN, hoursN, monthsSaid, stampsN, t } from "@/lib/t";

export const metadata = { title: "المحل" };

type Study = {
  shop: {
    id: string; name: string; kind: string; color: string; logo: string | null; goal: number | null; gift: string | null; stamp_gap: number; stamp_logo: boolean;
    paused: boolean; created_at: string; items_on: boolean; store_on: boolean; wheel_on: boolean; wheel_allowed: boolean;
    paid_until: string | null; paid: boolean; trial_end: string; started: boolean; shut: boolean; offer_at: string | null;
  };
  owner: { id: string; name: string | null; phone: string | null; created_at: string };
  origin: { at: string; source: string | null; medium: string | null; campaign: string | null; content: string | null; landing: string | null; referrer: string | null; device: string | null; os: string | null; browser: string | null; city: string | null; fbclid: boolean } | null;
  numbers: { customers: number; real: number; stamps: number; week: number; returning: number; given: number; waiting: number; visits: number; days: number; ms: number };
  days: { day: string; stamps: number; came: boolean }[];
  steps: Record<string, string | null>;
  did: Record<string, { n: number; last: string }>;
  errors: { at: string; detail: string | null }[];
  visits: { id: string; at: string; end: string; device: string | null; os: string | null; browser: string | null; city: string | null; source: string | null; app: boolean; ms: number; stamps: number; screens: { route: string; screen: string | null; ms: number }[] }[];
  customers: { name: string | null; tail: string; stamps: number; on: number; goal: number | null; gifts: number; days: number; first: string | null; last: string | null; late: boolean }[];
  items: { name: string; gone: boolean; n: number }[];
  plan: { kind: string; months: number | null; until: string | null; amount: number | null; method: string | null; at: string }[];
  devices: { since: string; last_at: string | null; device: string | null; os: string | null; browser: string | null; city: string | null; app: boolean | null; here: boolean | null }[];
  note: string;
};

const TZ = "Africa/Tunis";
const when = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: TZ }).format(new Date(iso));
const dayOf = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "short", timeZone: TZ }).format(new Date(`${iso}T12:00:00`));
const hourOf = (iso: string) => Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: TZ }).format(new Date(iso)));
/** «5 دقايق», «زوز سوايع» — a length of time in the app */
const howLong = (ms: number) => {
  const m = Math.round(ms / 60_000);
  if (m < 1) return `${Math.max(1, Math.round(ms / 1000))} ثانية`;
  return m < 60 ? counted(m, "دقيقة", "زوز دقايق", "دقايق", "دقيقة") : hoursN(Math.round(m / 60));
};
/** «بعد 3 سوايع»: how long after the account was made */
const afterSaid = (ms: number) => {
  const m = Math.max(0, Math.round(ms / 60_000));
  if (m < 60) return `بعد ${counted(Math.max(1, m), "دقيقة", "زوز دقايق", "دقايق", "دقيقة")}`;
  const h = Math.round(m / 60);
  return h < 24 ? `بعد ${hoursN(h)}` : `بعد ${daysN(Math.round(h / 24))}`;
};
/** where a visit came from, in the founder's words */
const SOURCES: Record<string, string> = { direct: "مباشرة", facebook: "فيسبوك", fb: "فيسبوك", ig: "إنستغرام", instagram: "إنستغرام", google: "Google", whatsapp: "واتساب", tiktok: "تيك توك" };
const sourceSaid = (s: string) => SOURCES[s.toLowerCase()] ?? s;
const gapSaid = (min: number) => (min === 0 ? "بلا وقت بين تامبون وتامبون" : min === 1440 ? "تامبون واحد في النهار" : min < 60 ? `كل ${counted(min, "دقيقة", "زوز دقايق", "دقايق", "دقيقة")}` : `كل ${hoursN(Math.round(min / 60))}`);

/** the steps from the sign-up to paying, in their order */
const STEPS: [string, string][] = [
  ["account", "عمل الكونت"],
  ["shop", "حلّ المحل"],
  ["counter", "حلّ الكود (الكونتور)"],
  ["first", "أوّل حريف"],
  ["first_real", "أوّل حريف بعد الساعة الأولى"],
  ["fifth", "5 حرفاء"],
  ["gift", "أوّل كادو تعطى"],
  ["app", "حطّ الأبليكاسيون"],
  ["offer", "شاف السوم"],
  ["pay", "حلّ صفحة الخلاص"],
  ["asked", "حاول يكلّمنا باش يخلّص"],
  ["paid", "خلّص"],
];
/** what the owner did in the app, by the signal that says it */
const DID: [string, string][] = [
  ["pwa_installed", "حطّ الأبليكاسيون"],
  ["pwa_open", "حلّ الأبليكاسيون من التليفون"],
  ["collect", "زاد تامبون بكود الحريف"],
  ["customer_open", "حلّ حريف"],
  ["recent_open", "حلّ آخر الحركات"],
  ["gift_code", "سكاني كود كادو"],
  ["my_code", "حلّ الكود متاعو"],
  ["logo", "حطّ اللوغو"],
  ["tryit", "جرّب الديمو"],
  ["clip", "تفرّج في الفيديوات القصار"],
  ["video", "تفرّج في فيديو"],
  ["help_open", "حلّ المساعدة"],
  ["offer", "شاف العرض"],
  ["push", "سألناه على الإشعارات"],
  ["pay", "نزل على طريقة خلاص"],
  ["trial_call", "نزل على «كلّمنا»"],
  ["news", "شاف خبر"],
  ["form_error", "غلطات في الفورمات"],
];

/** A part of the page: its title, a few words, and what is in it. */
function Part({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-[1.125rem] bg-surface p-4 shadow-card ring-1 ring-line/70">
      <h2 className="text-[1rem] font-bold text-ink">{title}</h2>
      {hint && <p className="mt-0.5 text-[0.75rem] text-muted">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** One number with its name, and a word under it. */
function Tile({ n, label, sub }: { n: ReactNode; label: string; sub?: string | null }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[0.875rem] bg-canvas/70 px-1.5 py-2.5 text-center">
      <b className="num text-[1.375rem] leading-tight text-ink">{n}</b>
      <span className="mt-0.5 text-[0.75rem] font-semibold leading-tight text-muted">{label}</span>
      {sub && <span className="mt-0.5 text-[0.6875rem] font-semibold leading-tight text-brand">{sub}</span>}
    </div>
  );
}

/**
 * One shop, studied (the founder, 23 Oct 2026: «a detailed page with all the
 * data to study the client in the best way possible, clean and detailed»).
 * Top to bottom: who and where from; the numbers; its last 30 days; the
 * steps from the sign-up to paying, each with its hour; what the owner did in
 * the app and where a form stopped him; his visits, screen by screen; its
 * customers; its card; then what is done to it — the access, the switches,
 * the account — the phones signed in, and the founder's note. One call to the
 * database (admin_study).
 */
export default async function StudyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const st = await call<Study | null>("admin_study", { p_id: id });
  if (!st) notFound();
  // eslint-disable-next-line react-hooks/purity -- a server page: the clock is read once per request
  const now = Date.now();
  const { shop, owner, numbers: n } = st;
  const ago = (iso: string) => agoSaid(now - Date.parse(iso));
  const d = digits(owner.phone ?? "");
  const phone = /^\d{8}$/.test(d) ? d : null;
  const pill = standing({ ...shop, card: shop.goal !== null }, now);
  const access: AccessShop = { id: shop.id, name: shop.name, owner: { name: owner.name, phone: owner.phone }, paid: shop.paid, paid_until: shop.paid_until, shut: shop.shut, started: shop.started, trial_end: shop.trial_end };
  const night = (() => {
    const h = hourOf(shop.created_at);
    return h >= 19 || h < 8;
  })();
  const o = st.origin;
  const from = o ? (o.campaign ? `إشهار · ${o.campaign}${o.content ? ` · ${o.content}` : ""}` : o.source && o.source !== "direct" ? sourceSaid(o.source) : o.fbclid ? "فيسبوك" : "دخل مباشرة") : null;
  const max = Math.max(1, ...st.days.map((x) => x.stamps));
  const monthStamps = st.days.reduce((a, x) => a + x.stamps, 0);
  const came = st.days.filter((x) => x.came).length;
  const born = Date.parse(owner.created_at);
  const did = DID.filter(([k]) => st.did[k]);

  return (
    <div className="space-y-3">
      <Link href="/admin" className="inline-flex items-center gap-1 text-[0.875rem] font-semibold text-muted">
        <ArrowRight className="size-4" /> المحلات
      </Link>

      {/* who, where it stands, where the owner came from */}
      <section className="rounded-[1.125rem] bg-surface p-4 shadow-card ring-1 ring-line/70">
        <div className="flex items-start gap-3">
          <Face s={shop} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <h1 className="min-w-0 flex-1 text-[1.25rem] font-bold leading-snug text-ink">
                <bdi className="block truncate">{shop.name}</bdi>
              </h1>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[0.75rem] font-semibold ${PILL[pill.tone]}`}>{pill.say}</span>
            </div>
            <p className="mt-0.5 text-[0.875rem] text-body">
              <bdi>{owner.name || "بلا اسم"}</bdi> · {t.kinds[shop.kind] ?? shop.kind}
            </p>
          </div>
        </div>
        <dl className="mt-3 space-y-1.5 text-[0.8438rem]">
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 font-semibold text-muted">تحلّ</dt>
            <dd className="text-ink">
              {when(shop.created_at)} · {ago(shop.created_at)}
              {night && (
                <span className="ms-1.5 inline-flex items-center gap-0.5 text-muted">
                  <Moon className="size-3.5" /> في الليل
                </span>
              )}
            </dd>
          </div>
          {from && (
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 font-semibold text-muted">جا من</dt>
              <dd className="min-w-0 text-ink">
                <bdi>{from}</bdi>
              </dd>
            </div>
          )}
          {o && (o.os || o.browser) && (
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 font-semibold text-muted">تليفونو</dt>
              <dd className="min-w-0 text-ink">
                <bdi>{[o.os, o.browser, o.city].filter(Boolean).join(" · ")}</bdi>
              </dd>
            </div>
          )}
        </dl>
        {phone && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <a href={`tel:+216${phone}`} aria-label={`عيّط ${spaced(phone)}`} className="press flex h-11 items-center justify-center gap-1.5 rounded-[0.75rem] bg-brand-soft text-[0.9375rem] font-bold text-brand">
              <Phone className="size-4" />
              <bdi dir="ltr" className="num">
                {spaced(phone)}
              </bdi>
            </a>
            <a href={`https://wa.me/216${phone}`} target="_blank" rel="noreferrer" className="press flex h-11 items-center justify-center gap-1.5 rounded-[0.75rem] bg-[#25D366]/15 text-[0.9375rem] font-bold text-[#128C4B]">
              <MessageCircle className="size-4" /> واتساب
            </a>
          </div>
        )}
        <ShopNote id={shop.id} note={st.note} />
      </section>

      {/* the numbers */}
      <div className="grid grid-cols-3 gap-2">
        <Tile n={n.real} label="حرفاء حقيقيين" sub={n.customers > n.real ? `+${n.customers - n.real} تجربة` : null} />
        <Tile n={n.stamps} label="تامبونات" sub={n.week ? `${n.week} هالجمعة` : null} />
        <Tile n={n.returning} label="رجعو نهار آخر" />
        <Tile n={n.given} label="كادوات تعطاو" sub={n.waiting ? `${n.waiting} يستنّاو` : null} />
        <Tile n={n.days} label="نهارات جا" sub={n.visits ? `${counted(n.visits, "مرّة", "مرّتين", "مرّات", "مرّة")}` : null} />
        <Tile n={n.ms ? howLong(n.ms) : "—"} label="في الأبليكاسيون" />
      </div>

      {/* the last 30 days: tampons, and the days the owner came */}
      <Part title="آخر 30 يوم" hint={`${stampsN(monthStamps)} · جا في ${daysN(came)}`}>
        <div dir="ltr" role="img" aria-label={`${stampsN(monthStamps)} في 30 يوم`} className="flex h-20 items-end gap-[2px]">
          {st.days.map((x, i) => (
            <span key={x.day} title={`${dayOf(x.day)} · ${x.stamps}`} className={`flex-1 rounded-t-[2px] ${x.stamps ? (i === st.days.length - 1 ? "bg-brand" : "bg-brand/45") : "bg-line"}`} style={{ height: x.stamps ? `${Math.max(8, (x.stamps / max) * 100)}%` : "2px" }} />
          ))}
        </div>
        <div dir="ltr" className="mt-1 flex gap-[2px]" aria-hidden>
          {st.days.map((x) => (
            <span key={x.day} className="flex flex-1 justify-center">
              <span className={`size-1.5 rounded-full ${x.came ? "bg-mint" : "bg-transparent"}`} />
            </span>
          ))}
        </div>
        <p className="mt-1.5 flex items-center justify-between text-[0.6875rem] text-faint">
          <span>اليوم</span>
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-mint" /> نهار جا فيه للأبليكاسيون
          </span>
          <span>قبل 30 يوم</span>
        </p>
      </Part>

      {/* the steps, from the account to paying */}
      <Part title="الطريق متاعو" hint="كل خطوة وقتاش صارت، بعد قدّاش من التسجيل">
        <ol className="space-y-0">
          {STEPS.map(([k, label], i) => {
            const at = st.steps[k];
            return (
              <li key={k} className="relative flex gap-3 pb-3 last:pb-0">
                {i < STEPS.length - 1 && <span className="absolute start-[0.4375rem] top-4 h-full w-px bg-line" aria-hidden />}
                <span className={`relative mt-1 size-[0.875rem] shrink-0 rounded-full ${at ? "bg-brand" : "border-2 border-line bg-surface"}`} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className={`block text-[0.875rem] font-semibold ${at ? "text-ink" : "text-faint"}`}>{label}</span>
                  <span className="block text-[0.75rem] text-muted">{at ? `${when(at)}${k !== "account" ? ` · ${afterSaid(Date.parse(at) - born)}` : ""}` : "مازال"}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </Part>

      {/* what he did in the app, and where a form stopped him */}
      <Part title="شنوّة عمل في الأبليكاسيون" hint={did.length ? null : "حتى حاجة مسجّلة"}>
        {did.length > 0 && (
          <ul className="divide-y divide-line/70">
            {did.map(([k, label]) => (
              <li key={k} className="flex items-center gap-2 py-2 text-[0.8438rem]">
                <span className={`min-w-0 flex-1 ${k === "form_error" ? "text-coral" : "text-ink"}`}>{label}</span>
                <b className="num shrink-0 text-ink">{st.did[k].n}</b>
                <span className="w-24 shrink-0 text-end text-[0.75rem] text-muted">{ago(st.did[k].last)}</span>
              </li>
            ))}
          </ul>
        )}
        {st.errors.length > 0 && (
          <div className="mt-3 rounded-[0.875rem] bg-coral-soft/60 p-3">
            <p className="text-[0.8125rem] font-bold text-coral">وين تعثّر</p>
            <ul className="mt-1.5 space-y-1">
              {st.errors.map((e, i) => (
                <li key={i} className="text-[0.75rem] text-body">
                  <span className="text-muted">{when(e.at)}</span> · <bdi>{e.detail ?? "—"}</bdi>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Part>

      {/* his visits, screen by screen */}
      <Part title="كل مرّة دخل" hint={st.visits.length ? `آخر ${st.visits.length}` : "ما دخلش"}>
        <div className="space-y-1.5">
          {st.visits.map((v) => (
            <details key={v.id} className="group rounded-[0.75rem] bg-canvas/70">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-[0.8125rem] [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink">{when(v.at)}</span>
                  <span className="block text-[0.75rem] text-muted">
                    {howLong(v.ms)} · {counted(v.screens.length, "صفحة", "زوز صفحات", "صفحات", "صفحة")}
                    {v.app && (
                      <>
                        {" · "}
                        <Smartphone className="inline size-3.5" /> الأبليكاسيون
                      </>
                    )}
                    {v.source && (
                      <>
                        {" · "}
                        <bdi>{sourceSaid(v.source)}</bdi>
                      </>
                    )}
                  </span>
                </span>
                {v.stamps > 0 && <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[0.75rem] font-bold text-brand">+{v.stamps} تامبون</span>}
                <ChevronDown className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180" />
              </summary>
              <ol className="space-y-1 px-3 pb-2.5">
                {v.screens.map((x, i) => (
                  <li key={i} className="flex gap-2 text-[0.75rem]">
                    <span className="num w-5 shrink-0 text-faint">{i + 1}</span>
                    <span className="min-w-0 flex-1 text-body">
                      <bdi>{screenName(x.route, x.screen)}</bdi>
                    </span>
                    <span className="shrink-0 text-muted">{x.ms >= 1000 ? howLong(x.ms) : "—"}</span>
                  </li>
                ))}
              </ol>
            </details>
          ))}
        </div>
      </Part>

      {/* its customers */}
      <Part title="الحرفاء" hint={st.customers.length ? `${counted(st.customers.length, "حريف", "زوز حرفاء", "حرفاء", "حريف")} · آخر من جا الفوق` : "مازال حتى حريف"}>
        {st.customers.length > 0 && (
          <ul className="divide-y divide-line/70">
            {st.customers.map((c, i) => (
              <li key={i} className="flex items-center gap-2 py-2 text-[0.8125rem]">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-ink">
                    <bdi>{c.name ?? "بلا اسم"}</bdi>
                    {/* the number's last two digits: two «Ali» told apart (a physical margin: the span is left to right) */}
                    <span className="num mr-1.5 text-[0.75rem] font-normal text-faint" dir="ltr">
                      ··{c.tail}
                    </span>
                    {!c.late && <span className="ms-1.5 rounded-full bg-canvas px-1.5 text-[0.6875rem] font-semibold text-muted ring-1 ring-line">تجربة</span>}
                  </span>
                  <span className="block text-[0.75rem] text-muted">
                    {stampsN(c.stamps)} · جا في {daysN(c.days)}
                    {c.gifts ? ` · ${counted(c.gifts, "كادو", "زوز كادوات", "كادوات", "كادو")}` : ""}
                  </span>
                </span>
                {c.goal && (
                  <span className="num shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[0.75rem] font-bold text-brand" dir="ltr">
                    {c.on}/{c.goal}
                  </span>
                )}
                <span className="w-20 shrink-0 text-end text-[0.75rem] text-muted">{c.last ? ago(c.last) : "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </Part>

      {/* its card */}
      <Part title="الكارط">
        {shop.goal ? (
          <ul className="space-y-1.5 text-[0.8438rem] text-ink">
            <li className="flex items-center gap-2">
              <Stamp className="size-4 shrink-0 text-brand" /> {stampsN(shop.goal)} ←
              <Gift className="size-4 shrink-0 text-coral" /> <bdi>{shop.gift ?? "—"}</bdi>
            </li>
            <li className="text-muted">{gapSaid(shop.stamp_gap)}</li>
            {shop.stamp_logo && <li className="text-muted">اللوغو متاعو على التامبونات</li>}
            {shop.wheel_on && <li className="text-muted">الروليت خدّامة: الحريف كي يكمّل يدوّر</li>}
            {shop.store_on && <li className="text-muted">الماغازة خدّامة</li>}
            {shop.items_on && <li className="text-muted">«شنوّة يبيع» خدّام</li>}
          </ul>
        ) : (
          <p className="text-[0.875rem] text-muted">مازال ما عملش الكارط</p>
        )}
        {st.items.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {st.items.map((x, i) => (
              <li key={i} className={`rounded-full px-2.5 py-0.5 text-[0.75rem] font-semibold ring-1 ring-line ${x.gone ? "text-faint line-through" : "text-body"}`}>
                <bdi>{x.name}</bdi> · <span className="num">{x.n}</span>
              </li>
            ))}
          </ul>
        )}
      </Part>

      {/* what the founder does to it: the access (and its whole story), the switches, the account */}
      <Part title="الأبونمان والخيارات" hint={st.plan.length ? `${st.plan.length} حركات في الأبونمان` : null}>
        <AdminShopMore shop={access} now={now} bare />
        {st.plan.length > 4 && (
          <ul className="mt-3 space-y-1 text-[0.75rem] text-muted">
            {st.plan.slice(4).map((l, i) => (
              <li key={i}>
                {when(l.at)} · {l.kind === "paid" && l.months ? `خدّمنا ${monthsSaid(l.months)}` : l.kind === "trial" ? "زدنا في التجربة" : l.kind === "end" ? "وقّفناه" : "خدّمنا"}
                {l.amount ? ` · ${l.amount} ${t.payCurrency}` : ""}
              </li>
            ))}
          </ul>
        )}
      </Part>

      {/* the phones signed in to the owner's account right now */}
      <Part title="التليفونات اللي داخل منهم" hint={st.devices.length ? null : "حتى واحد توّا"}>
        {st.devices.length > 0 && (
          <ul className="divide-y divide-line/70">
            {st.devices.map((x, i) => (
              <li key={i} className="flex items-center gap-2 py-2 text-[0.8125rem]">
                <Smartphone className={`size-4 shrink-0 ${x.here ? "text-mint" : "text-muted"}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-ink">
                    <bdi>{[x.os, x.browser, x.city].filter(Boolean).join(" · ") || "—"}</bdi>
                    {x.app && <span className="ms-1.5 text-[0.75rem] text-brand">الأبليكاسيون</span>}
                  </span>
                  <span className="block text-[0.75rem] text-muted">داخل {ago(x.since)}</span>
                </span>
                <span className={`shrink-0 text-[0.75rem] ${x.here ? "font-semibold text-mint" : "text-muted"}`}>{x.here ? "توّا" : x.last_at ? ago(x.last_at) : "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </Part>
    </div>
  );
}
