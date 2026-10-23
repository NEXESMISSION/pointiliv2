"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { BarChart3, Copy, FlaskConical, Gift, KeyRound, MessageCircle, Stamp } from "lucide-react";
import { adminPause, adminResetPassword, adminSetTester } from "@/app/actions";
import { adminSetItems, adminSetStore } from "@/app/actions-store";
import { adminSetWheel } from "@/app/actions-wheel";
import { adminBoardShop, type BoardMore } from "@/app/admin/actions";
import { AdminAccess } from "@/components/AdminAccess";
import type { AccessShop } from "@/lib/board";
import { Switch } from "@/components/Owner";
import { digits } from "@/lib/phone";
import { agoSaid, fill, stampsN, t } from "@/lib/t";

const NOT_DONE = "ما تعدّاتش، عاود.";
const quiet = "press flex h-10 items-center justify-center gap-1.5 rounded-[0.75rem] bg-surface px-3.5 text-[0.875rem] font-semibold text-body ring-1 ring-line disabled:opacity-60";

/**
 * A shop opened on the board («أكثر»): its card and the last things that
 * happened, then the few things the founder does after a call — the access
 * turned on, days of trial, the shop's switches, a new password. (Its numbers
 * are on the line itself.) Read from the database only now, for this one
 * shop; read again after each change, so what shows is what is.
 */
export function AdminShopMore({ shop, now, bare = false }: { shop: AccessShop; now: number; bare?: boolean }) {
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
    <div className={bare ? "space-y-3" : "mt-3 space-y-3 border-t border-line/80 pt-3"}>
      {!bare && (
        <Link href={`/admin/shop/${shop.id}`} className="press flex h-10 items-center justify-center gap-1.5 rounded-[0.75rem] bg-brand-soft text-[0.875rem] font-bold text-brand">
          <BarChart3 className="size-4" /> كل التفاصيل على المحل هذا
        </Link>
      )}
      {/* on the study page the card and the story have their own places: only what is done to the shop here */}
      {!bare && <Story more={more} now={now} />}
      <AdminAccess shop={shop} plan={more.plan} reload={load} />
      <Switches shop={shop} more={more} reload={load} />
      <Account shop={shop} more={more} />
    </div>
  );
}

/** The card as it stands, and the last six things that happened on it. */
function Story({ more, now }: { more: BoardMore; now: number }) {
  return (
    <>
      <p className="rounded-[0.75rem] bg-canvas/70 px-3 py-2 text-[0.8438rem]">
        <span className="font-semibold text-muted">الكارط: </span>
        <bdi className="font-semibold text-ink">{more.goal ? `${stampsN(more.goal)} ← ${more.gift ?? ""}` : "مازال ما عملهاش"}</bdi>
      </p>
      {more.recent.length > 0 && (
        <ul className="space-y-1.5 px-1">
          {more.recent.map((m, i) => (
            <li key={i} className="flex items-center gap-2 text-[0.8125rem]">
              {m.kind === "stamp" ? <Stamp className="size-4 shrink-0 text-brand" /> : <Gift className="size-4 shrink-0 text-coral" />}
              <span className="text-ink">{m.kind === "stamp" ? "تامبون" : m.given ? "كادو تعطى" : "كادو يستنّى"}</span>
              {m.who && <bdi className="min-w-0 truncate text-body">{m.who}</bdi>}
              <span className="ms-auto shrink-0 text-muted">{agoSaid(now - Date.parse(m.at))}</span>
            </li>
          ))}
        </ul>
      )}
    </>
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
function Switches({ shop, more, reload }: { shop: AccessShop; more: BoardMore; reload: () => Promise<void> }) {
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
function Account({ shop, more }: { shop: AccessShop; more: BoardMore }) {
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
