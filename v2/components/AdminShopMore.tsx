"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Copy, FlaskConical, Gift, KeyRound, MessageCircle, Power, Stamp } from "lucide-react";
import { adminPause, adminPlan, adminResetPassword, adminSetTester, adminTrial } from "@/app/actions";
import { adminSetItems, adminSetStore } from "@/app/actions-store";
import { adminSetWheel } from "@/app/actions-wheel";
import { adminBoardShop, type BoardMore } from "@/app/admin/actions";
import type { BoardShop } from "@/components/AdminBoard";
import { Switch } from "@/components/Owner";
import { PlanImage, type PlanShot } from "@/components/PlanImage";
import { digits } from "@/lib/phone";
import { agoSaid, customersN, daysN, fill, giftsN, monthsSaid, stampsN, t } from "@/lib/t";

const TZ = "Africa/Tunis";
const day = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "long", year: "numeric", timeZone: TZ }).format(new Date(iso));
const NOT_DONE = "ما تعدّاتش، عاود.";
const chip = (on: boolean) => `h-9 rounded-full px-3.5 text-[0.8438rem] font-bold ${on ? "bg-brand text-white" : "bg-surface text-body ring-1 ring-line"}`;
const quiet = "press flex h-10 items-center justify-center gap-1.5 rounded-[0.75rem] bg-surface px-3.5 text-[0.875rem] font-semibold text-body ring-1 ring-line disabled:opacity-60";

/**
 * A shop opened on the board: what the founder needs before a call, and the
 * few things he does after one — the access turned on, days of trial, the
 * shop's switches, a new password. Read from the database only now, for this
 * one shop; read again after each change, so what shows is what is.
 */
export function AdminShopMore({ shop, now }: { shop: BoardShop; now: number }) {
  // undefined: being read; null: it could not be
  const [more, setMore] = useState<BoardMore | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    adminBoardShop(shop.id)
      .then((r) => live && setMore(r))
      .catch(() => live && setMore(null));
    return () => {
      live = false;
    };
  }, [shop.id]);
  // after a change: read again, and what shows changes only once the answer is here (no flicker back)
  const load = useCallback(async () => {
    const r = await adminBoardShop(shop.id).catch(() => null);
    if (r) setMore(r);
  }, [shop.id]);

  if (more === undefined) return <div className="mt-3 h-40 animate-pulse rounded-[0.875rem] bg-canvas" aria-label="…" />;
  if (more === null) return <p className="mt-3 rounded-[0.875rem] bg-coral-soft px-3 py-2.5 text-[0.875rem] font-medium text-coral">{NOT_DONE}</p>;

  return (
    <div className="mt-3 space-y-3 border-t border-line/80 pt-3">
      <Facts shop={shop} more={more} now={now} />
      <Access shop={shop} more={more} reload={load} />
      <Switches shop={shop} more={more} reload={load} />
      <Account shop={shop} more={more} />
    </div>
  );
}

/** The card, who came back, the gifts, and the owner's signs of interest — then the last things that happened. */
function Facts({ shop, more, now }: { shop: BoardShop; more: BoardMore; now: number }) {
  const ago = (iso: string) => agoSaid(now - Date.parse(iso));
  const facts: [string, string][] = [
    ["الكارط", more.goal ? `${stampsN(more.goal)} ← ${more.gift ?? ""}` : "مازال ما عملهاش"],
    ["رجعو نهار آخر", more.returning ? customersN(more.returning) : "حتى حد مازال"],
    ["الكادوات", more.gifts ? `${giftsN(more.gifts)} تعطاو` : "حتى كادو مازال"],
    ["دخل للأبليكاسيون", shop.days ? `في ${daysN(shop.days)}` : "—"],
    ["صفحة الخلاص", more.pay_seen ? `حلّها ${ago(more.pay_seen)}` : "ما حلّهاش"],
    ["واتساب باش يخلّص", more.wa_at ? `نزل ${ago(more.wa_at)}` : "لا"],
  ];
  return (
    <>
      <dl className="grid grid-cols-2 gap-2">
        {facts.map(([k, v]) => (
          <div key={k} className="min-w-0 rounded-[0.75rem] bg-canvas/70 px-3 py-2">
            <dt className="text-[0.75rem] font-semibold text-muted">{k}</dt>
            <dd className="mt-0.5 line-clamp-2 text-[0.8438rem] font-semibold leading-snug text-ink">
              <bdi>{v}</bdi>
            </dd>
          </div>
        ))}
      </dl>
      {more.recent.length > 0 && (
        <ul className="space-y-1.5 px-1">
          {more.recent.map((m, i) => (
            <li key={i} className="flex items-center gap-2 text-[0.8125rem]">
              {m.kind === "stamp" ? <Stamp className="size-4 shrink-0 text-brand" /> : <Gift className="size-4 shrink-0 text-coral" />}
              <span className="text-ink">{m.kind === "stamp" ? "تامبون" : m.given ? "كادو تعطى" : "كادو يستنّى"}</span>
              {m.who && <bdi className="min-w-0 truncate text-body">{m.who}</bdi>}
              <span className="ms-auto shrink-0 text-muted">{ago(m.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

const METHODS = [
  { id: "cash", label: t.aPlanCash },
  { id: "d17", label: "D17" },
  { id: "virement", label: "Virement" },
  { id: "versement", label: "Versement" },
  { id: "mandat", label: "Mandat" },
];
const MONTHS = [1, 3, 6, 12, 15, 24];

/**
 * The access: where it stands, and the founder's three moves once the owner
 * paid by hand or asked for time — turn the subscription on (how long, what
 * came in and how), add days of trial, or stop it. The subscription turned
 * on, its picture opens by itself, to send the owner on WhatsApp.
 */
function Access({ shop, more, reload }: { shop: BoardShop; more: BoardMore; reload: () => Promise<void> }) {
  const [mode, setMode] = useState<null | "plan" | "trial" | "end">(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [months, setMonths] = useState(12);
  const [amount, setAmount] = useState<number | null>(120);
  const [other, setOther] = useState("");
  const [method, setMethod] = useState<string | null>(null);
  const [show, setShow] = useState(true);
  const [made, setMade] = useState<PlanShot | null>(null);
  const sum = other ? Number(other) : amount;

  const line = shop.paid && shop.paid_until ? `خالص حتى ${day(shop.paid_until)}` : shop.shut ? `التجربة وفات ${day(shop.trial_end)}` : shop.started ? `التجربة توفى ${day(shop.trial_end)}` : "التجربة تبدا مع أوّل حريف";
  const done = async (ok: boolean) => {
    if (!ok) return setError(NOT_DONE);
    setError(null);
    setMode(null);
    await reload();
  };
  const turnOn = () =>
    start(async () => {
      const res = await adminPlan(shop.id, "paid", months, null, null, show, sum ? method : null, sum);
      if (res.ok) setMade({ at: new Date().toISOString(), kind: "paid", months, until: res.until ?? null, amount: sum ?? null, method: sum ? method : null, shop: shop.name, owner: shop.owner.name });
      await done(res.ok);
    });

  return (
    <section className="rounded-[0.875rem] bg-canvas/70 p-3">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <b className="text-[0.9375rem] text-ink">الأبونمان</b>
        <span className={`text-[0.8125rem] font-semibold ${shop.paid ? "text-mint" : shop.shut ? "text-coral" : "text-muted"}`}>{line}</span>
      </p>

      {mode === null && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button type="button" onClick={() => setMode("plan")} className="press flex h-10 items-center gap-1.5 rounded-[0.75rem] bg-brand px-3.5 text-[0.875rem] font-bold text-white">
            <Power className="size-4" /> {t.aPlanGive}
          </button>
          <button type="button" onClick={() => setMode("trial")} className={quiet}>
            + أيّام تجربة
          </button>
          {shop.paid && (
            <button type="button" onClick={() => setMode("end")} className={`${quiet} text-coral`}>
              {t.aPlanEnd}
            </button>
          )}
        </div>
      )}

      {mode === "plan" && (
        <div className="mt-2.5 space-y-3">
          <div>
            <span className="mb-1 block text-[0.8125rem] font-semibold text-muted">{t.aPlanMonths}</span>
            <div className="flex flex-wrap gap-1.5">
              {MONTHS.map((m) => (
                <button key={m} type="button" onClick={() => setMonths(m)} className={chip(months === m)}>
                  {monthsSaid(m)}
                </button>
              ))}
            </div>
            {shop.paid && shop.paid_until && <p className="mt-1 text-[0.75rem] text-muted">{fill(t.aPlanFromEnd, { date: day(shop.paid_until) })}</p>}
          </div>
          <div>
            <span className="mb-1 block text-[0.8125rem] font-semibold text-muted">{t.aPlanAmount}</span>
            <div className="flex flex-wrap gap-1.5">
              {[120, 0].map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    setAmount(a);
                    setOther("");
                  }}
                  className={chip(!other && amount === a)}
                >
                  {a === 0 ? t.aPlanAmountExtra : `${a} ${t.payCurrency}`}
                </button>
              ))}
              <input
                value={other}
                onChange={(e) => setOther(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                placeholder={t.aPlanAmountOther}
                aria-label={t.aPlanAmountOther}
                className={`h-9 w-[7.5rem] rounded-full bg-surface px-3 text-center text-[16px] ring-1 ${other ? "ring-brand" : "ring-line"}`}
              />
            </div>
          </div>
          {sum !== 0 && (
            <div>
              <span className="mb-1 block text-[0.8125rem] font-semibold text-muted">{t.aPlanHow}</span>
              <div className="flex flex-wrap gap-1.5">
                {METHODS.map((m) => (
                  <button key={m.id} type="button" onClick={() => setMethod(method === m.id ? null : m.id)} className={`h-8 rounded-full px-3 text-[0.8125rem] font-bold ${method === m.id ? "bg-ink text-white" : "bg-surface text-body ring-1 ring-line"}`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <label className="flex items-center gap-2 text-[0.8438rem] font-semibold text-body">
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="size-4 accent-[#6c47ff]" />
            {t.aPlanShow}
          </label>
          <div className="flex gap-2">
            <button type="button" disabled={pending} onClick={turnOn} className="press flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[0.75rem] bg-brand text-[0.875rem] font-bold text-white disabled:opacity-60">
              <Power className="size-4" /> {pending ? "…" : `خدّم ${monthsSaid(months)}`}
            </button>
            <button type="button" onClick={() => setMode(null)} className={quiet}>
              {t.back}
            </button>
          </div>
        </div>
      )}

      {mode === "trial" && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className="text-[0.8125rem] font-semibold text-muted">زيدو في التجربة:</span>
          {[3, 7].map((n) => (
            <button key={n} type="button" disabled={pending} onClick={() => start(async () => done((await adminTrial(shop.id, n)).ok))} className="press h-9 rounded-full bg-brand px-3.5 text-[0.8438rem] font-bold text-white disabled:opacity-60">
              +{daysN(n)}
            </button>
          ))}
          <button type="button" onClick={() => setMode(null)} className="h-9 px-2 text-[0.8438rem] font-semibold text-muted">
            {t.back}
          </button>
        </div>
      )}

      {mode === "end" && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-[0.75rem] bg-coral-soft p-2.5">
          <span className="min-w-0 flex-1 text-[0.8438rem] font-semibold text-coral">{t.aPlanEndConfirm}</span>
          <button type="button" onClick={() => setMode(null)} className="h-9 rounded-[0.625rem] bg-surface px-3 text-[0.8125rem] font-semibold">
            لا
          </button>
          <button type="button" disabled={pending} onClick={() => start(async () => done((await adminPlan(shop.id, "end", null, null, null, false, null)).ok))} className="h-9 rounded-[0.625rem] bg-coral px-3 text-[0.8125rem] font-bold text-white disabled:opacity-60">
            {t.aPlanEnd}
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-[0.8125rem] font-semibold text-coral">{error}</p>}
      {made && (
        <div className="mt-2.5">
          <PlanImage plan={made} startOpen label="تصويرة الأبونمان" onClose={() => setMade(null)} />
        </div>
      )}

      {/* what the founder did to this shop's access, the last four */}
      {more.plan.length > 0 && (
        <ul className="mt-2.5 space-y-1 border-t border-line/70 pt-2 text-[0.8125rem] text-body">
          {more.plan.map((l, i) => (
            <li key={i} className="flex gap-2">
              <span className="min-w-0 flex-1">
                {l.kind === "paid" && l.months ? `خدّمنا ${monthsSaid(l.months)}` : l.kind === "until" && l.until ? `خدّمنا حتى ${day(l.until)}` : l.kind === "trial" && l.until ? `زدنا في التجربة حتى ${day(l.until)}` : "وقّفناه"}
                {l.amount ? ` · ${l.amount} ${t.payCurrency}` : ""}
              </span>
              <span className="shrink-0 text-muted">{day(l.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** One of the shop's switches: its name, a few words, and the switch — asked once first when the customers would feel it. */
function SwitchLine({ title, line, on, ask, flip }: { title: string; line: string; on: boolean; ask?: string | null; flip: () => Promise<string | null> }) {
  const [pending, start] = useTransition();
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const go = () =>
    start(async () => {
      const err = await flip();
      setError(err);
      setAsking(false);
    });
  return (
    <div className="py-2.5 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1">
          <b className="block text-[0.9062rem] text-ink">{title}</b>
          <span className="block text-[0.75rem] leading-snug text-muted">{line}</span>
        </span>
        <Switch on={on} label={title} disabled={pending} onClick={() => (ask ? setAsking(!asking) : go())} />
      </div>
      {asking && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-[0.75rem] bg-canvas p-2.5">
          <span className="min-w-0 flex-1 text-[0.8125rem] font-semibold text-ink">{ask}</span>
          <button type="button" onClick={() => setAsking(false)} className="h-8 rounded-[0.5rem] bg-surface px-3 text-[0.8125rem] font-semibold text-body ring-1 ring-line">
            لا
          </button>
          <button type="button" disabled={pending} onClick={go} className="h-8 rounded-[0.5rem] bg-brand px-3 text-[0.8125rem] font-bold text-white disabled:opacity-60">
            {pending ? "…" : "إيه"}
          </button>
        </div>
      )}
      {error && <p className="mt-1 text-[0.75rem] font-semibold text-coral">{error}</p>}
    </div>
  );
}

/** The shop's four switches: stopped, the wheel, «شنوّة يبيع», the store. */
function Switches({ shop, more, reload }: { shop: BoardShop; more: BoardMore; reload: () => Promise<void> }) {
  const after = async (res: { ok: boolean; error?: string } | boolean, why?: Record<string, string>) => {
    const ok = typeof res === "boolean" ? res : res.ok;
    if (!ok) return (typeof res !== "boolean" && res.error && why?.[res.error]) || NOT_DONE;
    await reload();
    return null;
  };
  const noCard = { no_card: "لازمو يعمل الكارط قبل." };
  return (
    <section className="divide-y divide-line/70 rounded-[0.875rem] bg-canvas/70 p-3">
      <SwitchLine
        title="موقوف"
        line="الكونتور ما يعطيش تامبونات حتى ترجّعو."
        on={more.paused}
        ask={more.paused ? null : "توقّف المحل هذا؟ الكونتور ما عادش يعطي تامبونات."}
        flip={async () => after(await adminPause(shop.id, !more.paused))}
      />
      <SwitchLine
        title="الروليت"
        line={more.wheel_on ? "مولى المحل خدّمها: الحريف كي يكمّل الكارط يدوّر." : "مسموحة: مولى المحل يخدّمها من الكارط متاعو."}
        on={more.wheel_allowed}
        ask={more.wheel_allowed ? "تنحّي الروليت؟ تتطفى للحرفاء، واللي ربحو دورة تقعدلهم." : null}
        flip={async () => after(await adminSetWheel(shop.id, !more.wheel_allowed), noCard)}
      />
      <SwitchLine
        title="شنوّة يبيع"
        line="قبل كل تامبون، يسألوه شنوّة خذا الحريف."
        on={more.items_on}
        flip={async () => after(await adminSetItems(shop.id, !more.items_on), { no_items: "مولى المحل مازال ما كتب حتى حاجة يبيعها." })}
      />
      <SwitchLine
        title="الماغازة"
        line="في بلاصة الكادو: الحرفاء يلمّو التامبونات ويشريو بيهم حاجات."
        on={more.store_on}
        ask={more.store_on ? "ترجّعو للكارط العادية؟ التامبونات اللي عند الحرفاء يقعدو." : "تخدّم الماغازة للمحل هذا؟ يتبدّل اللي يشوفوه الحرفاء متاعو."}
        flip={async () => after(await adminSetStore(shop.id, !more.store_on), noCard)}
      />
    </section>
  );
}

/** The owner's account: a new password (shown once, sent on WhatsApp in one tap), or marked as a test — then it leaves the board. */
function Account({ shop, more }: { shop: BoardShop; more: BoardMore }) {
  const [pending, start] = useTransition();
  const [password, setPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const d = digits(shop.owner.phone ?? "");
  const wa = password && /^\d{8}$/.test(d) ? `https://wa.me/216${d}?text=${encodeURIComponent(fill(t.aResetMsg, { name: shop.owner.name ?? "", password }))}` : null;

  return (
    <section className="space-y-2">
      {password ? (
        <div className="rounded-[0.875rem] bg-canvas/70 p-3 text-center">
          <p className="text-[0.8125rem] font-semibold text-muted">{t.aResetDone}</p>
          <p className="num mt-1 text-[2rem] font-bold tracking-[0.14em] text-ink" dir="ltr">
            {password}
          </p>
          <p className="mt-0.5 text-[0.75rem] text-muted">{t.aResetHint}</p>
          <div className="mt-2.5 grid grid-cols-[1fr_auto] gap-2">
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className="press flex h-10 items-center justify-center gap-1.5 rounded-[0.75rem] bg-[#25D366] text-[0.875rem] font-bold text-white">
                <MessageCircle className="size-4" /> {t.aResetSend}
              </a>
            )}
            <button type="button" onClick={() => void navigator.clipboard?.writeText(password)} className="grid size-10 place-items-center rounded-[0.75rem] bg-brand-soft text-brand" aria-label="انسخ">
              <Copy className="size-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await adminResetPassword(more.owner_id);
                setError(res.ok ? null : NOT_DONE);
                if (res.ok && res.password) setPassword(res.password);
              })
            }
            className={quiet}
          >
            <KeyRound className="size-4" /> كلمة سر جديدة
          </button>
          <button type="button" onClick={() => setAsking(true)} className={quiet}>
            <FlaskConical className="size-4" /> هذا تست
          </button>
        </div>
      )}
      {asking && (
        <div className="flex flex-wrap items-center gap-2 rounded-[0.75rem] bg-canvas p-2.5">
          <span className="min-w-0 flex-1 text-[0.8125rem] font-semibold text-ink">تحطّو في التجربة؟ يخرج من القائمة هذي ومن الأرقام.</span>
          <button type="button" onClick={() => setAsking(false)} className="h-8 rounded-[0.5rem] bg-surface px-3 text-[0.8125rem] font-semibold text-body ring-1 ring-line">
            لا
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const ok = await adminSetTester(more.owner_id, true);
                setError(ok ? null : NOT_DONE);
                setAsking(false);
              })
            }
            className="h-8 rounded-[0.5rem] bg-brand px-3 text-[0.8125rem] font-bold text-white disabled:opacity-60"
          >
            {pending ? "…" : "إيه"}
          </button>
        </div>
      )}
      {error && <p className="text-[0.8125rem] font-semibold text-coral">{error}</p>}
    </section>
  );
}
