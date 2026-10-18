"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Clock, QrCode, ScanLine, WifiOff, X } from "lucide-react";
import Link from "next/link";
import { quickJoin, scan } from "@/app/actions";
import { spin } from "@/app/actions-wheel";
import { Sheet, SheetGo } from "@/components/Client";
import { Wheel } from "@/components/Wheel";
import { PhoneField } from "@/components/PhoneField";
import { Pass } from "@/components/Pass";
import { useScreen } from "@/components/Tracker";
import { Confetti, IMPACT_MS, StampLand } from "@/components/StampLand";
import { Btn, Field, Icon3D, LinkBtn } from "@/components/ui";
import { Trap } from "@/components/Trap";
import { fill, kindIcon, t } from "@/lib/t";
import { signal } from "@/lib/track";
import { nextTampon } from "@/lib/when";
import type { ScanResult } from "@/lib/types";

/** after the tampon hits: each line arrives in reading order */
const after = (ms: number) => ({ animationDelay: `${IMPACT_MS + ms}ms` });
/**
 * The card grows with the width, so on a short screen its width follows the
 * height too (the tampon above does the same by itself): the answer never
 * scrolls, and the card's text stays its real size. A gift won adds a line,
 * so its card gives a little more way.
 */
const CARD = "w-full max-w-[min(100%,50dvh)]";
const CARD_GIFT = "w-full max-w-[min(100%,44dvh)]";
const CARD_GIFT_LONG = "w-full max-w-[min(100%,44dvh)] [@media(max-height:700px)]:max-w-[min(100%,36dvh)]";
/** the coral line under the card: the gift to show at the counter, or the turn that opens the wheel */
const GIFT_LINE =
  "press relative mt-[1.8dvh] flex w-full animate-pop items-center justify-center gap-2 rounded-[1.125rem] bg-[linear-gradient(150deg,#ffa183,#ff6b4a)] px-4 py-2.5 text-[1.0625rem] font-bold text-white shadow-[0_14px_30px_-14px_rgb(255_107_74/0.8)] [@media(max-height:700px)]:mt-[1.4dvh] [@media(max-height:600px)]:py-2";

/** The answer this phone got for a code, kept for the tab: the back button brings the «stamped» screen back, not a second scan of a code already used. */
const kept = (token: string): ScanResult | null => {
  try {
    const raw = sessionStorage.getItem(`pt_scan:${token}`);
    return raw ? (JSON.parse(raw) as ScanResult) : null;
  } catch {
    return null;
  }
};
const keep = (token: string, r: ScanResult) => {
  try {
    if (r.kind === "stamped") sessionStorage.setItem(`pt_scan:${token}`, JSON.stringify(r));
  } catch {
    /* a browser that keeps nothing: the back button scans again */
  }
};

/** Scan → the tampon lands. One POST, then the answer — kept, so coming back to this page shows it again. */
export function ScanFlow({ token, known }: { token: string; known?: boolean }) {
  const [res, setRes] = useState<ScanResult | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // React dev mode runs effects twice; a code is sent once
    if (started.current) return;
    started.current = true;
    const before = kept(token);
    if (before) {
      // the kept answer, shown after this tick (an effect sets no state on its own)
      void Promise.resolve().then(() => setRes(before));
      return;
    }
    scan(token)
      .then((r) => {
        keep(token, r);
        setRes(r);
        if (r.kind === "stamped" && r.gift) signal("gift_won", r.card.shop.name);
      })
      .catch(() => setRes({ kind: "error", code: "network" }));
  }, [token]);
  useScreen(!res ? "checking" : res.kind === "error" ? `failed:${res.code}` : res.kind);

  if (!res) return <Checking />;
  if (res.kind === "stamped") return <Stamped res={res} />;
  if (res.kind === "held")
    return (
      <Held
        token={token}
        res={res}
        known={known}
        onDone={(r) => {
          keep(token, r);
          setRes(r);
        }}
      />
    );
  return <Failed res={res} />;
}

function Checking() {
  return (
    <div className="flex flex-col items-center text-center" role="status">
      <span className="relative grid size-28 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-brand/15" />
        <span className="grid size-20 place-items-center rounded-full bg-[linear-gradient(150deg,#9b7bff,#6c47ff_55%,#4a2ad6)] text-white shadow-[0_14px_30px_-12px_rgb(108_71_255/0.7)]">
          <ScanLine className="size-9" />
        </span>
      </span>
      <p className="mt-6 text-[1.0625rem] font-semibold text-muted">{t.checking}</p>
    </div>
  );
}

function Stamped({ res }: { res: Extract<ScanResult, { kind: "stamped" }> }) {
  const { card, gift, item } = res;
  /**
   * A wheel shop, and this scan filled the card: the turn is spun here (the
   * founder, 18 Oct 2026: «the client should see what he got from the scan»).
   * It used to send them to /c/[id] to spin, so the moment of winning was a
   * page away from the moment of scanning. Once it has stopped, the prize
   * stays on this screen, with the code to show at the counter.
   */
  const prizes = res.prizes ?? [];
  const turn = gift && card.shop.wheel && card.spin && prizes.length >= 2 ? card.spin : null;
  const [prize, setPrize] = useState<string | null>(card.won ?? null);
  const [sheet, setSheet] = useState(!!turn);
  const [spinning, setSpinning] = useState(false);
  const title = gift ? (card.shop.wheel ? (prize ? fill(t.wheelWon, { prize }) : t.wheelTitle) : fill(t.won, { gift: card.shop.gift ?? "" })) : t.newStamp;
  // a gift with a long name (up to 60 letters) takes two lines: smaller on a short screen, and the card gives way
  const long = title.length > 24;
  return (
    <div className="relative flex flex-col items-center text-center">
      {/* the confetti is the gift's: a tampon lands with its own little bounce */}
      {gift && <Confetti count={70} delay={IMPACT_MS} />}
      <StampLand color={card.shop.color} icon={kindIcon(card.shop.kind)} logo={card.shop.stamp_logo ? card.shop.logo : null} />
      <h1
        className={`mt-1 animate-rise text-balance text-[1.5rem] font-bold leading-tight [@media(max-height:700px)]:mt-0 ${long ? "[@media(max-height:700px)]:text-[1.5rem]" : ""}`}
        style={after(80)}
      >
        {title}
      </h1>
      {/* what the tampon was for (a shop that says what it sells): the customer sees it, not only «+1» */}
      {item && (
        <p className="mt-1 inline-flex animate-rise items-center gap-1.5 rounded-full bg-brand-soft px-3.5 py-1 text-[0.9375rem] font-bold text-brand" style={after(120)}>
          <span className="num">+1</span> · <bdi>{item}</bdi>
        </p>
      )}
      <p className="animate-rise text-[0.9375rem] font-semibold text-muted" style={after(140)}>
        {card.shop.name}
      </p>

      <div className={`mt-[2.4dvh] animate-rise text-start ${gift ? (long ? CARD_GIFT_LONG : CARD_GIFT) : CARD}`} style={after(220)}>
        {/* the scan that won the gift shows the card full; any other, the card as it is, its vouchers said */}
        <Pass shop={card.shop} stamps={gift ? (card.shop.goal ?? card.stamps) : card.stamps} waiting={gift ? 0 : card.waiting_n} fresh />
      </div>

      {/* the gift: one line to show at the counter, not a second card. On the wheel it is the turn
          itself — it opens the wheel back up here, and once spun it is the prize and its code */}
      {gift && (
        turn && !prize ? (
          <button type="button" onClick={() => setSheet(true)} className={GIFT_LINE} style={after(420)}>
            <Icon3D name="party" size={30} className="animate-float" /> {t.wheelGo}
          </button>
        ) : (
          <a href={`/c/${card.id}?show=1`} className={GIFT_LINE} style={after(420)}>
            <Icon3D name="gift" size={30} className="animate-float" /> {prize ? t.wheelShow : t.wonBody}
          </a>
        )
      )}

      {/* the wheel, where the scan happened */}
      {turn && sheet && (
        <Sheet
          title={prize ? fill(t.wheelWon, { prize }) : t.wheelTitle}
          under={prize ? t.wheelShow : t.wheelHint}
          tone={prize ? "coral" : "brand"}
          // mid-spin it holds: the server has already drawn the prize, and a tap away would lose the sight of it
          hold={spinning}
          onClose={() => setSheet(false)}
          action={prize ? <SheetGo tone="coral" href={`/c/${card.id}?show=1`}>{t.wheelShow}</SheetGo> : undefined}
          dismiss={prize ? t.done : undefined}
        >
          {prize && <Confetti count={110} />}
          <div className="mt-3 flex justify-center">
            <Wheel
              prizes={prizes}
              size="min(72vw, 38dvh, 19rem)"
              spin={async () => {
                setSpinning(true);
                const r = await spin(turn, card.id);
                if (!r) setSpinning(false);
                return r;
              }}
              onDone={(won) => {
                setSpinning(false);
                setPrize(won);
                navigator.vibrate?.([60, 40, 60]);
                signal("wheel_won", won);
              }}
            />
          </div>
        </Sheet>
      )}

      <div className="mt-[3dvh] w-full animate-rise space-y-1.5 [@media(max-height:660px)]:mt-[2dvh]" style={after(500)}>
        <LinkBtn href={`/c/${card.id}`} kind={gift ? "soft" : "main"}>
          {t.seeCard}
        </LinkBtn>
        <LinkBtn href="/" kind="ghost" className="[@media(max-height:700px)]:h-11">
          {t.done}
        </LinkBtn>
      </div>
    </div>
  );
}

/** The 20 minutes the code is held for this phone, counted down from the moment the answer came. */
const HOLD_S = 20 * 60;
function useHoldLeft(): number {
  const [left, setLeft] = useState(HOLD_S);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const l = Math.max(0, HOLD_S - Math.floor((Date.now() - start) / 1000));
      setLeft(l);
      if (l === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return left;
}

/**
 * No account on this phone: the tampon lands all the same — held for 20
 * minutes — and it must be plain that it is not theirs yet. One short step
 * on this very screen: a name, a phone number and a password, and the tampon
 * is theirs. A phone that had an account is offered the way back in first.
 * The minutes run down above it.
 */
function Held({ token, res, known, onDone }: { token: string; res: Extract<ScanResult, { kind: "held" }>; known?: boolean; onDone: (r: ScanResult) => void }) {
  const next = encodeURIComponent(`/s/${token}`);
  const left = useHoldLeft();
  const gone = left === 0;
  const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  // a phone that had an account: the way back in first, the short form one tap away
  const [form, setForm] = useState(!known);
  const [name, setName] = useState("");
  // kept by hand: the form is sent by code, and a mistake elsewhere never empties it
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ error: string; field?: string } | null>(null);
  const send = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData(e.currentTarget);
      const r = await quickJoin(token, name, String(fd.get("phone") ?? ""), password, String(fd.get("pl_site") ?? ""));
      if (r.ok) {
        signal("quick_join", r.res.kind);
        onDone(r.res);
      } else {
        signal("form_error", `quick-join · ${r.field ?? "form"} · ${r.error}`);
        setErr(r);
      }
    } catch {
      setErr({ error: t.errNetwork });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col items-center text-center">
      <StampLand color={res.color} icon={kindIcon(res.shopKind)} size={80} />
      {/* one title, the shop, and one quiet line: what to do, and how long it waits (the founder's «simpler», 17 Oct 2026) */}
      <h1 className="mt-1 animate-rise text-[1.625rem] font-bold leading-tight" style={after(80)}>
        {t.heldTitle}
      </h1>
      <p className="animate-rise text-[0.9375rem] font-semibold" style={{ ...after(140), color: res.color }}>
        {res.shop}
      </p>
      <p className={`mt-1.5 flex animate-rise items-center justify-center gap-1.5 text-[0.8125rem] ${gone ? "font-semibold text-coral" : "text-muted"}`} style={after(200)}>
        <Clock className="size-4 shrink-0" />
        {gone ? (
          t.heldGone
        ) : (
          <>
            {form ? t.heldQuickMust : t.heldMust} · <bdi className="num tabular-nums">{fill(t.heldKeep, { clock })}</bdi>
          </>
        )}
      </p>

      {form ? (
        // noValidate: the browser's own bubbles never show inside Facebook's browser; each mistake is said under its field
        <form onSubmit={(e) => void send(e)} noValidate className="mt-[1.8dvh] w-full animate-rise space-y-[1.2dvh] text-start" style={after(320)}>
          <Trap />
          <Field label={t.name} name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePh} autoComplete="name" maxLength={60} error={err?.field === "name" ? err.error : null} className="!h-[3.25rem]" />
          <PhoneField label={t.phone} error={err?.field === "phone" ? err.error : null} compact />
          <Field label={t.password} name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t.passwordPh} autoComplete="new-password" minLength={8} error={err?.field === "password" ? err.error : null} className="!h-[3.25rem]" />
          {err?.field === "phone" && err.error === t.errTaken && (
            <Link href={`/login?next=${next}`} className="block px-1 text-[0.9375rem] font-semibold text-brand">
              {t.toLogin}
            </Link>
          )}
          {err && !err.field && <p className="rounded-2xl bg-coral-soft px-4 py-2.5 text-[0.9375rem] font-medium text-coral">{err.error}</p>}
          <Btn type="submit" disabled={busy || gone} className="held-go relative h-[3.5rem] overflow-hidden text-[1.0625rem] font-bold">
            <span className="relative">{busy ? t.checking : t.quickGo}</span>
            {!busy && <ArrowLeft className="held-arrow relative size-5" strokeWidth={2.6} />}
          </Btn>
          <Link href={`/login?next=${next}`} className="press flex h-10 items-center justify-center text-[0.9375rem] font-semibold text-muted">
            {t.haveAccountLogin}
          </Link>
        </form>
      ) : (
        <div className="mt-[2.4dvh] w-full animate-rise space-y-2" style={after(340)}>
          <LinkBtn href={`/login?next=${next}`} className="held-go relative h-[3.75rem] overflow-hidden text-[1.0625rem] font-bold">
            <span className="relative">{t.comeBackIn}</span>
            <ArrowLeft className="held-arrow relative size-5" strokeWidth={2.6} />
          </LinkBtn>
          <Btn type="button" kind="soft" onClick={() => setForm(true)} className="h-[3.25rem]">
            {t.newHere}
          </Btn>
        </div>
      )}
      <style>{`
        /* the way on shines and points */
        .held-go::before { content: ""; position: absolute; inset: 0; background: linear-gradient(105deg, transparent 35%, rgb(255 255 255 / 0.38) 50%, transparent 65%); transform: translateX(120%); animation: held-shine 3s ease-in-out 1.8s infinite; }
        @keyframes held-shine { 0% { transform: translateX(120%); } 45%, 100% { transform: translateX(-120%); } }
        .held-arrow { animation: held-nudge 1.4s ease-in-out infinite; }
        @keyframes held-nudge { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(-5px); } }
        @media (prefers-reduced-motion: reduce) { .held-go::before, .held-arrow { animation: none; } }
      `}</style>
    </div>
  );
}

function Failed({ res }: { res: Extract<ScanResult, { kind: "error" }> }) {
  const { code, card } = res;
  const view: Record<string, { icon: typeof X; title: string; body?: string }> = {
    used: { icon: QrCode, title: t.errUsed, body: t.errUsedBody },
    expired: { icon: Clock, title: t.errExpired, body: t.errExpiredBody },
    too_soon: {
      icon: Clock,
      title: t.errSoon,
      body: res.next_at ? fill(t.errSoonBody, { when: nextTampon(res.next_at) }) : undefined,
    },
    done: { icon: QrCode, title: t.errDone },
    own_shop: { icon: X, title: t.errOwn, body: t.errOwnBody },
    paused: { icon: X, title: t.errPaused },
    network: { icon: WifiOff, title: t.errNetwork },
  };
  const v = view[code] ?? { icon: X, title: t.errInvalid };
  const Icon = v.icon;
  return (
    <div className="flex flex-col items-center text-center">
      <span className="grid size-24 animate-pop place-items-center rounded-full bg-coral-soft text-coral">
        <Icon className="size-11" />
      </span>
      <h1 className="mt-5 text-[1.5rem] font-bold">{v.title}</h1>
      {v.body && <p className="mt-2 max-w-xs text-balance text-[0.9375rem] text-muted">{v.body}</p>}
      {card && (
        <div className={`mt-6 text-start ${CARD}`}>
          <Pass shop={card.shop} stamps={card.stamps} waiting={card.waiting_n} />
        </div>
      )}
      <div className="mt-8 w-full space-y-2.5">
        {card ? (
          <LinkBtn href={`/c/${card.id}`}>{t.seeCard}</LinkBtn>
        ) : (
          <LinkBtn href="/scan">
            <ScanLine className="size-5" /> {t.scanAgain}
          </LinkBtn>
        )}
        <LinkBtn href="/" kind="ghost">
          {t.done}
        </LinkBtn>
      </div>
    </div>
  );
}
