"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ImageUp, CameraOff } from "lucide-react";
import { tokenFromScan } from "@/lib/url";

type Detector = (source: CanvasImageSource, w: number, h: number) => Promise<string | null>;

declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
  }
}

/** Native BarcodeDetector where the browser has one; jsQR (loaded only then) everywhere else. */
async function makeDetector(canvas: HTMLCanvasElement): Promise<Detector> {
  if (window.BarcodeDetector) {
    try {
      const native = new window.BarcodeDetector({ formats: ["qr_code"] });
      return async (src) => (await native.detect(src))[0]?.rawValue ?? null;
    } catch {
      /* fall through */
    }
  }
  const jsQR = (await import("jsqr")).default;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  return async (src, w, h) => {
    const scale = Math.min(1, 720 / Math.max(w, h));
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" })?.data ?? null;
  };
}

export function QrScanner() {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const detector = useRef<Detector | null>(null);
  const done = useRef(false);
  const [status, setStatus] = useState<"starting" | "scanning" | "denied" | "unsupported">("starting");
  const [hint, setHint] = useState<string | null>(null);

  const handle = useCallback(
    (text: string | null) => {
      if (!text || done.current) return false;
      const token = tokenFromScan(text);
      if (!token) {
        setHint("That isn't a Pointidi QR code.");
        return false;
      }
      done.current = true;
      navigator.vibrate?.(60);
      router.push(`/scan/${token}`);
      return true;
    },
    [router],
  );

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("unsupported");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }, audio: false });
      } catch {
        if (!cancelled) setStatus("denied");
        return;
      }
      if (cancelled || !video.current) return stream.getTracks().forEach((t) => t.stop());
      video.current.srcObject = stream;
      await video.current.play().catch(() => {});
      detector.current = await makeDetector(canvas.current!);
      setStatus("scanning");

      const tick = async () => {
        if (cancelled || done.current) return;
        const v = video.current;
        if (v && v.readyState >= 2 && v.videoWidth) {
          try {
            if (handle(await detector.current!(v, v.videoWidth, v.videoHeight))) return;
          } catch {
            /* a dropped frame */
          }
        }
        timer = setTimeout(tick, 160);
      };
      void tick();
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [handle]);

  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(null), 2500);
    return () => clearTimeout(t);
  }, [hint]);

  async function fromFile(file: File | undefined) {
    if (!file) return;
    try {
      const bitmap = await createImageBitmap(file);
      detector.current ??= await makeDetector(canvas.current!);
      const text = await detector.current(bitmap, bitmap.width, bitmap.height);
      if (!text) setHint("No QR code found in that photo.");
      else handle(text);
    } catch {
      setHint("Couldn't read that photo.");
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0B0D1A] text-white">
      <header className="relative z-10 flex items-center gap-2 px-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <Link href="/customer" className="grid size-11 place-items-center rounded-full bg-white/10 backdrop-blur" aria-label="Back">
          <ChevronLeft className="size-6" />
        </Link>
        <h1 className="flex-1 pr-11 text-center text-base font-semibold">Scan QR</h1>
      </header>

      <video ref={video} className="absolute inset-0 size-full object-cover" playsInline muted aria-hidden />
      <canvas ref={canvas} className="hidden" />
      <div className="absolute inset-0 bg-black/35" aria-hidden />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-8">
        {status === "denied" || status === "unsupported" ? (
          <div className="max-w-xs text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-white/10">
              <CameraOff className="size-8" />
            </span>
            <p className="mt-4 text-lg font-semibold">{status === "denied" ? "Camera access is off" : "Camera not available"}</p>
            <p className="mt-2 text-sm text-white/70">
              Allow camera access in your browser settings, or simply open your phone&apos;s camera app and point it at the business QR code.
            </p>
          </div>
        ) : (
          <>
            <div className="relative aspect-square w-full max-w-[18rem]">
              {["left-0 top-0 border-l-4 border-t-4 rounded-tl-3xl", "right-0 top-0 border-r-4 border-t-4 rounded-tr-3xl", "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-3xl", "bottom-0 right-0 border-b-4 border-r-4 rounded-br-3xl"].map((c) => (
                <span key={c} className={`absolute size-14 border-white ${c}`} />
              ))}
              {status === "scanning" && <span className="absolute inset-x-6 top-1/2 h-0.5 animate-pulse rounded-full bg-brand-400 shadow-[0_0_16px_4px_rgb(130_121_249/0.6)]" />}
            </div>
            <p className="mt-8 text-center text-[15px] font-medium text-white/90">{status === "starting" ? "Starting camera…" : "Point your camera at the business QR code"}</p>
          </>
        )}
        {hint && <p className="mt-4 rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur" role="status">{hint}</p>}
      </div>

      <div className="relative z-10 flex justify-center pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <label className="grid size-16 cursor-pointer place-items-center rounded-full border border-white/25 bg-white/10 backdrop-blur transition active:scale-95" aria-label="Scan a photo of a QR code">
          <ImageUp className="size-7" />
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => fromFile(e.target.files?.[0])} />
        </label>
      </div>
    </div>
  );
}
