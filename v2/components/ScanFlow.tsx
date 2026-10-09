"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, QrCode, ScanLine, WifiOff, X } from "lucide-react";
import { scan } from "@/app/actions";
import { Pass } from "@/components/Pass";
import { useScreen } from "@/components/Tracker";
import { Confetti, IMPACT_MS, StampLand } from "@/components/StampLand";
import { Icon3D, LinkBtn, Logo } from "@/components/ui";
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
export function ScanFlow({ token }: { token: string }) {
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
  if (res.kind === "held") return <Held token={token} res={res} />;
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
      <p className="mt-6 text-[1.125rem] font-semibold text-muted">{t.checking}</p>
    </div>
  );
}

function Stamped({ res }: { res: Extract<ScanResult, { kind: "stamped" }> }) {
  const { card, gift } = res;
  const title = gift ? fill(t.won, { gift: card.shop.gift ?? "" }) : t.newStamp;
  // a gift with a long name (up to 60 letters) takes two lines: smaller on a short screen, and the card gives way
  const long = title.length > 24;
  return (
    <div className="relative flex flex-col items-center text-center">
      <Confetti count={gift ? 70 : 36} delay={IMPACT_MS} />
      <StampLand color={card.shop.color} icon={kindIcon(card.shop.kind)} logo={card.shop.stamp_logo ? card.shop.logo : null} />
      <h1
        className={`mt-1 animate-rise text-balance text-[1.8rem] font-bold leading-tight [@media(max-height:700px)]:mt-0 ${long ? "[@media(max-height:700px)]:text-[1.5rem]" : ""}`}
        style={after(80)}
      >
        {title}
      </h1>
      <p className="animate-rise text-[1rem] font-semibold text-muted" style={after(140)}>
        {card.shop.name}
      </p>

      <div className={`mt-[2.4dvh] animate-rise text-start ${gift ? (long ? CARD_GIFT_LONG : CARD_GIFT) : CARD}`} style={after(220)}>
        <Pass shop={card.shop} stamps={card.stamps} fresh />
      </div>

      {/* the gift: one line to show at the counter, not a second card */}
      {gift && (
        <a
          href={`/c/${card.id}?show=1`}
          className="press relative mt-[1.8dvh] flex w-full animate-pop items-center justify-center gap-2 rounded-[1.125rem] bg-[linear-gradient(150deg,#ffa183,#ff6b4a)] px-4 py-2.5 text-[1.0312rem] font-bold text-white shadow-[0_14px_30px_-14px_rgb(255_107_74/0.8)] [@media(max-height:700px)]:mt-[1.4dvh] [@media(max-height:600px)]:py-2"
          style={after(420)}
        >
          <Icon3D name="gift" size={30} className="animate-float" /> {t.wonBody}
        </a>
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

/**
 * No account on this phone: the tampon lands all the same — it is theirs,
 * held for 20 minutes — and the only thing left is to keep it: make an
 * account, or open the one they have. Two buttons, nothing else.
 */
function Held({ token, res }: { token: string; res: Extract<ScanResult, { kind: "held" }> }) {
  const next = encodeURIComponent(`/s/${token}`);
  return (
    <div className="flex flex-col items-center text-center">
      <Logo className="mb-2 scale-90" />
      <StampLand color={res.color} icon={kindIcon(res.shopKind)} />
      <h1 className="mt-1 animate-rise text-[1.875rem] font-bold" style={after(80)}>
        {t.reserved}
      </h1>
      <p className="animate-rise text-[1.0625rem] font-semibold" style={{ ...after(140), color: res.color }}>
        {res.shop}
      </p>
      <p className="mt-3 animate-rise text-[1rem] text-body" style={after(200)}>
        {t.reservedBody}
      </p>
      <p className="mt-3 inline-flex animate-rise items-center gap-1.5 rounded-full bg-mint-soft px-3.5 py-1.5 text-[0.875rem] font-semibold text-mint" style={after(260)}>
        <Clock className="size-4" /> {t.reservedClock}
      </p>

      <div className="mt-8 w-full space-y-3">
        <div className="animate-rise" style={after(340)}>
          <LinkBtn href={`/join?next=${next}`} className="animate-breathe">
            {t.createAccount}
          </LinkBtn>
        </div>
        <div className="animate-rise" style={after(400)}>
          <LinkBtn href={`/login?next=${next}`} kind="soft">
            {t.haveAccount}
          </LinkBtn>
        </div>
      </div>
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
      <h1 className="mt-5 text-[1.625rem] font-bold">{v.title}</h1>
      {v.body && <p className="mt-2 max-w-xs text-balance text-[1rem] text-muted">{v.body}</p>}
      {card && (
        <div className={`mt-6 text-start ${CARD}`}>
          <Pass shop={card.shop} stamps={card.stamps} />
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
