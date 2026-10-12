"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, Keyboard, QrCode, RotateCcw, ScanLine, Undo2, X } from "lucide-react";
import { customerAt, give as handOver, giveAll, giveStamp, unstamp, type WaitingGift } from "@/app/actions";
import { storeGive } from "@/app/actions-store";
import { spinAtCounter } from "@/app/actions-wheel";
import { Wheel, type Prize } from "@/components/Wheel";
import { Pass } from "@/components/Pass";
import type { Item } from "@/components/PickItem";
import { TryItButton, type DemoShop } from "@/components/TryIt";
import { Scanner } from "@/components/Scanner";
import { Confetti } from "@/components/StampLand";
import { Btn, Icon3D } from "@/components/ui";
import { signal } from "@/lib/track";
import { fill, t } from "@/lib/t";
import { nextTampon } from "@/lib/when";
import type { CardView, Order, Said } from "@/lib/types";

type Step =
  | { kind: "idle" }
  | { kind: "looking" }
  | { kind: "unknown" }
  | { kind: "error"; text: string }
  | { kind: "own" }
  | { kind: "found"; name: string | null; card: CardView | null; waiting: WaitingGift | null }
  | { kind: "giving"; name: string | null; card: CardView | null; waiting: WaitingGift | null }
  | { kind: "done"; name: string | null; card: CardView; gift: boolean; waiting: WaitingGift | null; moment: number | null; item: string | null }
  | { kind: "undone"; name: string | null; card: CardView }
  | { kind: "soon"; name: string | null; at: string; card?: CardView; waiting: WaitingGift | null }
  | { kind: "handed"; name: string | null; gift: string; card: CardView | null; waiting: WaitingGift | null };

/** 6 digits are a customer's code; 8 (or 216 + 8) their number. */
const complete = (d: string) => d.length === 6 || d.length === 8 || (d.length === 11 && d.startsWith("216"));
/** A customer's own QR (…/u/123456), or the bare 6 digits. */
export const codeOf = (text: string): string | null => text.match(/\/u\/(\d{6})(?:[/?#]|$)/)?.[1] ?? (/^\s*\d{6}\s*$/.test(text) ? text.trim() : null);

/** A gift on the customer's card, still waiting (the owner said «موش توّا»): what it is, and the way back to the question. */
function GiftRow({ w, onOpen }: { w: WaitingGift; onOpen: () => void }) {
  return (
    <div className="mt-3 flex w-full animate-rise items-center gap-3 rounded-[1.375rem] bg-surface p-3 text-start shadow-card">
      <Icon3D name="gift" size={36} className="shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-[0.8125rem] font-semibold text-muted">{t.collectGiftWaits}</span>
        <span className="block truncate text-[1rem] font-bold">
          {w.gift}
          {(w.n ?? 1) > 1 && <span className="num text-coral"> ×{w.n}</span>}
        </span>
      </span>
      <button type="button" onClick={onOpen} className="press h-11 shrink-0 rounded-[1rem] bg-coral-soft px-4 text-[0.9375rem] font-bold text-coral">
        {t.collectGiftOpen}
      </button>
    </div>
  );
}

/**
 * The customer's code read (or typed) and a gift waits on the card: one
 * question over the screen — give it now, or not now. `won`: the tampon just
 * given was the last one.
 */
function GiftPop({ who, w, won, busy, onGive, onLater, prizes = [], onSpun }: { who: string; w: WaitingGift; won: boolean; busy: boolean; onGive: (all: boolean) => void; onLater: () => void; prizes?: Prize[]; onSpun?: (prize: string) => void }) {
  // a wheel shop, the turn not spun yet: the owner spins it here, in front of the customer — then it is the prize
  if (w.spin && prizes.length > 0 && onSpun) {
    return (
      <div className="fixed inset-0 z-50 flex animate-fade items-end justify-center bg-ink/45" role="dialog" aria-modal="true" aria-label={t.wheelAtCounter} onClick={onLater}>
        <div className="safe-b w-full max-w-md rounded-t-[1.75rem] bg-canvas px-[clamp(1rem,5vw,1.5rem)] pb-5 pt-[clamp(1rem,3dvh,1.75rem)] text-center" style={{ animation: "pop-up 380ms cubic-bezier(0.2,0.8,0.2,1) both" }} onClick={(e) => e.stopPropagation()}>
          <style>{`@keyframes pop-up { from { transform: translateY(100%); } to { transform: none; } }`}</style>
          <h2 className="text-balance text-[1.375rem] font-bold leading-tight">
            {who} · {t.wheelAtCounter}
          </h2>
          <p className="mb-3 mt-0.5 text-[0.9375rem] text-muted">{t.wheelAtCounterHint}</p>
          <div className="flex justify-center">
            <Wheel prizes={prizes} size="min(72vw, 34dvh, 19rem)" spin={() => spinAtCounter(w.id)} onDone={onSpun} />
          </div>
          <Btn type="button" kind="ghost" className="mt-2" onClick={onLater}>
            {t.popGiftLater}
          </Btn>
        </div>
      </div>
    );
  }
  // several saved: give them all at once, or one now and the rest another day
  const n = w.n ?? 1;
  const title = won && n === 1 ? fill(t.collectGift, { name: who, gift: w.gift ?? "" }) : n > 1 ? fill(t.popGiftHasMany, { name: who, n }) : fill(t.popGiftHas, { name: who });
  return (
    <div className="fixed inset-0 z-50 flex animate-fade items-end justify-center bg-ink/45" role="dialog" aria-modal="true" aria-label={title} onClick={onLater}>
      <div className="safe-b w-full max-w-md rounded-t-[1.75rem] bg-canvas px-[clamp(1rem,5vw,1.5rem)] pb-5 pt-[clamp(1rem,3dvh,1.75rem)] text-center" style={{ animation: "pop-up 380ms cubic-bezier(0.2,0.8,0.2,1) both" }} onClick={(e) => e.stopPropagation()}>
        <style>{`@keyframes pop-up { from { transform: translateY(100%); } to { transform: none; } }`}</style>
        <Icon3D name="gift" size={76} className="mx-auto animate-pop" />
        <h2 className="mt-2 text-balance text-[1.5rem] font-bold leading-tight">{title}</h2>
        {(!won || n > 1) && <p className="mt-1 text-balance text-[1.375rem] font-bold text-coral">{w.gift}</p>}
        <p className="mt-1.5 text-[1rem] text-muted">{t.popGiftAsk}</p>
        <div className="mt-[2.5dvh] space-y-1.5">
          <Btn type="button" kind="coral" onClick={() => onGive(n > 1)} disabled={busy}>
            {busy ? t.checking : n > 1 ? fill(t.popGiftGiveAll, { n }) : t.popGiftGive}
          </Btn>
          {n > 1 && (
            <Btn type="button" kind="soft" onClick={() => onGive(false)} disabled={busy}>
              {t.popGiftGiveOne}
            </Btn>
          )}
          <Btn type="button" kind="ghost" onClick={onLater} disabled={busy}>
            {t.popGiftLater}
          </Btn>
        </div>
      </div>
    </div>
  );
}

/**
 * A shop with a store, and the customer ordered from it: what they ordered,
 * over the screen — hand it over now, or not now (as with a gift).
 */
function OrderPop({ who, orders, busy, onGive, onLater }: { who: string; orders: Order[]; busy: boolean; onGive: () => void; onLater: () => void }) {
  const lines = orders.flatMap((o) => o.lines);
  return (
    <div className="fixed inset-0 z-50 flex animate-fade items-end justify-center bg-ink/45" role="dialog" aria-modal="true" aria-label={fill(t.storeHas, { name: who })} onClick={onLater}>
      <div className="safe-b w-full max-w-md rounded-t-[1.75rem] bg-canvas px-[clamp(1rem,5vw,1.5rem)] pb-5 pt-[clamp(1rem,3dvh,1.75rem)] text-center" style={{ animation: "pop-up 380ms cubic-bezier(0.2,0.8,0.2,1) both" }} onClick={(e) => e.stopPropagation()}>
        <style>{`@keyframes pop-up { from { transform: translateY(100%); } to { transform: none; } }`}</style>
        <Icon3D name="cart" size={72} className="mx-auto animate-pop" />
        <h2 className="mt-2 text-balance text-[1.5rem] font-bold leading-tight">{fill(t.storeHas, { name: who })}</h2>
        <ul className="mx-auto mt-3 max-h-[28dvh] max-w-xs space-y-1.5 overflow-y-auto text-start">
          {lines.map((l, i) => (
            <li key={i} className="flex items-center gap-2.5 rounded-[0.875rem] bg-surface px-3 py-2 shadow-card">
              <span className="num grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-[0.9375rem] font-bold text-brand">{l.qty}</span>
              <bdi className="min-w-0 flex-1 truncate text-[1.0625rem] font-bold">{l.name}</bdi>
            </li>
          ))}
        </ul>
        <div className="mt-[2.5dvh] space-y-1.5">
          <Btn type="button" onClick={onGive} disabled={busy}>
            {busy ? t.checking : t.storeGiveAll}
          </Btn>
          <Btn type="button" kind="ghost" onClick={onLater} disabled={busy}>
            {t.popGiftLater}
          </Btn>
        </div>
      </div>
    </div>
  );
}

function errorText(code?: string): string {
  if (code === "own_shop") return t.collectOwn;
  if (code === "paused") return t.pausedBanner;
  if (code === "shut") return `${t.trialOverTitle}. ${t.trialOverBody}`;
  if (code === "too_many") return t.errTooMany;
  if (code === "no_shop" || code === "no_card") return t.collectNoShop;
  return t.errNetwork;
}

/**
 * The shop gives the tampon itself, two ways: the camera on the customer's
 * own code (in their wallet), or the code typed — 6 digits, or simply their
 * phone number. Before the tampon, who it is and how far their card is; then
 * the tampon lands on the card (the gift, when it is the last one), and the
 * next customer is one tap away. A gift waiting on the card is handed over
 * from here, and only from here: the customer shows their code (the gift's
 * code in their wallet is the same one), and a question comes up — give it
 * now, or not now.
 */
export function Collect({ by, preset = "", shop, items = [], back, prizes = [] }: { by: "scan" | "code"; preset?: string; shop?: DemoShop; items?: Item[]; back?: string; prizes?: Prize[] }) {
  const [mode, setMode] = useState(by);
  const [digits, setDigits] = useState(preset.replace(/\D/g, "").slice(0, 11));
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const [round, setRound] = useState(0);
  const asked = useRef("");
  // the gift's question, over the screen; a gift the owner said «موش توّا» to is not asked again by itself
  const [pop, setPop] = useState<{ w: WaitingGift; won: boolean } | null>(null);
  // a store's orders waiting for this customer (asked first, before any gift)
  const [orders, setOrders] = useState<{ card: string; list: Order[] } | null>(null);
  const [ordersBusy, setOrdersBusy] = useState(false);
  const [ordersDone, setOrdersDone] = useState<string | null>(null);
  // who this customer is, by the shop's forms of identification (to check)
  const [said, setSaid] = useState<Said>([]);
  const later = useRef<number | null>(null);
  const ask = (w: WaitingGift | null | undefined, won = false) => {
    if (w && (won || later.current !== w.id)) setPop({ w, won });
  };

  // a complete code: who is it?
  useEffect(() => {
    if (!complete(digits) || asked.current === digits) return;
    const id = setTimeout(async () => {
      asked.current = digits;
      setStep({ kind: "looking" });
      const res = await customerAt(digits).catch(() => ({ ok: false, error: "network" }) as Awaited<ReturnType<typeof customerAt>>);
      if (asked.current !== digits) return;
      if (res.ok) {
        setStep({ kind: "found", name: res.name ?? null, card: res.card ?? null, waiting: res.waiting ?? null });
        setSaid(res.said ?? []);
        // an order from the store waits: that question first; else a gift waits: its question
        if (res.orders?.length && res.card) setOrders({ card: res.card.id, list: res.orders });
        else if (res.waiting && later.current !== res.waiting.id) setPop({ w: res.waiting, won: false });
      }
      else if (res.error === "unknown") {
        setStep({ kind: "unknown" });
        signal("collect_unknown", mode);
      } else if (res.error === "own_shop" && shop) {
        // the owner typed (or scanned) their own code: not a mistake to scold, the moment to show the customer's side
        setStep({ kind: "own" });
        signal("collect_own", mode);
      } else setStep({ kind: "error", text: errorText(res.error) });
    }, 220);
    return () => clearTimeout(id);
  }, [digits, mode, shop]);

  // a shop that says what it sells: the tampon is given by tapping what it was for (one tap, as at the counter)
  const give = async (item?: Item) => {
    if (step.kind !== "found" && step.kind !== "handed") return;
    const { name, card } = step;
    if (items.length && !item) {
      // after a gift handed over: back to the question «على شنوّة؟»
      setStep({ kind: "found", name, card, waiting: step.waiting });
      return;
    }
    setStep({ kind: "giving", name, card, waiting: null });
    const res = await giveStamp(digits, item?.id, back).catch(() => ({ ok: false, error: "network" }) as Awaited<ReturnType<typeof giveStamp>>);
    if (res.ok && res.card) {
      navigator.vibrate?.(60);
      setStep({ kind: "done", name: res.name ?? name, card: res.card, gift: !!res.gift, waiting: res.waiting ?? null, moment: res.moment ?? null, item: item?.name ?? null });
      signal("collect", `${mode}${res.gift ? " · gift" : ""}`);
      if (res.gift) ask(res.waiting, true);
    } else if (res.error === "too_soon" && res.next_at) {
      setStep({ kind: "soon", name: res.name ?? name, at: res.next_at, card: res.card, waiting: res.waiting ?? null });
      ask(res.waiting);
    } else setStep({ kind: "error", text: errorText(res.error) });
  };

  // the gift handed over at the counter: the card as it is now (the rest of the stamps carried on)
  const [handing, setHanding] = useState(false);
  const hand = async (w: WaitingGift, all = false) => {
    if (handing) return;
    setHanding(true);
    const ok = await (all ? giveAll(w.id) : handOver(w.id)).catch(() => false);
    setPop(null);
    if (!ok) {
      setHanding(false);
      setStep({ kind: "error", text: t.errNetwork });
      return;
    }
    navigator.vibrate?.(60);
    signal("collect_gift", mode);
    const now = await customerAt(digits).catch(() => null);
    setHanding(false);
    setStep({
      kind: "handed",
      name: (now?.ok ? now.name : null) ?? ("name" in step ? step.name : null),
      gift: all && (w.n ?? 1) > 1 ? `${w.gift ?? ""} ×${w.n}` : (w.gift ?? ""),
      card: now?.ok ? (now.card ?? null) : null,
      // a card with stamps to spare can hold the next gift already
      waiting: now?.ok ? (now.waiting ?? null) : null,
    });
  };

  // the tampon just given, taken back: a slip of the finger (the wrong customer, twice). Asked once; ten minutes
  const [undo, setUndo] = useState<"no" | "ask" | "busy">("no");
  const [undoSaid, setUndoSaid] = useState<string | null>(null);
  const takeBack = async () => {
    if (step.kind !== "done" || !step.moment) return;
    setUndo("busy");
    const res = await unstamp(step.moment).catch(() => ({ ok: false, error: "network" }) as Awaited<ReturnType<typeof unstamp>>);
    if (res.ok && res.card) {
      signal("collect_undo", mode);
      setUndo("no");
      setStep({ kind: "undone", name: step.name, card: res.card });
    } else {
      setUndo("no");
      setUndoSaid(res.error === "too_late" || res.error === "not_last" ? t.collectUndoLate : t.errNetwork);
    }
  };

  const again = () => {
    asked.current = "";
    later.current = null;
    setPop(null);
    setOrders(null);
    setOrdersDone(null);
    setSaid([]);
    setUndo("no");
    setUndoSaid(null);
    setDigits("");
    setStep({ kind: "idle" });
    setRound((r) => r + 1);
  };

  // the camera: a customer's code read → the same steps as typing it
  if (mode === "scan" && step.kind === "idle") {
    return (
      <Scanner
        key={round}
        back="/shop"
        title={t.collect}
        hint={t.collectScanHint}
        read={codeOf}
        onRead={(code) => {
          setDigits(code);
          setMode("scan");
          setStep({ kind: "looking" });
          asked.current = "";
        }}
      >
        <button type="button" onClick={() => setMode("code")} className="press mt-1 flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[0.9375rem] font-bold text-ink">
          <Keyboard className="size-5" /> {t.collectTypeShort}
        </button>
      </Scanner>
    );
  }

  const name = "name" in step ? step.name : null;
  const who = name ?? t.someone;

  return (
    <main className="safe-t safe-b relative mx-auto flex h-dvh w-full max-w-md flex-col px-[clamp(1rem,5vw,1.5rem)]">
      {((step.kind === "done" && step.gift) || step.kind === "handed") && <Confetti count={70} />}
      <header className="flex shrink-0 items-center gap-3 pt-2">
        <Link href="/shop" className="press grid size-11 shrink-0 place-items-center rounded-full bg-surface shadow-card" aria-label={t.back}>
          <ChevronRight className="size-5" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-[1.375rem] font-bold">{t.collect}</h1>
      </header>

      {/* two ways: the camera, or the code typed */}
      <div className="mt-[2dvh] grid shrink-0 grid-cols-2 gap-1 rounded-[1.125rem] bg-ink/[0.06] p-1">
        {(
          [
            { id: "scan", label: t.collectScanShort, icon: ScanLine },
            { id: "code", label: t.collectTypeShort, icon: Keyboard },
          ] as const
        ).map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => {
              if (x.id === "scan") again();
              setMode(x.id);
            }}
            className={`flex h-11 items-center justify-center gap-2 rounded-[0.875rem] text-[0.9688rem] font-bold ${mode === x.id ? "bg-surface text-ink shadow-card" : "text-muted"}`}
          >
            <x.icon className="size-5" /> {x.label}
          </button>
        ))}
      </div>

      {/* centred in the room left; on a screen too short for it, it starts under the two ways (my-auto), never over them */}
      <div className="flex min-h-0 flex-1 flex-col py-[2dvh]">
        {step.kind === "done" ? (
          <div className="my-auto flex flex-col items-center text-center">
            <span className="grid size-[clamp(3.5rem,10dvh,5rem)] animate-pop place-items-center rounded-full bg-mint text-white shadow-[0_16px_34px_-14px_rgb(18_183_106/0.8)]">
              {step.gift ? <Icon3D name="gift" size={46} /> : <Check className="size-10" strokeWidth={3} />}
            </span>
            <h2 className="mt-3 text-[1.625rem] font-bold">
              {step.gift ? (
                fill(t.collectGift, { name: who, gift: step.card.shop.gift ?? "" })
              ) : (
                <>
                  <bdi className="num">+1</bdi> {name ? fill(t.collectDone, { name }) : t.collectDoneAnon}
                </>
              )}
            </h2>
            {/* what it was for, written on the card's history and the owner's list */}
            {step.item && (
              <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3.5 py-1 text-[1rem] font-bold text-brand">
                <bdi>{step.item}</bdi>
              </p>
            )}
            {/* the card a little smaller on a short screen (ranges that do not overlap: the CSS lists them by size) */}
            <div className="mt-[2.5dvh] w-full text-start [@media(max-height:600px)]:[zoom:0.8] [@media(min-height:600.02px)_and_(max-height:700px)]:[zoom:0.85]">
              <Pass shop={step.card.shop} stamps={step.card.stamps} fresh />
            </div>
            {step.waiting && <GiftRow w={step.waiting} onOpen={() => setPop({ w: step.waiting!, won: false })} />}
            <div className="mt-[3dvh] w-full space-y-2 [@media(max-height:560px)]:mt-[2dvh] [@media(max-height:560px)]:space-y-1">
              <Btn type="button" onClick={again}>
                <RotateCcw className="size-5" /> {t.collectNext}
              </Btn>
              <Link href="/shop" className="block py-2 text-center text-[0.9375rem] font-semibold text-muted [@media(max-height:560px)]:py-1.5">
                {t.done}
              </Link>
            </div>
            {/* a slip of the finger: the tampon goes back, for ten minutes */}
            {step.moment && !undoSaid && undo === "no" && (
              <button type="button" onClick={() => setUndo("ask")} className="press mt-1 py-1.5 text-[0.875rem] font-semibold text-muted underline-offset-4 hover:underline">
                {t.collectUndo}
              </button>
            )}
            {step.moment && !undoSaid && undo !== "no" && (
              <div className="mt-2 w-full rounded-[1.125rem] bg-coral-soft px-4 py-3 text-center">
                <p className="text-[0.9375rem] font-semibold text-coral">{fill(t.collectUndoAsk, { name: who })}</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" disabled={undo === "busy"} onClick={() => setUndo("no")} className="press h-10 rounded-[0.875rem] bg-surface text-[0.9062rem] font-semibold">
                    {t.back}
                  </button>
                  <button type="button" disabled={undo === "busy"} onClick={() => void takeBack()} className="press h-10 rounded-[0.875rem] bg-coral text-[0.9062rem] font-bold text-white disabled:opacity-60">
                    {undo === "busy" ? t.checking : t.collectUndoYes}
                  </button>
                </div>
              </div>
            )}
            {undoSaid && <p className="mt-2 text-[0.875rem] font-semibold text-coral">{undoSaid}</p>}
          </div>
        ) : step.kind === "undone" ? (
          <div className="my-auto flex flex-col items-center text-center">
            <span className="grid size-[clamp(3.5rem,10dvh,5rem)] animate-pop place-items-center rounded-full bg-ink/[0.08] text-ink">
              <Undo2 className="size-9" strokeWidth={2.5} />
            </span>
            <h2 className="mt-3 text-[1.625rem] font-bold">{t.collectUndone}</h2>
            <p className="mt-1 text-[0.9375rem] text-muted">{t.collectUndoneBody}</p>
            <div className="mt-[2.5dvh] w-full text-start [@media(max-height:600px)]:[zoom:0.8] [@media(min-height:600.02px)_and_(max-height:700px)]:[zoom:0.85]">
              <Pass shop={step.card.shop} stamps={step.card.stamps} />
            </div>
            <div className="mt-[3dvh] w-full space-y-2">
              <Btn type="button" onClick={again}>
                <RotateCcw className="size-5" /> {t.collectNext}
              </Btn>
              <Link href="/shop" className="block py-2 text-center text-[0.9375rem] font-semibold text-muted">
                {t.done}
              </Link>
            </div>
          </div>
        ) : step.kind === "handed" ? (
          <div className="my-auto flex flex-col items-center text-center">
            <span className="grid size-[clamp(3.5rem,10dvh,5rem)] animate-pop place-items-center rounded-full bg-mint text-white">
              <Icon3D name="gift" size={46} />
            </span>
            <h2 className="mt-3 text-balance text-[1.625rem] font-bold">{fill(t.collectHanded, { name: who, gift: step.gift })}</h2>
            {step.card && (
              <div className="mt-[2.5dvh] w-full text-start [@media(max-height:600px)]:[zoom:0.8] [@media(min-height:600.02px)_and_(max-height:700px)]:[zoom:0.85]">
                <Pass shop={step.card.shop} stamps={step.card.stamps} />
              </div>
            )}
            {step.waiting && <GiftRow w={step.waiting} onOpen={() => setPop({ w: step.waiting!, won: false })} />}
            <div className="mt-[3dvh] w-full space-y-2">
              <Btn type="button" onClick={() => void give()}>
                {name ? fill(t.collectGive, { name }) : t.collectGiveAnon}
              </Btn>
              <Btn type="button" kind="soft" onClick={again}>
                <RotateCcw className="size-5" /> {t.collectNext}
              </Btn>
            </div>
          </div>
        ) : (
          <div className="my-auto">
            {mode === "code" && (
              <label className="block">
                <span className="mb-2 block text-center text-[0.9375rem] font-semibold text-muted">{t.collectInput}</span>
                <input
                  value={digits.length <= 6 ? digits.replace(/^(\d{3})(\d)/, "$1 $2") : digits.length === 8 ? digits.replace(/^(\d{2})(\d{3})(\d{3})$/, "$1 $2 $3") : digits}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 11);
                    if (v !== digits) {
                      asked.current = "";
                      setStep({ kind: "idle" });
                    }
                    setDigits(v);
                  }}
                  inputMode="numeric"
                  autoComplete="off"
                  autoFocus
                  placeholder="482 917"
                  aria-label={t.collectInput}
                  dir="ltr"
                  className="num block h-[4.25rem] w-full rounded-[1.375rem] bg-surface text-center text-[2rem] font-bold tracking-[0.12em] text-ink shadow-[var(--shadow-card),inset_0_0_0_1px_var(--color-line)] outline-none placeholder:font-semibold placeholder:text-faint focus:shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-brand)]"
                />
              </label>
            )}

            {/* who it is, and the tampon */}
            <div className="mt-[2.5dvh] min-h-[9.5rem]">
              {step.kind === "looking" && <p className="animate-pulse text-center text-[1rem] font-semibold text-muted">{t.collectLooking}</p>}
              {step.kind === "unknown" && (
                <div className="rounded-[1.375rem] bg-coral-soft px-4 py-3.5 text-center">
                  <p className="text-[1rem] font-bold text-coral">{t.collectUnknown}</p>
                  <p className="mt-1 text-[0.875rem] text-body">{t.collectUnknownHint}</p>
                  <Link href="/shop/qr" className="press mt-2.5 inline-flex h-10 items-center gap-1.5 rounded-full bg-surface px-4 text-[0.875rem] font-bold text-brand shadow-card">
                    <QrCode className="size-4" /> {t.showCode}
                  </Link>
                </div>
              )}
              {step.kind === "own" && shop && (
                <div className="rounded-[1.375rem] bg-brand-soft px-4 py-3.5 text-center">
                  <p className="text-[1rem] font-bold text-ink">{t.collectOwnTry}</p>
                  <p className="mt-1 text-[0.875rem] text-body">{t.collectOwnTryBody}</p>
                  <TryItButton shop={shop} className="press mt-2.5 inline-flex h-10 items-center gap-1.5 rounded-full bg-brand px-4 text-[0.875rem] font-bold text-white">
                    {t.trySee}
                  </TryItButton>
                </div>
              )}
              {step.kind === "error" && (
                <p className="flex items-center justify-center gap-2 rounded-[1.375rem] bg-coral-soft px-4 py-3.5 text-center text-[0.9688rem] font-semibold text-coral">
                  <X className="size-5 shrink-0" /> {step.text}
                </p>
              )}
              {step.kind === "soon" && (
                <>
                  <div className="rounded-[1.375rem] bg-surface px-4 py-3.5 text-center shadow-card">
                    <p className="text-[1.0625rem] font-bold">{who}</p>
                    <p className="mt-1 text-[0.9375rem] text-muted">{fill(t.collectSoon, { when: nextTampon(step.at) })}</p>
                  </div>
                  {step.waiting && <GiftRow w={step.waiting} onOpen={() => setPop({ w: step.waiting!, won: false })} />}
                </>
              )}
              {(step.kind === "found" || step.kind === "giving") && (
                <div className="animate-rise">
                  {ordersDone && (
                    <p className="mb-2 flex animate-pop items-center justify-center gap-2 rounded-[1.125rem] bg-mint-soft px-4 py-2.5 text-[0.9688rem] font-bold text-mint">
                      <Check className="size-5" strokeWidth={3} /> {ordersDone}
                    </p>
                  )}
                  <div className="flex items-center gap-3 rounded-[1.375rem] bg-surface p-3.5 shadow-card">
                    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[linear-gradient(145deg,#ffb18a,#ff6b4a)] text-[1.125rem] font-bold text-white">{(who[0] ?? "؟").toUpperCase()}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[1.125rem] font-bold">{who}</span>
                      {step.card ? (
                        <span className="num block text-[0.875rem] text-muted">
                          {Math.min(step.card.stamps, step.card.shop.goal ?? 0)}/{step.card.shop.goal}
                        </span>
                      ) : (
                        <span className="block text-[0.875rem] text-muted">{t.collectFirst}</span>
                      )}
                    </span>
                  </div>
                  {/* known by a form: their answers, to check before the tampon */}
                  {said.map((f, i) => (
                    <div key={i} className="mt-2 rounded-[1.125rem] bg-mint-soft px-3.5 py-2.5">
                      <p className="text-[0.8125rem] font-bold text-mint">{f.form}</p>
                      {f.fields.map((x, j) => (
                        <p key={j} className="flex justify-between gap-3 text-[0.9375rem]">
                          <span className="shrink-0 text-muted">{x.label}</span>
                          <bdi className="min-w-0 text-end font-bold">{x.value}</bdi>
                        </p>
                      ))}
                    </div>
                  ))}
                  {step.waiting && <GiftRow w={step.waiting} onOpen={() => setPop({ w: step.waiting!, won: false })} />}
                  {items.length > 0 ? (
                    // «على شنوّة التامبون؟» — tapping the thing gives the tampon for it
                    <div className="mt-3">
                      <p className="mb-1.5 text-center text-[0.9375rem] font-bold">{step.kind === "giving" ? t.checking : t.pickAsk}</p>
                      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${items.length === 4 ? 2 : Math.min(items.length, 3)}, minmax(0, 1fr))` }}>
                        {items.map((it) => (
                          <button
                            key={it.id}
                            type="button"
                            disabled={step.kind === "giving"}
                            onClick={() => void give(it)}
                            className="press flex min-h-[3rem] items-center justify-center rounded-[1rem] bg-brand px-2 text-center text-[1rem] font-bold leading-tight text-white shadow-[0_8px_18px_-10px_var(--color-brand)] disabled:opacity-60"
                          >
                            <span className="line-clamp-2">{it.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Btn type="button" onClick={() => void give()} disabled={step.kind === "giving"} className="mt-3 h-[3.75rem] text-[1.125rem]">
                      {step.kind === "giving" ? t.checking : name ? fill(t.collectGive, { name }) : t.collectGiveAnon}
                    </Btn>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {orders && (
        <OrderPop
          who={who}
          orders={orders.list}
          busy={ordersBusy}
          onGive={async () => {
            setOrdersBusy(true);
            const ok = await storeGive(orders.card).catch(() => false);
            setOrdersBusy(false);
            setOrders(null);
            if (ok) {
              navigator.vibrate?.(60);
              signal("store_give", mode);
              setOrdersDone(fill(t.storeGiven, { name: who }));
            } else setStep({ kind: "error", text: t.errNetwork });
          }}
          onLater={() => setOrders(null)}
        />
      )}
      {pop && (
        <GiftPop
          who={who}
          w={pop.w}
          won={pop.won}
          busy={handing}
          onGive={(all) => void hand(pop.w, all)}
          onLater={() => {
            later.current = pop.w.id;
            setPop(null);
          }}
          prizes={prizes}
          onSpun={(prize) => {
            navigator.vibrate?.([60, 40, 60]);
            signal("wheel_counter", prize);
            // the prize, now an ordinary gift waiting: the usual question, a moment later
            setTimeout(() => setPop((p) => (p ? { ...p, w: { ...p.w, gift: prize, spin: false } } : p)), 1400);
          }}
        />
      )}

      {mode === "code" && step.kind !== "done" && step.kind !== "handed" && step.kind !== "undone" && (
        <Link href="/shop/qr" className="mb-[2dvh] flex shrink-0 items-center justify-center gap-1.5 text-[0.875rem] font-semibold text-brand">
          <QrCode className="size-4" /> {t.collectOr}
        </Link>
      )}
    </main>
  );
}
