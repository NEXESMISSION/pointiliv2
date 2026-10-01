"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Delete, QrCode, X } from "lucide-react";
import { BusinessAvatar } from "@/components/CardIcon";
import { BackButton } from "@/components/nav/BackButton";
import { Button } from "@/components/ui/Button";
import { Icon3D } from "@/components/ui/Icon3D";
import { useT } from "@/components/i18n/Provider";
import { QR_POLL_MS } from "@/lib/constants";
import { formatAmount, pointsFor } from "@/lib/points";

type Code = { id: string; svg: string; points: number; amount: number; expiresLocal: number };
type Earned = { points: number; code: number; name: string | null; balance: number };
/** pad: typing what was paid · code: the QR waits · done: the points landed · claimed: the customer is signing up · expired: nobody scanned in time */
type Stage = "pad" | "code" | "done" | "claimed" | "expired";

const QUICK = [10, 20, 50];
const MAX_AMOUNT = 100_000;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"] as const;
/** after the points land, the counter goes back to the keypad by itself */
const NEXT_AFTER_MS = 9_000;

/** Close a code nobody used: the amount changed, or the screen is going away. */
function closeCode(id: string, leaving = false) {
  const body = JSON.stringify({ id });
  if (leaving && navigator.sendBeacon) {
    navigator.sendBeacon("/api/points/void", new Blob([body], { type: "application/json" }));
    return;
  }
  void fetch("/api/points/void", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
}

/**
 * The counter of a points shop (board 2, P3 → P4). The owner types what the
 * customer paid — big keys like a till, ready amounts — and sees the points
 * it makes; one tap shows a QR made for that purchase alone. The customer
 * scans it, the screen says who took how many, and the keypad comes back
 * for the next one. A wrong amount's code is closed when the right one is
 * made; a code left on screen is closed when the screen goes.
 */
export function PointsCounter({ businessName, logo, icon, color, rate }: { businessName: string; logo: string | null; icon: string; color: string; rate: number }) {
  const { t, count, fill, msg, locale } = useT();
  const w = t.points;
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [stage, setStage] = useState<Stage>("pad");
  const [code, setCode] = useState<Code | null>(null);
  const [earned, setEarned] = useState<Earned | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const codeRef = useRef<Code | null>(null);
  /** the code on screen was used or claimed: there is nothing to close */
  const settled = useRef(false);

  const value = Number(amount || "0");
  const pts = pointsFor(value, rate);

  const press = useCallback((k: string) => {
    setError(null);
    setAmount((a) => {
      if (k === "del") return a.slice(0, -1);
      if (k === ".") return a.includes(".") ? a : `${a || "0"}.`;
      const dec = a.split(".")[1];
      if (dec !== undefined && dec.length >= 3) return a;
      if (a === "0") return k;
      const next = a + k;
      return Number(next) > MAX_AMOUNT ? a : next;
    });
  }, []);

  /** A code for this amount; `replace` closes the one it takes the place of. */
  const show = useCallback(
    async (replace?: string | null) => {
      if (pts < 1 || busy) return;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/points/mint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: value, replace: replace ?? null }),
          cache: "no-store",
        });
        if (res.status === 401) return router.replace("/login?next=/points");
        const j = await res.json();
        if (!j.ok) {
          setError(j.error ?? "network");
          setStage("pad");
          return;
        }
        const offset = Date.parse(j.server_now) - Date.now();
        const c: Code = { id: j.id, svg: j.svg, points: j.points, amount: Number(j.amount), expiresLocal: Date.parse(j.expires_at) - offset };
        codeRef.current = c;
        settled.current = false;
        setCode(c);
        setEarned(null);
        setStage("code");
      } catch {
        setError("network");
      } finally {
        setBusy(false);
      }
    },
    [busy, pts, router, value],
  );

  const changeAmount = () => {
    const c = codeRef.current;
    if (c && !settled.current) closeCode(c.id);
    codeRef.current = null;
    setCode(null);
    setStage("pad");
  };

  const nextCustomer = useCallback(() => {
    codeRef.current = null;
    setCode(null);
    setEarned(null);
    setAmount("");
    setError(null);
    setStage("pad");
  }, []);

  // the keypad answers a keyboard too (a tablet at the till, a laptop)
  useEffect(() => {
    if (stage !== "pad") return;
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === "." || e.key === ",") press(".");
      else if (e.key === "Backspace") press("del");
      else if (e.key === "Enter") void show();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, press, show]);

  // while a code is out: who took it, whether it is being claimed, whether it ran out
  useEffect(() => {
    if (stage !== "code" && stage !== "claimed") return;
    const id = codeRef.current?.id;
    if (!id) return;
    let stop = false;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/qr/state?id=${id}`, { cache: "no-store" });
        if (res.status === 401) return router.replace("/login?next=/points");
        if (!res.ok || stop) return;
        const s = (await res.json()) as { earned: Earned | null; claimed: boolean; expired: boolean };
        if (stop) return;
        if (s.earned) {
          settled.current = true;
          setEarned(s.earned);
          setStage("done");
          navigator.vibrate?.(60);
        } else if (s.claimed) {
          settled.current = true;
          setStage("claimed");
        } else if (s.expired) {
          setStage("expired");
        }
      } catch {
        /* a dropped request: the next tick tries again */
      }
    };
    const poll = setInterval(tick, QR_POLL_MS);
    const clock = setInterval(() => setNow(Date.now()), 500);
    return () => {
      stop = true;
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [stage, router]);

  // the points landed: back to the keypad for the next customer
  useEffect(() => {
    if (stage !== "done") return;
    const timer = setTimeout(nextCustomer, NEXT_AFTER_MS);
    return () => clearTimeout(timer);
  }, [stage, nextCustomer]);

  // a code left on screen dies with the screen; the screen stays awake while it is open
  useEffect(() => {
    const leave = () => {
      const c = codeRef.current;
      if (c && !settled.current) closeCode(c.id, true);
    };
    let lock: WakeLockSentinel | null = null;
    const awake = async () => {
      try {
        if (document.visibilityState === "visible" && "wakeLock" in navigator) lock = await navigator.wakeLock.request("screen");
      } catch {
        /* not allowed: the counter still works */
      }
    };
    void awake();
    document.addEventListener("visibilitychange", awake);
    window.addEventListener("pagehide", leave);
    return () => {
      leave();
      document.removeEventListener("visibilitychange", awake);
      window.removeEventListener("pagehide", leave);
      void lock?.release().catch(() => {});
    };
  }, []);

  if (stage === "pad") {
    return (
      <div className="fixed inset-0 flex flex-col bg-canvas">
        <header className="flex items-center gap-2 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))]">
          <BackButton fallback="/dashboard" className="size-11" />
          <h1 className="min-w-0 flex-1 truncate text-center text-lg font-bold text-ink">{w.add}</h1>
          <span className="size-11 shrink-0" aria-hidden />
        </header>

        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          <p className="mt-2 text-center text-[15px] font-medium text-muted">{w.howMuch}</p>
          <div className="mt-1 flex items-baseline justify-center gap-2" dir="ltr" aria-live="polite">
            <span className={`num text-[64px] font-bold leading-none ${amount ? "text-ink" : "text-faint"}`}>{(amount || "0").replace(".", ",")}</span>
            <span className="text-2xl font-semibold text-muted">{w.dt}</span>
          </div>
          <p className={`mt-2 flex items-center justify-center gap-1.5 text-[15px] font-semibold ${value > 0 && pts < 1 ? "text-coral-600" : "text-sea-700"}`}>
            <Icon3D name="coin" size={22} />
            {value > 0 && pts < 1 ? w.tooSmall : count(w.equals, pts)}
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setError(null);
                  setAmount(String(q));
                }}
                className={`press h-11 rounded-full text-[15px] font-semibold transition ${amount === String(q) ? "bg-sea-500 text-white" : "bg-sea-50 text-sea-700"}`}
              >
                <span className="num">{q}</span> {w.dt}
              </button>
            ))}
          </div>

          <div className="mt-3 grid flex-1 grid-cols-3 gap-2" dir="ltr">
            {KEYS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => press(k)}
                aria-label={k === "del" ? w.del : k}
                className={`press grid min-h-[52px] place-items-center rounded-[18px] text-[26px] font-semibold ${k === "del" || k === "." ? "bg-surface-2 text-body" : "bg-surface text-ink shadow-card"}`}
              >
                {k === "del" ? <Delete className="size-6" /> : <span className="num">{k === "." ? "," : k}</span>}
              </button>
            ))}
          </div>

          {error && <p className="mt-2 text-center text-sm font-medium text-danger-600">{msg(error)}</p>}
          <Button variant="sea" size="xl" block className="mt-3" disabled={pts < 1} loading={busy} onClick={() => void show()} icon={<QrCode className="size-5" />}>
            {w.showCode}
          </Button>
        </main>
      </div>
    );
  }

  const left = code ? Math.max(0, Math.floor((code.expiresLocal - now) / 1000)) : 0;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden text-white" style={{ background: "linear-gradient(170deg, #3fd0e6 0%, #0891b2 45%, #0b5f75 100%)" }}>
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(70% 45% at 50% 0%, rgba(255,255,255,0.2), transparent 70%)" }} aria-hidden />

      <header className="relative z-10 flex items-center gap-2 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button type="button" onClick={stage === "done" || stage === "claimed" ? nextCustomer : changeAmount} className="press grid size-11 shrink-0 place-items-center rounded-full bg-white/15 hover:bg-white/25" aria-label={w.close}>
          <X className="size-5" />
        </button>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <BusinessAvatar logo={logo} icon={icon} color={color} size={30} rounded="rounded-full" />
          <p className="truncate text-lg font-semibold">{businessName}</p>
        </div>
        <span className="size-11 shrink-0" aria-hidden />
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-center">
        {stage === "code" && code && (
          <>
            <Icon3D name="coin" size={58} className="animate-float" />
            <h1 className="mt-2 text-[clamp(1.5rem,4vh,2.3rem)] font-bold leading-tight">{count(w.scanFor, code.points)}</h1>
            <div className="mt-[2.5vh] rounded-[30px] bg-white p-[4%] text-ink shadow-[0_30px_60px_-20px_rgb(4_40_52/0.6)]" style={{ width: "min(76vw, 44vh, 26rem)" }}>
              <div key={code.id} className="aspect-square animate-fade [&>svg]:size-full" role="img" aria-label={count(w.scanFor, code.points)} data-qr="1" dangerouslySetInnerHTML={{ __html: code.svg }} />
              <p className="mt-2 text-[15px] font-semibold text-sea-700">
                <span className="num">+{code.points}</span> · {fill(w.codeFoot, { amount: formatAmount(code.amount, locale) })}
              </p>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-60" />
                <span className="relative inline-flex size-2.5 rounded-full bg-white" />
              </span>
              {w.waiting} ·{" "}
              <span className="num">
                {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
              </span>
            </div>
            <p className="mt-2 text-[13.5px] text-white/80">{w.onceOnly}</p>
            <button type="button" onClick={changeAmount} className="press mt-5 h-12 w-full max-w-sm rounded-2xl bg-white/15 font-semibold hover:bg-white/25">
              {w.changeAmount}
            </button>
          </>
        )}

        {stage === "done" && earned && (
          <>
            <span className="grid size-28 animate-pop place-items-center rounded-full bg-white text-sea-600 shadow-[0_24px_50px_-18px_rgb(4_40_52/0.6)]">
              <Check className="size-14" strokeWidth={3} />
            </span>
            <h1 className="mt-5 text-[clamp(1.5rem,4vh,2.3rem)] font-bold leading-tight" role="status">
              {count(w.took, earned.points, { who: earned.name ?? `#${earned.code}` })}
            </h1>
            <p className="mt-1 text-white/85">
              <span className="num">{earned.balance}</span> {count(w.unit, earned.balance)}
            </p>
            <button type="button" onClick={nextCustomer} className="press mt-8 h-14 w-full max-w-sm rounded-2xl bg-white text-lg font-bold text-sea-700">
              {w.nextCustomer}
            </button>
          </>
        )}

        {stage === "claimed" && (
          <>
            <Icon3D name="phone" size={72} className="animate-float" />
            <p className="mt-4 max-w-xs text-lg font-semibold leading-snug">{w.signingUp}</p>
            <button type="button" onClick={nextCustomer} className="press mt-8 h-14 w-full max-w-sm rounded-2xl bg-white text-lg font-bold text-sea-700">
              {w.nextCustomer}
            </button>
          </>
        )}

        {stage === "expired" && code && (
          <>
            <Icon3D name="hourglass" size={72} />
            <h1 className="mt-4 text-2xl font-bold">{w.codeExpired}</h1>
            <p className="mt-1 text-white/85">
              <span className="num">+{code.points}</span> · {fill(w.codeFoot, { amount: formatAmount(code.amount, locale) })}
            </p>
            <button type="button" onClick={() => void show(code.id)} disabled={busy} className="press mt-8 h-14 w-full max-w-sm rounded-2xl bg-white text-lg font-bold text-sea-700 disabled:opacity-60">
              {w.renew}
            </button>
            <button type="button" onClick={changeAmount} className="press mt-2 h-12 w-full max-w-sm rounded-2xl bg-white/15 font-semibold">
              {w.changeAmount}
            </button>
          </>
        )}
      </main>
    </div>
  );
}
