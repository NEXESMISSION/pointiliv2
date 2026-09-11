"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Maximize, Minimize, WifiOff } from "lucide-react";
import { BackButton } from "@/components/nav/BackButton";
import { BusinessAvatar } from "@/components/CardIcon";
import { Spinner } from "@/components/ui/Spinner";
import { cardColor, QR_POLL_MS, QR_ROTATE_BEFORE_MS } from "@/lib/constants";
import { message } from "@/lib/messages";

type Token = { id: string; svg: string; expiresLocal: number; mintedLocal: number };
type Flash = { id: string; code: number };

/**
 * The merchant's counter screen. Open it and leave it:
 *  · every token is single-use — when a customer scans, the screen rotates within ~2s
 *  · unscanned tokens rotate before they expire
 *  · each stamp flashes "+1 STAMP" with the customer number
 *  · the screen is kept awake (Wake Lock) and recovers from network drops by itself
 */
export function MerchantQr({ businessName, logo, cover, icon, color }: { businessName: string; logo: string | null; cover: string | null; icon: string; color: string }) {
  const [token, setToken] = useState<Token | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [flashes, setFlashes] = useState<Flash[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [fullscreen, setFullscreen] = useState(false);

  const tokenRef = useRef<Token | null>(null);
  const openedAt = useRef(new Date().toISOString());
  const seen = useRef(new Set<string>());
  const busy = useRef(false);
  const router = useRouter();
  const c = cardColor(color);

  const mint = useCallback(async () => {
    const res = await fetch("/api/qr/mint", { method: "POST", cache: "no-store" });
    if (res.status === 401) {
      router.replace("/login?next=/qr");
      return;
    }
    const j = await res.json();
    if (!j.ok) {
      tokenRef.current = null;
      setToken(null);
      setError(j.error ?? "network");
      return;
    }
    const offset = Date.parse(j.server_now) - Date.now();
    const t: Token = { id: j.id, svg: j.svg, expiresLocal: Date.parse(j.expires_at) - offset, mintedLocal: Date.now() };
    tokenRef.current = t;
    setToken(t);
    setError(null);
  }, [router]);

  const tick = useCallback(async () => {
    if (busy.current || document.visibilityState !== "visible") return;
    busy.current = true;
    try {
      const t = tokenRef.current;
      if (!t || t.expiresLocal - Date.now() < QR_ROTATE_BEFORE_MS) {
        await mint();
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
          await mint();
        }
      }
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      busy.current = false;
    }
  }, [mint, router]);

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

  const lifetime = token ? token.expiresLocal - QR_ROTATE_BEFORE_MS - token.mintedLocal : 1;
  const remaining = token ? Math.max(0, token.expiresLocal - QR_ROTATE_BEFORE_MS - now) : 0;
  const flashing = flashes.length > 0;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#0B0D1A] text-white">
      {cover && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt="" className="pointer-events-none absolute inset-0 size-full scale-105 object-cover opacity-80 blur-[3px]" aria-hidden />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0B0D1A]/60 via-[#0B0D1A]/30 to-[#0B0D1A]/75" aria-hidden />
        </>
      )}
      <div className="pointer-events-none absolute inset-0 opacity-60" style={{ background: `radial-gradient(60% 45% at 50% 42%, ${c.accent}55, transparent 70%)` }} aria-hidden />

      <header className="relative z-10 flex items-center gap-2 px-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-6">
        <BackButton fallback="/dashboard" tone="dark" className="size-11" />
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <BusinessAvatar logo={logo} icon={icon} color={color} size={30} rounded="rounded-full" />
          <p className="truncate text-lg font-semibold">{businessName}</p>
        </div>
        <button
          type="button"
          onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.())?.catch?.(() => {})}
          className="grid size-11 place-items-center rounded-full bg-white/10 backdrop-blur hover:bg-white/15"
          aria-label={fullscreen ? "Exit full screen" : "Full screen"}
        >
          {fullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
        </button>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <h1 className="text-center text-[clamp(1.6rem,4.5vh,3rem)] font-bold leading-tight tracking-tight">
          Scan to collect
          <br />
          your stamp
        </h1>

        <div
          className={`relative mt-[3vh] aspect-square w-[min(80vw,52vh,34rem)] rounded-[2rem] bg-white p-[5%] shadow-[0_30px_80px_-20px_rgb(0_0_0/0.6)] transition-[box-shadow,transform] duration-300 ${flashing ? "scale-[1.02] ring-8 ring-success-500" : ""}`}
        >
          {token && !error ? (
            <div key={token.id} className={`size-full animate-fade [&>svg]:size-full ${offline ? "opacity-30" : ""}`} dangerouslySetInnerHTML={{ __html: token.svg }} role="img" aria-label="Pointidi stamp QR code" />
          ) : error ? (
            <div className="grid size-full place-items-center p-4 text-center text-ink">
              <div>
                <p className="text-lg font-bold">{message(error)}</p>
                {error === "subscription_expired" && (
                  <Link href="/billing" className="mt-4 inline-block rounded-2xl bg-brand-600 px-5 py-3 font-semibold text-white">
                    Renew plan
                  </Link>
                )}
                {error === "no_card" && (
                  <Link href="/loyalty" className="mt-4 inline-block rounded-2xl bg-brand-600 px-5 py-3 font-semibold text-white">
                    Create loyalty card
                  </Link>
                )}
                {(error === "network" || error === "rate_limited") && <p className="mt-2 text-sm text-muted">Retrying automatically…</p>}
              </div>
            </div>
          ) : (
            <div className="grid size-full place-items-center text-brand-600">
              <Spinner className="size-10" />
            </div>
          )}
          {offline && token && (
            <div className="absolute inset-0 grid place-items-center rounded-[2rem] text-ink">
              <p className="flex items-center gap-2 rounded-full bg-white px-4 py-2 font-semibold shadow-lift">
                <WifiOff className="size-5" /> Reconnecting…
              </p>
            </div>
          )}
        </div>

        <div className="mt-[3vh] flex h-14 items-center">
          {flashing ? (
            <div key={flashes[flashes.length - 1]!.id} className="flex animate-pop items-center gap-2 rounded-full bg-success-500 px-7 py-3.5 text-xl font-extrabold shadow-[0_12px_30px_-8px_rgb(34_197_94/0.7)]" role="status" aria-live="polite">
              <Check className="size-6" strokeWidth={3} /> +1 STAMP · #{flashes[flashes.length - 1]!.code}
            </div>
          ) : (
            <div className="rounded-full bg-success-500/90 px-8 py-3 text-xl font-extrabold tracking-wide">+1 STAMP</div>
          )}
        </div>

        <div className="mt-4 w-60">
          <div className="h-1 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-white/70 transition-[width] duration-500 ease-linear" style={{ width: `${token ? Math.min(100, (remaining / Math.max(lifetime, 1)) * 100) : 0}%` }} />
          </div>
          <p className="mt-2 text-center text-sm text-white/70">QR updates automatically</p>
        </div>
      </main>
    </div>
  );
}
