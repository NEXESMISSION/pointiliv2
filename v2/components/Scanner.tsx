"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Camera, X } from "lucide-react";
import { t } from "@/lib/t";

/** Our codes only: a counter code (/s/…) on any host the app runs on. */
function pathOf(text: string): string | null {
  try {
    const u = new URL(text);
    return /^\/s\/[A-Za-z0-9_-]{20,64}$/.test(u.pathname) ? u.pathname : null;
  } catch {
    return null;
  }
}

const CORNERS = [
  "top-0 start-0 border-t-4 border-s-4 rounded-ss-[1.75rem]",
  "top-0 end-0 border-t-4 border-e-4 rounded-se-[1.75rem]",
  "bottom-0 start-0 border-b-4 border-s-4 rounded-es-[1.75rem]",
  "bottom-0 end-0 border-b-4 border-e-4 rounded-ee-[1.75rem]",
];

/**
 * The in-app camera: point it at the counter's code, and the scan opens by
 * itself. If the camera is refused, a photo of the code does the same job.
 * The shop uses the same camera for a customer's own code: `read` says what
 * a code means (null: not ours), `onRead` takes it instead of opening a page,
 * and `children` sit at the bottom (the way back to typing the code).
 */
export function Scanner({
  back = "/",
  title = t.scanTitle,
  hint = t.scanHint,
  read = pathOf,
  onRead,
  children,
}: {
  back?: string;
  title?: string;
  hint?: string;
  read?: (text: string) => string | null;
  onRead?: (value: string) => void;
  children?: React.ReactNode;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [off, setOff] = useState(false);
  const router = useRouter();
  const found = useRef(false);
  const readRef = useRef(read);
  const onReadRef = useRef(onRead);
  useEffect(() => {
    readRef.current = read;
    onReadRef.current = onRead;
  });

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frame = 0;
    const go = (value: string) => {
      if (found.current) return;
      found.current = true;
      navigator.vibrate?.(40);
      if (onReadRef.current) onReadRef.current(value);
      else router.push(value);
    };
    const tick = () => {
      const v = video.current;
      const c = canvas.current;
      if (v && c && v.readyState >= 2 && v.videoWidth) {
        const w = 480;
        const h = Math.round((v.videoHeight / v.videoWidth) * w) || w;
        c.width = w;
        c.height = h;
        const g = c.getContext("2d", { willReadFrequently: true });
        if (g) {
          g.drawImage(v, 0, 0, w, h);
          const hit = jsQR(g.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" });
          const value = hit && readRef.current(hit.data);
          if (value) return go(value);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    if (!navigator.mediaDevices?.getUserMedia) {
      queueMicrotask(() => setOff(true));
    } else {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "environment" }, audio: false })
        .then((s) => {
          stream = s;
          if (video.current) {
            video.current.srcObject = s;
            void video.current.play();
          }
          frame = requestAnimationFrame(tick);
        })
        .catch(() => setOff(true));
    }
    return () => {
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((tr) => tr.stop());
    };
  }, [router]);

  const fromPhoto = async (file: File | undefined) => {
    if (!file || !canvas.current) return;
    const img = await createImageBitmap(file);
    const c = canvas.current;
    const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    const g = c.getContext("2d", { willReadFrequently: true });
    if (!g) return;
    g.drawImage(img, 0, 0, c.width, c.height);
    const hit = jsQR(g.getImageData(0, 0, c.width, c.height).data, c.width, c.height);
    const value = hit && read(hit.data);
    if (!value) return;
    if (onRead) onRead(value);
    else router.push(value);
  };

  return (
    <div className="fixed inset-0 bg-black text-white">
      <video ref={video} className="absolute inset-0 size-full object-cover" playsInline muted />
      <canvas ref={canvas} className="hidden" />
      <div className="absolute inset-0 bg-black/35" aria-hidden />

      <div className="safe-t relative z-10 flex items-center justify-between px-5">
        <Link href={back} className="press grid size-11 place-items-center rounded-full bg-white/15 backdrop-blur" aria-label={t.back}>
          <X className="size-5" />
        </Link>
        <p className="text-[1.125rem] font-bold">{title}</p>
        <span className="size-11" />
      </div>

      <div className="absolute inset-0 grid place-items-center">
        {off ? (
          <div className="mx-8 rounded-[1.625rem] bg-white/10 p-6 text-center backdrop-blur">
            <p className="text-[1.1875rem] font-bold">{t.cameraOff}</p>
            <p className="mt-1.5 text-[0.9375rem] text-white/80">{t.cameraOffBody}</p>
          </div>
        ) : (
          // the frame follows the width, and the height too: it never reaches the hint and the buttons below
          <div className="relative size-[min(68vw,20rem,40dvh)]">
            {CORNERS.map((c) => (
              <span key={c} className={`absolute size-16 border-white ${c}`} />
            ))}
            <span className="absolute inset-x-6 top-1/2 h-0.5 animate-pulse rounded-full bg-white/80 shadow-[0_0_14px_white]" />
          </div>
        )}
      </div>

      <div className="safe-b absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-3 px-5">
        <p className="text-center text-[1rem] font-medium text-white/90">{hint}</p>
        <label className="press grid size-16 cursor-pointer place-items-center rounded-full border border-white/30 bg-white/15 backdrop-blur" aria-label={t.photo}>
          <Camera className="size-7" />
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => void fromPhoto(e.target.files?.[0])} />
        </label>
        {children}
      </div>
    </div>
  );
}
