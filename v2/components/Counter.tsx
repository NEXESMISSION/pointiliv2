"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ArrowDown, BadgeCheck, Check, ChevronRight, Eye, Hourglass, MessageCircle, RefreshCw, ScanLine, ShieldCheck, WifiOff } from "lucide-react";
import { firstScanOffer } from "@/app/shop/qr/actions";
import { OpenOutside } from "@/components/InstallApp";
import { OfferPopup, trialOverWa } from "@/components/Pay";
import { Confetti } from "@/components/StampLand";
import { ClipButton } from "@/components/HowClip";
import { PickItem, type Item } from "@/components/PickItem";
import { useScreen } from "@/components/Tracker";
import { ShopMark } from "@/components/ShopMark";
import { Icon3D } from "@/components/ui";
import { seenBefore, shown } from "@/lib/once";
import { signal } from "@/lib/track";
import { fill, t } from "@/lib/t";
import { pretty } from "@/lib/phone";
import { nextTampon } from "@/lib/when";
import { mix, useBars } from "@/lib/bars";

/** the counter's colour: Pointili's purple, as on every owner screen */
const COUNTER = "#6C47FF";
import type { Said } from "@/lib/types";

type Code = { id: string; svg: string; expiresLocal: number };
/** who just took a tampon — or, `held`, a phone without an account that scanned: not a tampon until they make one */
/** who just took a tampon — or, `held`, a phone without an account that scanned; or, `note`, a scan the code refused, and why */
type Flash = { id: number | string; name: string | null; held?: boolean; note?: string };
type Gift = { id: number; name: string | null; gift: string };
/** a customer who filled one of the shop's forms of identification, just stamped: who they are, to check */
type Known = { id: number; name: string | null; phone: string | null; said: Said };

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
 * never stays on the screen. A card that fills up bursts confetti here, and
 * that is all: a gift waiting is not the counter's business (the home lists
 * it, and «سكاني» hands it over, from the customer's code, any day).
 *
 * It hears every scan at once over Supabase Realtime (the shop's own topic,
 * pinged by the database) and only then asks what happened; a slow question
 * every few seconds stays as a safety net, and a fast one when the radio is
 * off. A hidden screen asks nothing.
 *
 * Right after a new card (`welcome` = the owner's first name), a bravo covers
 * the screen and fades by itself onto the code; then one note takes the
 * title's place, above the code — never on it: try it with another phone.
 * Everything fits one screen.
 */
export function Counter({ shop, welcome, tip, shut: shutAtFirst, phone, from = null, items = [], firstWaits = false }: { shop: { id: string; name: string; kind: string; color: string; paused?: boolean; signal?: string; logo?: string | null; stamp_logo?: boolean; goal?: number | null; gift?: string | null }; welcome?: string | null; tip?: boolean; shut?: boolean; phone?: string | null; from?: string | null; items?: Item[]; firstWaits?: boolean }) {
  // `tip`: the owner pressed «ورّي الكود» on the welcome at home, so the bravo
  // already happened there and only the note about the code is left
  const [coach, setCoach] = useState<"bravo" | "leaving" | "tip" | null>(() =>
    tip && !seenBefore("coach", shop.id) ? "tip" : welcome != null && !seenBefore("coach", shop.id) ? "bravo" : null,
  );
  // the name, kept: the address drops ?welcome at once
  const [name] = useState(welcome);
  const [code, setCode] = useState<Code | null>(null);
  // what the code on screen is for. A shop that says what it sells is asked
  // before anything is made, and asked again after every scan — so the answer
  // is never left over from the customer before.
  const [item, setItem] = useState<Item | null>(null);
  const itemRef = useRef<Item | null>(null);
  // the screen came without things to ask about (the shop was not on «شنوّة يبيع» when it opened)
  const noItems = useRef(items.length === 0);
  const [flashes, setFlashes] = useState<Flash[]>([]);
  const [, setGifts] = useState<Gift[]>([]);
  const giftsKnown = useRef(false);
  const [offline, setOffline] = useState(false);
  const [paused, setPaused] = useState(!!shop.paused || !!shutAtFirst);
  // a stopped shop says so before it asks anything
  const asking = !paused && items.length > 0 && !item;
  // stopped at the trial's end (not by the founder's switch): the code's place says so, with a call
  const [shut, setShut] = useState(!!shutAtFirst);
  const [live, setLive] = useState(false);
  const [party, setParty] = useState(0);
  const codeRef = useRef<Code | null>(null);
  // the next code, made in advance: the swap after a scan waits for nothing
  const spareRef = useRef<Code | null>(null);
  const sparing = useRef(false);
  const seen = useRef(new Set<number>());
  const seenHeld = useRef(new Set<string>());
  // who scanned, when they filled a form here: shown until the owner says next (one after the other)
  const [known, setKnown] = useState<Known[]>([]);
  const seenKnown = useRef(new Set<number>());
  const openedAt = useRef(new Date().toISOString());
  // `firstWaits`: no customer yet (the owner's own card aside). The first one to take a tampon here
  // is celebrated over the code, once in the shop's life: «شفت؟ هكّا!»
  const firstRef = useRef(firstWaits);
  const [first, setFirst] = useState<{ name: string | null } | null>(null);
  // right after it, once: the price — owners did not understand Pointili is paid until the trial stopped
  // (the founder, 23 Oct 2026). The offer's 48 hours start with that first customer
  const [offerUntil, setOfferUntil] = useState<string | null>(null);
  const firstDone = () => {
    setFirst(null);
    void firstScanOffer()
      .then((until) => {
        if (until && !seenBefore("offer", shop.id)) setOfferUntil(until);
      })
      .catch(() => {});
  };
  // the last tampon given here since the screen opened: it stays under the code once its «+1» is gone
  const [lastScan, setLastScan] = useState<{ name: string | null; at: string } | null>(null);
  const celebrate = useCallback(
    (who: string | null) => {
      shown("first_scan", shop.id);
      signal("first_scan");
      setFirst({ name: who });
    },
    [shop.id],
  );
  const busy = useRef(false);
  const again = useRef(false);

  const fetchCode = useCallback(async (): Promise<Code | "paused"> => {
    const res = await fetch("/api/code", {
      method: "POST",
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ item: itemRef.current?.id ?? null }),
    });
    const j = await res.json();
    if (j.error === "paused" || j.error === "shut") {
      setShut(j.error === "shut");
      return "paused";
    }
    setShut(false);
    // the shop was switched to «شنوّة يبيع» while this screen was open (it has no things to ask about yet):
    // the server makes no code without a thing — the page comes back with the question
    if (j.error === "pick_item" && noItems.current) {
      window.location.reload();
      return "paused";
    }
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
        const s = (await res.json()) as { taken: boolean; expired: boolean; served?: number; stamps: { id: number; name: string | null }[]; gifts: Gift[]; held?: string[]; ids?: Known[]; tried?: { id: string; why: string; name: string | null; next_at: string | null }[] };
        // the code on screen changed while asking (the radio swapped it): its answer is about the old one
        const same = codeRef.current?.id === c.id;
        const fresh = s.stamps.filter((x) => !seen.current.has(x.id));
        if (fresh.length) {
          fresh.forEach((x) => seen.current.add(x.id));
          const shown = fresh.slice(-2);
          setFlashes((f) => [...f, ...shown]);
          const newest = fresh[fresh.length - 1]!;
          setLastScan({ name: newest.name, at: new Intl.DateTimeFormat("fr-TN", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis" }).format(new Date()) });
          navigator.vibrate?.(60);
          setTimeout(() => setFlashes((f) => f.filter((x) => !shown.some((y) => y.id === x.id))), 2600);
          // the shop's very first customer (not the owner trying it): after the «+1», the bravo
          if (firstRef.current && (s.served ?? 0) >= 1 && !seenBefore("first_scan", shop.id)) {
            firstRef.current = false;
            const who = fresh[fresh.length - 1]?.name ?? null;
            setTimeout(() => celebrate(who), 1500);
          }
        }
        // a customer known by a form: their answers stay up until «next»
        const knownNew = (s.ids ?? []).filter((k) => !seenKnown.current.has(k.id));
        if (knownNew.length) {
          knownNew.forEach((k) => seenKnown.current.add(k.id));
          setKnown((q) => [...q, ...knownNew]);
          navigator.vibrate?.([80, 60, 80]);
        }
        // scanned by a phone without an account: the owner must know it is not a tampon yet (it shows longer)
        const heldNew = (s.held ?? []).filter((id) => !seenHeld.current.has(id));
        if (heldNew.length) {
          heldNew.forEach((id) => seenHeld.current.add(id));
          const shown = heldNew.slice(-1).map((id) => ({ id: `h-${id}`, name: null, held: true }));
          setFlashes((f) => [...f, ...shown]);
          setTimeout(() => setFlashes((f) => f.filter((x) => !shown.some((y) => y.id === x.id))), 6000);
        }
        // a scan the code refused (too soon after the last tampon, or the owner's own phone): said, and a new code
        const triedNew = (s.tried ?? []).filter((x) => !seenHeld.current.has(`t-${x.id}`));
        if (triedNew.length) {
          triedNew.forEach((x) => seenHeld.current.add(`t-${x.id}`));
          const x = triedNew[triedNew.length - 1]!;
          const note = x.why === "own_shop" ? t.counterOwn : fill(t.counterSoon, { name: x.name ?? t.someone, when: x.next_at ? nextTampon(x.next_at) : "" });
          const shown = [{ id: `t-${x.id}-${Date.now()}`, name: x.name, note }];
          setFlashes((f) => [...f, ...shown]);
          navigator.vibrate?.([40, 40, 40]);
          setTimeout(() => setFlashes((f) => f.filter((y) => !shown.some((z) => z.id === y.id))), 5000);
        }
        // a card filled while the screen is open: confetti (the gifts already waiting when it opened are not news)
        setGifts((g) => {
          if (giftsKnown.current && s.gifts.length > g.length) setParty((p) => p + 1);
          giftsKnown.current = true;
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
  }, [mint, prepare, celebrate, shop.id]);
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
        if (taken && taken === codeRef.current?.id) {
          // whoever comes next is a new question, never the last answer
          if (items.length > 0) {
            itemRef.current = null;
            codeRef.current = null;
            setItem(null);
            setCode(null);
          } else swapRef.current();
        }
        void tickRef.current();
      })
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => {
      setLive(false);
      void sb.removeChannel(channel);
    };
  }, [shop.signal, paused, items.length]);

  // paused by the founder: look now and then whether it is back on
  useEffect(() => {
    if (!paused) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void mint().catch(() => {});
    }, ASK_PAUSED_MS);
    return () => clearInterval(id);
  }, [paused, mint]);

  useEffect(() => {
    if (paused || asking) return;
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
  }, [tick, paused, live, asking]);

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

  useScreen(coach === "bravo" || coach === "leaving" ? "bravo" : coach === "tip" ? "tip" : "code");
  // the phone's bars in the counter's colour, top and bottom (an app on the home screen showed two grey bands)
  useBars(mix(COUNTER, "#ffffff", 0.75), mix(COUNTER, "#000000", 0.62));

  const latest = flashes[flashes.length - 1];
  const who = known[0];
  // the code's size: as wide as the screen lets it, smaller when a gift needs room under it. On a
  // short screen its box gives way to the rest (the only thing in the column that does), and the
  // code inside stays square at whatever the box has left: as large as it can be, never covered
  const qr = who ? "min(46vw, 16rem)" : "min(78vw, 30rem)";

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden text-white"
      // one purple for every owner screen (17 Oct 2026): the shop is its logo and its name, at the top
      style={{ background: `linear-gradient(170deg, #9a82ff -10%, ${COUNTER} 42%, #2f1a9e 110%)` }}
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
        <p className="min-w-0 flex-1 truncate text-center text-[1.25rem] font-bold">{shop.name}</p>
        <Link href="/me" aria-label={t.account} className="press grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-white/20">
          <ShopMark shop={shop} size={28} />
        </Link>
      </header>

      <main className="safe-b relative z-10 mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col items-center justify-center gap-[2.4dvh] px-[clamp(1rem,5vw,1.5rem)] py-[2dvh]">
        {coach === "tip" ? (
          // the note takes the title's place: above the code, never on it
          <div className="w-full rounded-[1.375rem] bg-surface p-4 text-ink shadow-[0_14px_40px_-12px_rgb(0_0_0/0.45)]" style={{ animation: "ct-in 420ms cubic-bezier(0.2,0.8,0.2,1) both" }} role="dialog" aria-label={t.coachTipTitle}>
            <p className="flex items-center gap-2 text-[1.0625rem] font-bold leading-snug">
              <span className="grid size-7 shrink-0 animate-bounce place-items-center rounded-full bg-brand-soft text-brand">
                <ArrowDown className="size-4" strokeWidth={2.8} />
              </span>
              {t.coachTipTitle}
            </p>
            {/* the code is theirs, and why it keeps changing — three short lines, each with its sign */}
            <ul className="mt-2 space-y-1.5 text-[0.8125rem] leading-snug text-body">
              {[
                { icon: <ScanLine className="size-4" />, text: t.coachTip, tone: "bg-brand-soft text-brand" },
                { icon: <RefreshCw className="size-4 animate-[spin_2.4s_linear_infinite]" />, text: t.coachTipChange, tone: "bg-[#fff4e0] text-[#d97706]" },
                { icon: <ShieldCheck className="size-4" />, text: t.coachTipSafe, tone: "bg-mint-soft text-mint" },
              ].map((r, i) => (
                <li key={i} className="flex items-center gap-2.5" style={{ animation: `ct-in 420ms cubic-bezier(0.2,0.8,0.2,1) ${160 + i * 140}ms both` }}>
                  <span className={`grid size-7 shrink-0 place-items-center rounded-full ${r.tone}`}>{r.icon}</span>
                  <span className="min-w-0">{r.text}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setCoach(null)}
              className="press mt-2.5 h-10 w-full rounded-[0.875rem] bg-brand text-[0.9375rem] font-bold text-white shadow-[0_10px_22px_-10px_rgb(108_71_255/0.8)]"
            >
              {t.coachTipOk}
            </button>
            {/* the owner who signed up from an ad, inside Facebook: the moment to take Pointili out of it */}
            <OpenOutside where="coach" look="line" className="mt-1.5" />
          </div>
        ) : (
          <h1 className="text-center text-[clamp(1.6rem,4.6dvh,2.6rem)] font-bold leading-tight">{t.counterTitle}</h1>
        )}

        {asking ? (
          <PickItem
            items={items}
            onPick={(it) => {
              itemRef.current = it;
              setItem(it);
            }}
          />
        ) : (
        <div className="flex min-h-0 shrink items-center justify-center transition-[width,height] duration-500 [container-type:size]" style={{ width: qr, height: qr }}>
          <div className="relative aspect-square" style={{ width: "min(100cqw, 100cqh)" }}>
            {flashes.filter((f) => !f.held).map((f) => (
              <span key={f.id} className="absolute inset-0 rounded-[2.125rem] border-[6px] border-white" style={{ animation: "ct-ring 900ms ease-out both" }} />
            ))}
            <div className="absolute inset-0 rounded-[2.125rem] bg-white p-[5%] shadow-[0_30px_60px_-20px_rgb(0_0_0/0.45)]">
              {paused && shut ? (
                // the trial is over: the founder turns the year on, a WhatsApp message away (already written)
                <div className="grid size-full place-items-center p-[8%] text-center text-ink">
                  <div>
                    <p className="text-[clamp(1.0625rem,5cqw,1.375rem)] font-bold">{t.trialOverTitle}</p>
                    <p className="mt-1.5 text-balance text-[clamp(0.8125rem,3.6cqw,0.9375rem)] leading-snug text-body">{t.trialOverBody}</p>
                    {phone && (
                      <a href={trialOverWa(phone, from)} target="_blank" rel="noreferrer" onClick={() => signal("trial_call", "counter · whatsapp")} className="press mt-3 inline-flex h-11 items-center gap-2 rounded-full bg-[#25D366] px-5 text-[0.9375rem] font-bold text-white">
                        <MessageCircle className="size-4" /> {t.trialOverWa}
                      </a>
                    )}
                  </div>
                </div>
              ) : paused ? (
                <div className="grid size-full place-items-center p-6 text-center">
                  <p className="text-[1.25rem] font-bold text-ink">{t.pausedBanner}</p>
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
        )}

        {item && !paused && (
          <p className="flex shrink-0 items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-[0.9375rem] font-bold">
            {t.codeFor} {item.name}
            <button
              type="button"
              onClick={() => {
                itemRef.current = null;
                codeRef.current = null;
                setItem(null);
                setCode(null);
              }}
              className="press -me-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[0.8125rem] font-bold"
            >
              {t.changeItem}
            </button>
          </p>
        )}
        {item && !paused && (
          <Link href="/shop/tampons" className="shrink-0 text-[0.8125rem] font-semibold text-white/80 underline underline-offset-4">
            غلطت في تامبون؟ بدّل الحاجة متاعو
          </Link>
        )}

        <div className="flex h-12 shrink-0 items-center">
          {latest?.note ? (
            <p key={latest.id} className="flex max-w-xs items-center gap-2 rounded-full bg-[#fff4e0] px-4 py-2.5 text-[0.9375rem] font-bold text-[#b45309]" style={{ animation: "ct-pill 520ms cubic-bezier(0.2,0.9,0.3,1.3) both" }} role="status">
              <Hourglass className="size-5 shrink-0" strokeWidth={2.6} /> <span className="min-w-0">{latest.note}</span>
            </p>
          ) : latest?.held ? (
            <p key={latest.id} className="flex items-center gap-2 rounded-full bg-[#fff4e0] px-5 py-2.5 text-[0.9375rem] font-bold text-[#b45309]" style={{ animation: "ct-pill 520ms cubic-bezier(0.2,0.9,0.3,1.3) both" }} role="status">
              <Hourglass className="size-5 shrink-0" strokeWidth={2.6} /> {t.counterHeld}
            </p>
          ) : latest ? (
            <p key={latest.id} className="flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-[1.0625rem] font-bold" style={{ color: COUNTER, animation: "ct-pill 520ms cubic-bezier(0.2,0.9,0.3,1.3) both" }} role="status">
              <Check className="size-5" strokeWidth={3} /> <span className="num">+1</span> {latest.name ?? t.someone}
            </p>
          ) : lastScan ? (
            <p className="flex max-w-xs items-center gap-1.5 truncate text-center text-[0.9375rem] font-semibold text-white/85">
              <Check className="size-4 shrink-0" strokeWidth={3} /> {fill(t.lateStamp, { who: lastScan.name ?? t.someone })} · <span className="num">{lastScan.at}</span>
            </p>
          ) : (
            <p className="max-w-xs text-center text-[0.9375rem] text-white/80">{t.counterHint}</p>
          )}
        </div>
        {/* alone with one phone, the owner cannot scan their own screen: how it goes, filmed for real */}
        {/* only until the first customer: after that, the code alone */}
        {firstWaits && !paused && shop.goal && (
          <ClipButton className="press flex h-10 shrink-0 items-center gap-2 rounded-full bg-white/15 px-4 text-[0.8125rem] font-bold text-white">
            <Eye className="size-4" /> {t.trySee}
          </ClipButton>
        )}

        {/* who just scanned, known by a form: their answers to check, until «next» (never gone by itself) */}
        {who && (
          <div className="w-full shrink-0 rounded-[1.75rem] bg-surface p-[1.1rem] text-start text-ink shadow-[0_-10px_40px_-10px_rgb(0_0_0/0.35)]" style={{ animation: "ct-in 480ms cubic-bezier(0.2,0.8,0.2,1) both" }} role="status">
            <p className="flex items-center gap-2">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-mint text-white">
                <BadgeCheck className="size-6" />
              </span>
              <span className="min-w-0 flex-1">
                <bdi className="block truncate text-[1.25rem] font-bold leading-tight">{who.name ?? t.someone}</bdi>
                {who.phone && (
                  <span dir="ltr" className="num block text-end text-[0.8125rem] text-muted">
                    {pretty(who.phone)}
                  </span>
                )}
              </span>
              {known.length > 1 && <span className="num shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-[0.8125rem] font-bold text-brand">+{known.length - 1}</span>}
            </p>
            <div className="mt-2 max-h-[22dvh] space-y-2 overflow-y-auto">
              {who.said.map((f, i) => (
                <div key={i} className="rounded-[1rem] bg-canvas px-3 py-2">
                  <p className="text-[0.8125rem] font-bold text-brand">{f.form}</p>
                  <dl className="mt-0.5 space-y-0.5">
                    {f.fields.map((x, j) => (
                      <div key={j} className="flex justify-between gap-3 text-[0.9375rem]">
                        <dt className="shrink-0 text-muted">{x.label}</dt>
                        <dd className="min-w-0 text-end font-bold">
                          <bdi>{x.value}</bdi>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setKnown((q) => q.slice(1))} className="press mt-3 flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-[1.25rem] bg-brand text-[1.0625rem] font-bold text-white">
              <Check className="size-5" strokeWidth={3} /> {known.length > 1 ? "مريقل، اللي بعدو" : "مريقل، سكان الجاي"}
            </button>
          </div>
        )}

      </main>

      {/* the shop's first customer: what just happened, said plainly, once */}
      {first && (
        <div className="safe-t safe-b fixed inset-0 z-50 flex animate-fade flex-col items-center justify-center bg-canvas/95 px-[clamp(1.25rem,6vw,1.75rem)] text-center text-ink backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label={t.firstScanTitle}>
          <Confetti count={90} />
          <Icon3D name="party" size={92} className="animate-pop" />
          <h1 className="mt-[2dvh] animate-rise text-[2.1rem] font-bold">{t.firstScanTitle}</h1>
          <p className="mt-2 max-w-[18rem] animate-rise text-balance text-[1.0625rem] leading-relaxed text-body" style={{ animationDelay: "250ms" }}>
            {fill(t.firstScanBody, { name: first.name ?? t.someone })}
          </p>
          <button type="button" onClick={firstDone} className="press mt-[4dvh] h-[3.25rem] w-full max-w-xs rounded-[1.25rem] bg-brand text-[1.0625rem] font-bold text-white">
            {t.firstScanOk}
          </button>
        </div>
      )}
      {offerUntil && <OfferPopup shopId={shop.id} offerUntil={offerUntil} />}

      {/* right after a new card: the bravo, over everything, fading by itself onto the code */}
      {(coach === "bravo" || coach === "leaving") && (
        <div className={`safe-t safe-b fixed inset-0 z-50 flex flex-col items-center justify-center bg-canvas px-[clamp(1.25rem,6vw,1.75rem)] text-center text-ink transition-[opacity,transform] duration-[450ms] ${coach === "leaving" ? "scale-[1.04] opacity-0" : "animate-fade"}`} role="dialog" aria-modal="true">
          <Confetti count={70} />
          <Icon3D name="trophy" size={92} className="animate-pop" />
          <h1 className="mt-[2dvh] animate-rise text-[2.1rem] font-bold" style={{ animationDelay: "150ms" }}>
            {name ? fill(t.coachBravo, { name }) : t.coachBravoAnon}
          </h1>
          <p className="mt-1 animate-rise text-[1.0625rem] font-semibold text-body" style={{ animationDelay: "400ms" }}>
            {t.coachReady}
          </p>
          <p className="mt-[2.5dvh] max-w-[17rem] animate-rise text-[0.9375rem] leading-relaxed text-muted" style={{ animationDelay: "800ms" }}>
            {t.coachShow}
          </p>
          <div className="mt-[4dvh] h-1 w-40 overflow-hidden rounded-full bg-line" aria-hidden>
            <span className="block h-full origin-right rounded-full bg-brand" style={{ animation: `ct-bar ${BRAVO_MS}ms linear both` }} />
          </div>
          <button type="button" onClick={showCode} className="press mt-4 px-6 py-2 text-[0.9375rem] font-bold text-brand">
            {t.coachShowCta}
          </button>
        </div>
      )}
    </div>
  );
}
