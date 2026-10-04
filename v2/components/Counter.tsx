"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ArrowDown, Check, ChevronRight, WifiOff } from "lucide-react";
import { give } from "@/app/actions";
import { Confetti } from "@/components/StampLand";
import { useScreen } from "@/components/Tracker";
import { ShopMark } from "@/components/ShopMark";
import { Icon3D } from "@/components/ui";
import { seenBefore, shown } from "@/lib/once";
import { fill, t } from "@/lib/t";

type Code = { id: string; svg: string; expiresLocal: number };
type Flash = { id: number; name: string | null };
type Gift = { id: number; name: string | null; gift: string };

/** a code is replaced this long before it dies, so a phone never scans a dead one */
const RENEW_BEFORE_MS = 10_000;
/** a code still good for a while: shown now, it lives long enough to be scanned */
const fresh = (c: Code | null): c is Code => !!c && c.expiresLocal - Date.now() > RENEW_BEFORE_MS;
/** how often the counter asks, with the radio on (a safety net) and without it */
const ASK_LIVE_MS = 6_000;
const ASK_DEAF_MS = 1_500;
/** a paused shop: how often it checks whether the founder switched it back on */
const ASK_PAUSED_MS = 20_000;
/** the bravo after a new card: how long before the code shows by itself */
const BRAVO_MS = 3600;

/** One radio for the page: Realtime only, no sign-in of its own. */
let radio: SupabaseClient | null = null;
function tuneIn(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  radio ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "pointili-counter-radio" } });
  return radio;
}

/**
 * The owner's one screen. A code that works once, in the shop's colour: open
 * it and leave it. Every scan bursts «+1 سامي» out from behind the code (the
 * code itself never moves, so the next phone can scan at once) and a fresh
 * code takes its place at once: the next one is always made in advance, and
 * the database names the code the moment a phone takes it, so a used code
 * never stays on the screen. When a card fills up, the gift waits at the
 * bottom of the screen until the owner taps «عطيتو».
 *
 * It hears every scan at once over Supabase Realtime (the shop's own topic,
 * pinged by the database) and only then asks what happened; a slow question
 * every few seconds stays as a safety net, and a fast one when the radio is
 * off. A hidden screen asks nothing.
 *
 * Right after a new card (`welcome` = the owner's first name), a bravo covers
 * the screen and fades by itself onto the code; then one note takes the
 * title's place, above the code — never on it: try it with another phone.
 * Everything fits one screen: when a gift waits, the title steps aside and
 * the code gets smaller, so the gift sits under the code, not over it.
 */
export function Counter({ shop, welcome, tip }: { shop: { id: string; name: string; kind: string; color: string; paused?: boolean; signal?: string; logo?: string | null }; welcome?: string | null; tip?: boolean }) {
  // `tip`: the owner pressed «ورّي الكود» on the welcome at home, so the bravo
  // already happened there and only the note about the code is left
  const [coach, setCoach] = useState<"bravo" | "leaving" | "tip" | null>(() =>
    tip && !seenBefore("coach", shop.id) ? "tip" : welcome != null && !seenBefore("coach", shop.id) ? "bravo" : null,
  );
  // the name, kept: the address drops ?welcome at once
  const [name] = useState(welcome);
  const [code, setCode] = useState<Code | null>(null);
  const [flashes, setFlashes] = useState<Flash[]>([]);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [offline, setOffline] = useState(false);
  const [paused, setPaused] = useState(!!shop.paused);
  const [giving, setGiving] = useState(false);
  const [giveFailed, setGiveFailed] = useState(false);
  const [live, setLive] = useState(false);
  const [party, setParty] = useState(0);
  const codeRef = useRef<Code | null>(null);
  // the next code, made in advance: the swap after a scan waits for nothing
  const spareRef = useRef<Code | null>(null);
  const sparing = useRef(false);
  const seen = useRef(new Set<number>());
  const openedAt = useRef(new Date().toISOString());
  const busy = useRef(false);
  const again = useRef(false);

  const fetchCode = useCallback(async (): Promise<Code | "paused"> => {
    const res = await fetch("/api/code", { method: "POST", cache: "no-store" });
    const j = await res.json();
    if (j.error === "paused") return "paused";
    if (!j.ok) throw new Error(j.error ?? "network");
    const offset = Date.parse(j.server_now) - Date.now();
    return { id: j.id, svg: j.svg, expiresLocal: Date.parse(j.expires_at) - offset };
  }, []);

  // the next code, kept ready (made again when it gets old)
  const prepare = useCallback(async () => {
    if (sparing.current || (spareRef.current && spareRef.current.expiresLocal - Date.now() > 2 * RENEW_BEFORE_MS)) return;
    sparing.current = true;
    try {
      const c = await fetchCode();
      if (c !== "paused") spareRef.current = c;
    } catch {
      /* the next tick tries again */
    } finally {
      sparing.current = false;
    }
  }, [fetchCode]);

  const show = useCallback((c: Code) => {
    codeRef.current = c;
    setCode(c);
  }, []);

  const mint = useCallback(async () => {
    const spare = spareRef.current;
    spareRef.current = null;
    if (fresh(spare)) {
      setPaused(false);
      show(spare);
    } else {
      const c = await fetchCode();
      if (c === "paused") {
        setPaused(true);
        return;
      }
      setPaused(false);
      show(c);
    }
    void prepare();
  }, [fetchCode, prepare, show]);

  // a phone just took the code on screen: the next one goes up this instant (or the screen
  // clears until it comes), never the used one
  const swapNow = useCallback(() => {
    const spare = spareRef.current;
    spareRef.current = null;
    if (fresh(spare)) show(spare);
    else {
      codeRef.current = null;
      setCode(null);
    }
    void prepare();
  }, [prepare, show]);

  const tick = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    if (busy.current) {
      // a ping during a question: ask once more right after
      again.current = true;
      return;
    }
    busy.current = true;
    try {
      const c = codeRef.current;
      if (!c || c.expiresLocal - Date.now() < RENEW_BEFORE_MS) {
        await mint();
      } else {
        const res = await fetch(`/api/counter?code=${c.id}&since=${encodeURIComponent(openedAt.current)}`, { cache: "no-store" });
        if (!res.ok) throw new Error("state");
        const s = (await res.json()) as { taken: boolean; expired: boolean; stamps: { id: number; name: string | null }[]; gifts: Gift[] };
        // the code on screen changed while asking (the radio swapped it): its answer is about the old one
        const same = codeRef.current?.id === c.id;
        const fresh = s.stamps.filter((x) => !seen.current.has(x.id));
        if (fresh.length) {
          fresh.forEach((x) => seen.current.add(x.id));
          const shown = fresh.slice(-2);
          setFlashes((f) => [...f, ...shown]);
          navigator.vibrate?.(60);
          setTimeout(() => setFlashes((f) => f.filter((x) => !shown.some((y) => y.id === x.id))), 2600);
        }
        setGifts((g) => {
          if (s.gifts.length > g.length) setParty((p) => p + 1);
          return s.gifts;
        });
        if (same && (s.taken || s.expired)) await mint();
        else void prepare();
      }
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      busy.current = false;
      if (again.current) {
        again.current = false;
        setTimeout(() => void tickRef.current(), 0);
      }
    }
  }, [mint, prepare]);
  const tickRef = useRef(tick);
  const swapRef = useRef(swapNow);
  useEffect(() => {
    swapRef.current = swapNow;
  }, [swapNow]);
  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  // the radio: the database pings "pointili:<signal>" on every scan
  useEffect(() => {
    if (!shop.signal || paused) return;
    const sb = tuneIn();
    if (!sb) return;
    const channel = sb
      .channel(`pointili:${shop.signal}`)
      .on("broadcast", { event: "ping" }, (msg) => {
        // the code on screen was just taken (held or used): the next one, now
        const taken = (msg?.payload as { code?: string } | undefined)?.code;
        if (taken && taken === codeRef.current?.id) swapRef.current();
        void tickRef.current();
      })
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => {
      setLive(false);
      void sb.removeChannel(channel);
    };
  }, [shop.signal, paused]);

  // paused by the founder: look now and then whether it is back on
  useEffect(() => {
    if (!paused) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void mint().catch(() => {});
    }, ASK_PAUSED_MS);
    return () => clearInterval(id);
  }, [paused, mint]);

  useEffect(() => {
    if (paused) return;
    const first = setTimeout(tick, 0);
    const poll = setInterval(tick, live ? ASK_LIVE_MS : ASK_DEAF_MS);
    const wake = () => document.visibilityState === "visible" && void tick();
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", wake);
    let lock: WakeLockSentinel | null = null;
    const awake = async () => {
      try {
        if (document.visibilityState === "visible" && "wakeLock" in navigator) lock = await navigator.wakeLock.request("screen");
      } catch {
        /* not allowed: the code still works */
      }
    };
    void awake();
    document.addEventListener("visibilitychange", awake);
    return () => {
      clearTimeout(first);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", wake);
      document.removeEventListener("visibilitychange", awake);
      window.removeEventListener("online", wake);
      void lock?.release().catch(() => {});
    };
  }, [tick, paused, live]);

  // the coaching is once in a lifetime, whichever half shows: written down the
  // moment it appears, and the address loses its flag, so neither a reload nor
  // the back button brings it back
  const claimed = useRef(false);
  useEffect(() => {
    if ((coach !== "bravo" && coach !== "tip") || claimed.current) return;
    claimed.current = true;
    shown("coach", shop.id);
    window.history.replaceState(null, "", "/shop/qr");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // the bravo fades onto the code by itself
  function showCode() {
    setCoach("leaving");
    setTimeout(() => setCoach("tip"), 450);
  }
  useEffect(() => {
    if (coach !== "bravo") return;
    const id = setTimeout(showCode, BRAVO_MS);
    return () => clearTimeout(id);
  }, [coach]);

  const hand = async (g: Gift) => {
    setGiving(true);
    setGiveFailed(false);
    const ok = await give(g.id).catch(() => false);
    setGiving(false);
    if (ok) setGifts((list) => list.filter((x) => x.id !== g.id));
    else setGiveFailed(true);
  };

  useScreen(coach === "bravo" || coach === "leaving" ? "bravo" : coach === "tip" ? "tip" : "code");

  const latest = flashes[flashes.length - 1];
  const gift = gifts[0];
  // the code's size: as wide as the screen lets it, smaller when a gift needs room under it. On a
  // short screen its box gives way to the rest (the only thing in the column that does), and the
  // code inside stays square at whatever the box has left: as large as it can be, never covered
  const qr = gift ? "min(60vw, 22rem)" : "min(78vw, 30rem)";

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden text-white"
      style={{ background: `linear-gradient(170deg, color-mix(in oklab, ${shop.color} 70%, white) -10%, ${shop.color} 42%, color-mix(in oklab, ${shop.color} 60%, black) 110%)` }}
    >
      <style>{`
        @keyframes ct-ring { 0% { transform: scale(0.85); opacity: 0.7; } 100% { transform: scale(1.5); opacity: 0; } }
        @keyframes ct-pill { 0% { transform: translateY(20px) scale(0.5); opacity: 0; } 60% { transform: translateY(-6px) scale(1.12); opacity: 1; } 100% { transform: none; opacity: 1; } }
        @keyframes ct-in { 0% { transform: translateY(14px); opacity: 0; } 100% { transform: none; opacity: 1; } }
        @keyframes ct-bar { from { transform: scaleX(0); } to { transform: scaleX(1); } }
      `}</style>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_45%_at_50%_0%,rgb(255_255_255/0.2),transparent_70%)]" aria-hidden />
      {party > 0 && <Confetti key={party} count={50} />}

      <header className="safe-t relative z-10 flex shrink-0 items-center gap-3 px-[clamp(1rem,5vw,1.5rem)] pt-2">
        <Link href="/shop" className="press grid size-11 shrink-0 place-items-center rounded-full bg-white/15 hover:bg-white/25" aria-label={t.back}>
          <ChevronRight className="size-5" />
        </Link>
        <p className="min-w-0 flex-1 truncate text-center text-[1.1875rem] font-bold">{shop.name}</p>
        <Link href="/me" aria-label={t.account} className="press grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-white/20">
          <ShopMark shop={shop} size={28} />
        </Link>
      </header>

      <main className="safe-b relative z-10 mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col items-center justify-center gap-[2.4dvh] px-[clamp(1rem,5vw,1.5rem)] py-[2dvh]">
        {coach === "tip" ? (
          // the note takes the title's place: above the code, never on it
          <div className="w-full rounded-[1.375rem] bg-surface p-4 text-ink shadow-[0_14px_40px_-12px_rgb(0_0_0/0.45)]" style={{ animation: "ct-in 420ms cubic-bezier(0.2,0.8,0.2,1) both" }} role="dialog" aria-label={t.coachTipTitle}>
            <p className="flex items-center gap-2 text-[1.0312rem] font-bold leading-snug">
              <span className="grid size-7 shrink-0 animate-bounce place-items-center rounded-full bg-brand-soft text-brand">
                <ArrowDown className="size-4" strokeWidth={2.8} />
              </span>
              {t.coachTipTitle}
            </p>
            <p className="mt-1.5 flex items-center gap-2 text-[0.875rem] leading-relaxed text-body">
              <Icon3D name="phone" size={28} className="shrink-0" />
              {t.coachTip}
            </p>
            <button
              type="button"
              onClick={() => setCoach(null)}
              className="press mt-2.5 h-10 w-full rounded-[0.875rem] bg-brand text-[0.9375rem] font-bold text-white shadow-[0_10px_22px_-10px_rgb(108_71_255/0.8)]"
            >
              {t.coachTipOk}
            </button>
          </div>
        ) : (
          !gift && <h1 className="text-center text-[clamp(1.6rem,4.6dvh,2.6rem)] font-bold leading-tight">{t.counterTitle}</h1>
        )}

        <div className="flex min-h-0 shrink items-center justify-center transition-[width,height] duration-500 [container-type:size]" style={{ width: qr, height: qr }}>
          <div className="relative aspect-square" style={{ width: "min(100cqw, 100cqh)" }}>
            {flashes.map((f) => (
              <span key={f.id} className="absolute inset-0 rounded-[2.125rem] border-[6px] border-white" style={{ animation: "ct-ring 900ms ease-out both" }} />
            ))}
            <div className="absolute inset-0 rounded-[2.125rem] bg-white p-[5%] shadow-[0_30px_60px_-20px_rgb(0_0_0/0.45)]">
              {paused ? (
                <div className="grid size-full place-items-center p-6 text-center">
                  <p className="text-[1.1875rem] font-bold text-ink">{t.pausedBanner}</p>
                </div>
              ) : code ? (
                <div key={code.id} className={`size-full animate-fade [&>svg]:size-full ${offline ? "opacity-25" : ""}`} dangerouslySetInnerHTML={{ __html: code.svg }} role="img" aria-label={t.counterTitle} data-qr="1" />
              ) : (
                <div className="grid size-full place-items-center">
                  <span className="size-12 animate-spin rounded-full border-4 border-line border-t-brand" />
                </div>
              )}
              {offline && (
                <div className="absolute inset-0 grid place-items-center">
                  <p className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-[0.9375rem] font-semibold text-white">
                    <WifiOff className="size-5" /> {t.reconnecting}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex h-12 shrink-0 items-center">
          {latest ? (
            <p key={latest.id} className="flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-[1.125rem] font-bold" style={{ color: shop.color, animation: "ct-pill 520ms cubic-bezier(0.2,0.9,0.3,1.3) both" }} role="status">
              <Check className="size-5" strokeWidth={3} /> <span className="num">+1</span> {latest.name ?? t.someone}
            </p>
          ) : (
            <p className="max-w-xs text-center text-[0.9375rem] text-white/80">{t.counterHint}</p>
          )}
        </div>

        {/* a gift to hand over: under the code, in the page, never over the code */}
        {gift && (
          <div className="w-full shrink-0 rounded-[1.75rem] bg-surface p-[1.1rem] text-center text-ink shadow-[0_-10px_40px_-10px_rgb(0_0_0/0.35)]" style={{ animation: "ct-in 480ms cubic-bezier(0.2,0.8,0.2,1) both" }}>
            <p className="flex items-center justify-center gap-2 text-[1.25rem] font-bold leading-tight">
              <Icon3D name="gift" size={36} className="animate-float" />
              {fill(t.giftFor, { who: gift.name ?? t.someone, gift: gift.gift })}
            </p>
            <p className="mt-0.5 text-[0.9375rem] text-muted">{t.giveNow}</p>
            <button type="button" disabled={giving} onClick={() => void hand(gift)} className="press mt-3 h-[3.4rem] w-full rounded-[1.25rem] bg-[linear-gradient(150deg,#ffa183,#ff6b4a)] text-[1.1875rem] font-bold text-white shadow-[0_14px_30px_-12px_rgb(255_107_74/0.7)] disabled:opacity-60">
              {t.given}
            </button>
            {giveFailed && <p className="mt-2 text-[0.875rem] font-medium text-coral">{t.errNetwork}</p>}
            {gifts.length > 1 && <p className="num mt-1.5 text-[0.8125rem] text-muted">+{gifts.length - 1}</p>}
          </div>
        )}
      </main>

      {/* right after a new card: the bravo, over everything, fading by itself onto the code */}
      {(coach === "bravo" || coach === "leaving") && (
        <div className={`safe-t safe-b fixed inset-0 z-50 flex flex-col items-center justify-center bg-canvas px-[clamp(1.25rem,6vw,1.75rem)] text-center text-ink transition-[opacity,transform] duration-[450ms] ${coach === "leaving" ? "scale-[1.04] opacity-0" : "animate-fade"}`} role="dialog" aria-modal="true">
          <Confetti count={70} />
          <Icon3D name="trophy" size={92} className="animate-pop" />
          <h1 className="mt-[2dvh] animate-rise text-[2.1rem] font-bold" style={{ animationDelay: "150ms" }}>
            {name ? fill(t.coachBravo, { name }) : t.coachBravoAnon}
          </h1>
          <p className="mt-1 animate-rise text-[1.125rem] font-semibold text-body" style={{ animationDelay: "400ms" }}>
            {t.coachReady}
          </p>
          <p className="mt-[2.5dvh] max-w-[17rem] animate-rise text-[1rem] leading-relaxed text-muted" style={{ animationDelay: "800ms" }}>
            {t.coachShow}
          </p>
          <div className="mt-[4dvh] h-1 w-40 overflow-hidden rounded-full bg-line" aria-hidden>
            <span className="block h-full origin-right rounded-full bg-brand" style={{ animation: `ct-bar ${BRAVO_MS}ms linear both` }} />
          </div>
          <button type="button" onClick={showCode} className="press mt-4 px-6 py-2 text-[1rem] font-bold text-brand">
            {t.coachShowCta}
          </button>
        </div>
      )}
    </div>
  );
}
