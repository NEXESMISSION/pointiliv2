"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useAb } from "./AbProvider";

type Detector = (src: HTMLVideoElement, w: number, h: number) => Promise<string | null>;

/** The phone's own QR reader when it has one; jsQR, loaded only then, otherwise. */
async function makeDetector(canvas: HTMLCanvasElement): Promise<Detector> {
  if (window.BarcodeDetector) {
    try {
      const native = new window.BarcodeDetector({ formats: ["qr_code"] });
      return async (src) => (await native.detect(src))[0]?.rawValue ?? null;
    } catch {
      /* fall through to jsQR */
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
    return jsQR(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" })?.data ?? null;
  };
}

/**
 * Full screen, back camera, one read. The member holds up the card on their
 * phone; the first QR that looks like an Abonili card closes the camera.
 */
export function Scanner({ onRead, onClose }: { onRead: (text: string) => void; onClose: () => void }) {
  const { a } = useAb();
  const video = useRef<HTMLVideoElement>(null);
  const [denied, setDenied] = useState(false);
  // the latest callback, without restarting the camera every time the parent renders
  const read = useRef(onRead);
  useEffect(() => {
    read.current = onRead;
  }, [onRead]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stop = false;
    let timer = 0;
    const canvas = document.createElement("canvas");

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("no camera");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
          audio: false,
        });
        if (stop) return;
        const v = video.current!;
        v.srcObject = stream;
        await v.play();
        const detect = await makeDetector(canvas);
        const tick = async () => {
          if (stop) return;
          if (v.readyState >= 2 && v.videoWidth) {
            const text = await detect(v, v.videoWidth, v.videoHeight).catch(() => null);
            // only an Abonili card closes the camera; anything else keeps looking
            if (text && /[A-Za-z0-9_-]{24}\/?$/.test(text.trim())) {
              stop = true;
              navigator.vibrate?.(40);
              read.current(text.trim());
              return;
            }
          }
          timer = window.setTimeout(tick, 110);
        };
        void tick();
      } catch {
        setDenied(true);
      }
    })();

    return () => {
      stop = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="ab-scan" role="dialog" aria-modal="true" aria-label={a.door.scan}>
      <video ref={video} playsInline muted />
      <div className="ab-scan-frame"><span /></div>
      <div className="ab-scan-bar">
        <p className={denied ? "ab-alert" : "text-[15px] font-semibold text-white"}>{denied ? a.door.cameraDenied : a.door.scanHint}</p>
        <button type="button" className="ab-btn ab-btn-quiet ab-btn-block" onClick={onClose}>
          <X aria-hidden />
          {a.door.scanStop}
        </button>
      </div>
    </div>
  );
}
