"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Check, Maximize, Minimize, Smartphone, WifiOff, Zap } from "lucide-react";
import { BackButton } from "@/components/nav/BackButton";
import { BusinessAvatar } from "@/components/CardIcon";
import { Spinner } from "@/components/ui/Spinner";
import { useT } from "@/components/i18n/Provider";
import { cardColor, QR_POLL_MS, QR_ROTATE_BEFORE_MS } from "@/lib/constants";

type Token = { id: string; svg: string; expiresLocal: number; mintedLocal: number };
type Flash = { id: string; code: number };

const SPEED_KEY = "pl_qr_speed";

/** The counter screen remembers the speed the shop picked, per device. */
const speedListeners = new Set<() => void>();
const speed = {
  subscribe(cb: () => void) {
    speedListeners.add(cb);
    return () => speedListeners.delete(cb);
  },
  isFast() {
    try {
      return localStorage.getItem(SPEED_KEY) === "fast";
    } catch {
      return false;
    }
  },
  set(fast: boolean) {
    try {
      localStorage.setItem(SPEED_KEY, fast ? "fast" : "normal");
    } catch {
      /* private mode: this session still works, it just will not be remembered */
    }
    speedListeners.forEach((cb) => cb());
  },
};

/**
 * The merchant's counter screen, on a white background so it reads under shop
 * lighting. Open it and leave it:
 *  · the next code is minted in advance, so a scanned code is replaced at once
 *  · every code is single-use, and unscanned ones rotate before they expire
 *  · each stamp flashes "+1 TAMPON" with the customer number
 *  · open it on as many phones or tablets as you like — each one shows its own code
 *  · the screen is kept awake (Wake Lock) and recovers from network drops by itself
 */
export function MerchantQr({ businessName, logo, icon, color }: { businessName: string; logo: string | null; icon: string; color: string }) {
  const [token, setToken] = useState<Token | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [flashes, setFlashes] = useState<Flash[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [fullscreen, setFullscreen] = useState(false);
  const fast = useSyncExternalStore(speed.subscribe, speed.isFast, () => false);

  const tokenRef = useRef<Token | null>(null);
  const spare = useRef<Token | null>(null);
  const openedAt = useRef(new Date().toISOString());
  const seen = useRef(new Set<string>());
  const busy = useRef(false);
  const router = useRouter();
  const { t, msg } = useT();
  const w = t.merchant.qr;
  const c = cardColor(color);

  /** One trip to the server for a fresh code. */
  const fetchToken = useCallback(async (): Promise<Token | "auth" | { error: string }> => {
    const res = await fetch("/api/qr/mint", { method: "POST", cache: "no-store" });
    if (res.status === 401) return "auth";
    const j = await res.json();
    if (!j.ok) return { error: j.error ?? "network" };
    const offset = Date.parse(j.server_now) - Date.now();
    return { id: j.id, svg: j.svg, expiresLocal: Date.parse(j.expires_at) - offset, mintedLocal: Date.now() };
  }, []);

  /** Show the spare code immediately, then prepare the one after it. */
  const rotate = useCallback(async () => {
    const ready = spare.current;
    if (ready && ready.expiresLocal - Date.now() > QR_ROTATE_BEFORE_MS) {
      spare.current = null;
      tokenRef.current = ready;
      setToken(ready);
      setError(null);
    } else {
      const fresh = await fetchToken();
      if (fresh === "auth") return router.replace("/login?next=/qr");
      if ("error" in fresh) {
        tokenRef.current = null;
        setToken(null);
        setError(fresh.error);
        return;
      }
      tokenRef.current = fresh;
      setToken(fresh);
      setError(null);
    }
    const next = await fetchToken();
    if (next !== "auth" && !("error" in next)) spare.current = next;
  }, [fetchToken, router]);

  const tick = useCallback(async () => {
    if (busy.current || document.visibilityState !== "visible") return;
    busy.current = true;
    try {
      const t = tokenRef.current;
      const life = fast ? 20_000 : 45_000;
      if (!t || t.expiresLocal - Date.now() < QR_ROTATE_BEFORE_MS || Date.now() - t.mintedLocal > life) {
        await rotate();
      } else {
        const res = await fetch(`/api/qr/state?id=${t.id}&since=${encodeURIComponent(openedAt.current)}`, { cache: "no-store" });
        if (res.status === 401) {
          router.replace("/login?next=/qr");
          return;
        }
        if (!res.ok) throw new Error("state");
        const s = (await res.json()) as { consumed: boolean; expired: boolean; found: boolean; open: boolean; stamps: { id: string; code: number }[] };
        const fresh = s.stamps.filter((x) => !seen.current.has(x.id));
        if (fresh.length) {
          fresh.forEach((x) => seen.current.add(x.id));
          setFlashes((f) => [...f, ...fresh.map((x) => ({ id: x.id, code: x.code }))]);
          navigator.vibrate?.(50);
          setTimeout(() => setFlashes((f) => f.filter((x) => !fresh.some((y) => y.id === x.id))), 2600);
        }
        if (!s.open) {
          tokenRef.current = null;
          setToken(null);
          setError("subscription_expired");
        } else if (s.consumed || s.expired || !s.found) {
          await rotate();
        }
      }
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      busy.current = false;
    }
  }, [fast, rotate, router]);

  useEffect(() => {
    const first = setTimeout(tick, 0);
    const poll = setInterval(tick, QR_POLL_MS);
    const clock = setInterval(() => setNow(Date.now()), 500);
    const onVisible = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(poll);
      clearInterval(clock);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [tick]);

  // Keep the counter screen awake.
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        if (document.visibilityState === "visible" && "wakeLock" in navigator) lock = await navigator.wakeLock.request("screen");
      } catch {
        /* not allowed (battery saver, iframe) — the QR still works */
      }
    };
    void request();
    document.addEventListener("visibilitychange", request);
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      document.removeEventListener("visibilitychange", request);
      document.removeEventListener("fullscreenchange", onFs);
      void lock?.release().catch(() => {});
    };
  }, []);

  const toggleSpeed = () => {
    speed.set(!fast);
    void rotate();
  };

  const life = fast ? 20_000 : 45_000;
  const remaining = token ? Math.max(0, Math.min(token.expiresLocal - QR_ROTATE_BEFORE_MS, token.mintedLocal + life) - now) : 0;
  const flashing = flashes.length > 0;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-white text-ink">
      <div className="pointer-events-none absolute inset-0 opacity-40" style={{ background: `radial-gradient(70% 50% at 50% 0%, ${c.accent}22, transparent 70%)` }} aria-hidden />

      <header className="relative z-10 flex items-center gap-2 px-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-6">
        <BackButton fallback="/dashboard" className="size-11" />
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <BusinessAvatar logo={logo} icon={icon} color={color} size={30} rounded="rounded-full" />
          <p className="truncate text-lg font-semibold">{businessName}</p>
        </div>
        <button
          type="button"
          onClick={toggleSpeed}
          className={`grid size-11 place-items-center rounded-full transition ${fast ? "bg-brand-600 text-white" : "bg-ink/5 text-body hover:bg-ink/10"}`}
          aria-label={w.speed}
          aria-pressed={fast}
          title={w.speed}
        >
          <Zap className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.())?.catch?.(() => {})}
          className="grid size-11 place-items-center rounded-full bg-ink/5 text-body hover:bg-ink/10"
          aria-label={fullscreen ? w.exitFullscreen : w.fullscreen}
        >
          {fullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
        </button>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <h1 className="text-center text-[clamp(1.6rem,4.5vh,3rem)] font-bold leading-tight tracking-tight">
          {w.headline1}
          <br />
          {w.headline2}
        </h1>

        <div
          className={`relative mt-[3vh] aspect-square w-[min(80vw,52vh,34rem)] rounded-[2rem] border border-ink/5 bg-white p-[5%] shadow-[0_24px_60px_-28px_rgb(40_20_110/0.45)] transition-[box-shadow,transform] duration-300 ${flashing ? "scale-[1.02] ring-8 ring-success-500" : ""}`}
        >
          {token && !error ? (
            <div key={token.id} className={`size-full animate-fade [&>svg]:size-full ${offline ? "opacity-30" : ""}`} dangerouslySetInnerHTML={{ __html: token.svg }} role="img" data-qr="1" aria-label={w.qrAria} />
          ) : error ? (
            <div className="grid size-full place-items-center p-4 text-center">
              <div>
                <p className="text-lg font-bold">{msg(error)}</p>
                {error === "subscription_expired" && (
                  <Link href="/billing" className="mt-4 inline-block rounded-2xl bg-brand-600 px-5 py-3 font-semibold text-white">
                    {w.renewPlan}
                  </Link>
                )}
                {error === "no_card" && (
                  <Link href="/loyalty" className="mt-4 inline-block rounded-2xl bg-brand-600 px-5 py-3 font-semibold text-white">
                    {w.createCard}
                  </Link>
                )}
                {(error === "network" || error === "rate_limited") && <p className="mt-2 text-sm text-muted">{w.retrying}</p>}
              </div>
            </div>
          ) : (
            <div className="grid size-full place-items-center text-brand-600">
              <Spinner className="size-10" />
            </div>
          )}
          {offline && token && (
            <div className="absolute inset-0 grid place-items-center rounded-[2rem] bg-white/70">
              <p className="flex items-center gap-2 rounded-full bg-white px-4 py-2 font-semibold shadow-lift">
                <WifiOff className="size-5" /> {w.reconnecting}
              </p>
            </div>
          )}
        </div>

        <div className="mt-[3vh] flex h-14 items-center">
          {flashing ? (
            <div key={flashes[flashes.length - 1]!.id} className="flex animate-pop items-center gap-2 rounded-full bg-success-500 px-7 py-3.5 text-xl font-extrabold text-white shadow-[0_12px_30px_-8px_rgb(34_197_94/0.5)]" role="status" aria-live="polite">
              <Check className="size-6" strokeWidth={3} /> {w.stampFlash} ·{" "}
              <span dir="ltr">#{flashes[flashes.length - 1]!.code}</span>
            </div>
          ) : (
            <div className="rounded-full bg-success-500 px-8 py-3 text-xl font-extrabold tracking-wide text-white">{w.stampFlash}</div>
          )}
        </div>

        <div className="mt-4 w-60">
          <div className="h-1 overflow-hidden rounded-full bg-ink/10">
            <div className="h-full rounded-full bg-brand-600/70 transition-[width] duration-500 ease-linear" style={{ width: `${token ? Math.min(100, (remaining / life) * 100) : 0}%` }} />
          </div>
          <p className="mt-2 text-center text-sm text-muted">{fast ? w.speedFast : w.autoUpdates}</p>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
            <Smartphone className="size-3.5" /> {w.multiDevice}
          </p>
        </div>
      </main>
    </div>
  );
}
