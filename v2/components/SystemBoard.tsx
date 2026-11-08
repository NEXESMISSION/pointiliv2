"use client";

import Link from "@/components/Link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, ChevronLeft, Crown, FileSpreadsheet, Gift, Link2, Lock, PieChart, ShoppingBasket, ShoppingCart, Smartphone, Trophy, type LucideIcon } from "lucide-react";
import { setStore, storePreview } from "@/app/actions-packs";
import { setWheel } from "@/app/actions-wheel";
import { Top } from "@/components/Top";
import { useScreen } from "@/components/Tracker";
import { D, whenSaid } from "@/lib/draw";
import { P, PACK_NAME, pointsN, rewardOf, type Reward, type ShopSystems, type StorePreview } from "@/lib/packs";
import { PRO_PLANS } from "@/lib/plans";
import { customersN, fill, giftsN, monthsSaid, stampsN, t } from "@/lib/t";

type Shop = { goal: number | null; gift: string | null; wheel_on?: boolean; store_on?: boolean; items_on?: boolean };

/**
 * «النظام متاعي»: the owner's whole system on one screen (the model of 8 Nov 2026). Every visit is a
 * tampon; above, the ONE reward it turns into — a gift, the roulette, the store (Pro) — the one on now
 * marked; under it, the extras. Switching the reward says first what it does to the customers (the store
 * and back: with their numbers), and the promise under it all: nothing they collected is lost.
 *
 * Only for a shop on a pack (Pointili or Pro): a shop already open the day the packs came never sees it.
 */
export function SystemBoard({ shop, systems, opened = false }: { shop: Shop; systems: NonNullable<ShopSystems> & { pack: "base" | "pro" }; /** back from the store's list: it opened with it */ opened?: boolean }) {
  useScreen("system");
  const router = useRouter();
  const now = rewardOf(systems);
  const pro = systems.pack === "pro";
  const [asking, setAsking] = useState<{ to: Reward; preview: StorePreview | null; failed?: boolean } | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [said, setSaid] = useState<string | null>(opened && systems.store_on ? P.storeOpened : null);

  // what the switch would do, read first; the server not answering says so, with a way to ask again
  const ask = (to: Reward) => {
    setAsking({ to, preview: null });
    start(async () => {
      const preview = await storePreview().catch(() => null);
      setAsking({ to, preview, failed: !preview });
    });
  };
  const choose = (to: Reward) => {
    setError(null);
    setSaid(null);
    if (to === now) return;
    // to or from the store: what it does to the customers, read and said first
    if (to === "store" || now === "store") return ask(to);
    // the gift and the roulette: the roulette's own page holds its prizes and its switch
    if (to === "wheel") return router.push("/shop/wheel");
    start(async () => {
      const res = await setWheel(false);
      if (!res.ok) return setError(P.err);
      // a card made on the roulette has no gift of its own yet: its question
      if (!shop.gift || shop.gift === "الروليت") router.push("/shop/card");
      else {
        setSaid(P.switched);
        router.refresh();
      }
    });
  };
  const confirm = () =>
    start(async () => {
      if (!asking) return;
      // to the store with nothing in it yet: its list first, and it opens with it (the customers never meet it empty)
      if (asking.to === "store" && asking.preview?.to === "store" && asking.preview.items === 0) return router.push("/shop/store?from=system&open=1");
      const res = await setStore(asking.to === "store");
      if (!res.ok) return setError(res.error === "not_allowed" ? P.errNotAllowed : res.error === "no_card" ? P.errNoCard : P.err);
      setAsking(null);
      if (asking.to === "store") return router.push("/shop/store?from=system");
      if (asking.to === "wheel") return router.push("/shop/wheel");
      setSaid(res.gifts > 0 ? `${P.switched} ${fill("{n} تكتبو للحرفاء.", { n: giftsN(res.gifts) })}` : P.switched);
      router.refresh();
    });

  const rewards: { key: Reward; icon: LucideIcon; title: string; sub: string; locked: boolean }[] = [
    { key: "gift", icon: Gift, title: P.gift, sub: shop.gift && now === "gift" ? `${stampsN(shop.goal ?? 0)} ← ${shop.gift}` : P.giftSub, locked: false },
    { key: "wheel", icon: PieChart, title: P.wheel, sub: P.wheelSub, locked: systems.wheel_allowed === false },
    { key: "store", icon: ShoppingCart, title: P.store, sub: P.storeSub, locked: !systems.store_allowed },
  ];

  return (
    <>
      <Top back="/shop/settings" title={P.title} hint={P.hint} />
      <div data-list className="-mx-1 mt-[1.5dvh] min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-1 pb-4">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.8125rem] font-bold ${pro ? "bg-[#fff2c7] text-[#8a5a00]" : "bg-brand-soft text-brand"}`}>
          {pro && <Crown className="size-4" />} {PACK_NAME[systems.pack]}
        </span>

        <section>
          <h2 className="px-0.5 text-[1rem] font-bold">{P.rewardTitle}</h2>
          <p className="px-0.5 text-[0.75rem] font-semibold text-muted">{P.rewardOne}</p>
          <div className="mt-2 space-y-2" role="radiogroup" aria-label={P.rewardTitle}>
            {rewards.map((r) => {
              const on = r.key === now;
              return (
                <button
                  key={r.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={r.title}
                  disabled={pending || (r.locked && !on)}
                  onClick={() => choose(r.key)}
                  className={`press flex w-full items-center gap-3 rounded-[1.125rem] p-3.5 text-start shadow-card transition-shadow ${on ? "bg-surface shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-brand)]" : "bg-surface"} ${r.locked && !on ? "opacity-70" : ""}`}
                >
                  <span className={`grid size-10 shrink-0 place-items-center rounded-[0.75rem] ${on ? "bg-brand text-white" : "bg-brand-soft text-brand"}`}>
                    <r.icon className="size-5" strokeWidth={2.2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="flex items-center gap-1.5 text-[0.9375rem]">
                      {r.title}
                      {on && <span className="rounded-full bg-brand px-2 py-px text-[0.6875rem] font-bold text-white">{P.rewardNow}</span>}
                      {r.locked && !on && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-[#fff2c7] px-2 py-px text-[0.6875rem] font-bold text-[#8a5a00]">
                          <Lock className="size-3" /> {P.pro}
                        </span>
                      )}
                    </b>
                    <span className="block text-[0.8125rem] leading-snug text-muted">{r.sub}</span>
                  </span>
                  {on ? <Check className="size-5 shrink-0 text-brand" strokeWidth={3} /> : <ChevronLeft className="size-5 shrink-0 text-faint" />}
                </button>
              );
            })}
          </div>

          {asking && (
            <div className="mt-2 rounded-[1.125rem] bg-surface p-3.5 shadow-card ring-2 ring-brand/30">
              {!asking.preview ? (
                asking.failed ? (
                  <p className="flex items-center gap-2 text-[0.875rem] font-semibold text-coral">
                    <span className="min-w-0 flex-1">{P.err}</span>
                    <button type="button" onClick={() => ask(asking.to)} className="press h-8 shrink-0 rounded-full px-3 text-[0.8125rem] font-bold text-brand ring-1 ring-brand/30">
                      {P.retry}
                    </button>
                  </p>
                ) : (
                  <p className="text-[0.875rem] text-muted">…</p>
                )
              ) : asking.preview.to === "store" ? (
                <>
                  <b className="block text-[0.9375rem]">{P.toStoreTitle}</b>
                  <p className="mt-1 text-[0.8125rem] leading-relaxed text-body">
                    {fill(P.toStoreBody, { customers: customersN(asking.preview.customers), points: pointsN(asking.preview.points) })}
                    {asking.preview.gifts_waiting > 0 && ` ${fill(P.toStoreWaiting, { n: asking.preview.gifts_waiting })}`}
                  </p>
                  {asking.preview.items === 0 && <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">{P.toStoreItems}</p>}
                </>
              ) : (
                <>
                  <b className="block text-[0.9375rem]">{P.toCardTitle}</b>
                  <p className="mt-1 text-[0.8125rem] leading-relaxed text-body">
                    {asking.preview.over > 0
                      ? fill(P.toCardBody, { goal: stampsN(asking.preview.goal ?? 0), over: customersN(asking.preview.over), gifts: giftsN(asking.preview.gifts) })
                      : fill(P.toCardNone, { goal: stampsN(asking.preview.goal ?? 0) })}
                  </p>
                  {asking.preview.orders_waiting > 0 && <p className="mt-1 text-[0.8125rem] text-muted">{fill(P.toCardOrders, { orders: asking.preview.orders_waiting })}</p>}
                </>
              )}
              <p className="mt-2 rounded-[0.75rem] bg-mint-soft px-3 py-2 text-[0.75rem] font-semibold leading-snug text-mint">{P.promise}</p>
              <div className="mt-2.5 flex justify-end gap-2">
                <button type="button" onClick={() => setAsking(null)} className="h-9 rounded-[0.625rem] bg-surface px-3.5 text-[0.8125rem] font-semibold text-body ring-1 ring-line">
                  {P.cancel}
                </button>
                <button type="button" disabled={pending || !asking.preview} onClick={confirm} className="h-9 rounded-[0.625rem] bg-brand px-3.5 text-[0.8125rem] font-bold text-white disabled:opacity-50">
                  {pending ? "…" : asking.preview?.to === "store" && asking.preview.items === 0 ? P.storeSetUp : P.confirm}
                </button>
              </div>
            </div>
          )}
          {said && <p className="mt-2 rounded-[0.875rem] bg-mint-soft px-3 py-2 text-center text-[0.8125rem] font-bold text-mint">{said}</p>}
          {error && <p className="mt-2 text-center text-[0.8125rem] font-semibold text-coral">{error}</p>}
        </section>

        <section>
          <h2 className="px-0.5 text-[1rem] font-bold">{P.extrasTitle}</h2>
          <ul className="mt-2 divide-y divide-line overflow-hidden rounded-[1.125rem] bg-surface shadow-card">
            {/* a lock says why: not in this pack (Pro), or in it but turned off for this shop by the founder */}
            <Extra
              href="/shop/draw"
              icon={Trophy}
              title={P.draw}
              sub={systems.draw ? (systems.draw_open ? fill(D.homeRowOpen, { when: whenSaid(systems.draw_open) }) : P.drawSub) : P.prizesWait(systems.wins ?? 0)}
              locked={!systems.draw && !(systems.wins ?? 0)}
              why={pro ? P.offHere : P.proOnly}
              tag={!pro && !systems.draw}
            />
            <Extra href="/shop/links" icon={Link2} title={P.links} sub={P.linksSub} locked={!systems.links} why={P.offHere} />
            <Extra href="/shop/items" icon={ShoppingBasket} title={P.items} sub={P.itemsSub} />
            <Extra href="/shop/staff" icon={Smartphone} title={P.staff} sub={P.staffSub} locked={!(systems.staff_max ?? 0)} why={pro ? P.offHere : P.proOnly} />
            <Extra href="/shop/settings" icon={FileSpreadsheet} title={P.file} sub={P.fileSub} locked={!systems.export} why={pro ? P.offHere : P.proOnly} />
          </ul>
        </section>

        {!pro && (
          <section className="relative overflow-hidden rounded-[1.375rem] p-4 shadow-card" style={{ background: "linear-gradient(135deg,#fff6d3 0%,#ffe08a 45%,#f7c041 100%)", color: "#5a3700" }}>
            <b className="flex items-center gap-1.5 text-[1rem]">
              <Crown className="size-5" /> {PACK_NAME.pro}
            </b>
            <p className="mt-1 text-[0.8125rem] font-semibold leading-snug">{P.proLine}</p>
            {/* each price on its own chip: a number and its words side by side, right to left (one line of them read backwards) */}
            <p className="mt-2 flex flex-wrap gap-1.5 text-[0.8125rem] font-bold">
              {PRO_PLANS.map((p) => (
                <span key={p.id} className="rounded-full bg-white/60 px-2.5 py-0.5">
                  <span className="num">{p.price}</span> {t.payCurrency} / {monthsSaid(p.months)}
                </span>
              ))}
            </p>
            <Link href="/shop/pay?pack=pro" className="press mt-3 flex h-11 items-center justify-center rounded-[0.875rem] bg-[#5a3700] text-[0.9375rem] font-bold text-white">
              {P.proCall}
            </Link>
          </section>
        )}
      </div>
    </>
  );
}

/** an extra: its page, or, not in this shop's pack, locked with «Pro» */
function Extra({ href, icon: Icon, title, sub, locked = false, why = P.proOnly, tag = false }: { href: string; icon: LucideIcon; title: string; sub: string; locked?: boolean; why?: string; /** the Pro chip on a row still open (prizes of a draw left to hand over in Pointili) */ tag?: boolean }) {
  const inner = (
    <>
      <span className="grid size-9 shrink-0 place-items-center rounded-[0.75rem] bg-brand-soft text-brand">
        <Icon className="size-[1.125rem]" strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1">
        <b className="flex items-center gap-1.5 text-[0.9062rem]">
          {title}
          {((locked && why === P.proOnly) || tag) && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-[#fff2c7] px-2 py-px text-[0.6875rem] font-bold text-[#8a5a00]">
              <Lock className="size-3" /> {P.pro}
            </span>
          )}
        </b>
        <span className="block truncate text-[0.75rem] text-muted">{locked ? why : sub}</span>
      </span>
      {!locked && <ChevronLeft className="size-5 shrink-0 text-faint" />}
    </>
  );
  return <li>{locked ? <div className="flex items-center gap-3 px-3.5 py-3 opacity-75">{inner}</div> : <Link href={href} className="press flex items-center gap-3 px-3.5 py-3 active:bg-canvas">{inner}</Link>}</li>;
}
