"use client";

import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { uploadLogo } from "@/app/actions";
import { signal } from "@/lib/track";
import { t } from "@/lib/t";

/**
 * The picture made small on the phone before it travels: whatever the phone
 * can show (a photo, a PNG, an iPhone's HEIC), fitted whole into 512×512 —
 * the server makes the final 256×256 WebP.
 */
async function shrink(file: File): Promise<Blob> {
  const src = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = src;
    await img.decode();
    const scale = Math.min(1, 512 / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    c.getContext("2d")!.drawImage(img, 0, 0, w, h);
    // WebP where the browser can make it (Safari makes PNG instead: the server takes both)
    return await new Promise<Blob>((ok, fail) => c.toBlob((b) => (b ? ok(b) : fail(new Error("blob"))), "image/webp", 0.92));
  } finally {
    URL.revokeObjectURL(src);
  }
}

/**
 * The shop's logo, beside its name: a square to tap (the phone's gallery or
 * camera opens), the logo in it once chosen, a small × to take it away. Not
 * needed — the owner can add it, change it or remove it any time from «المحل».
 */
export function LogoPicker({ value, onChange, onError }: { value: string; onChange: (url: string) => void; onError: (message: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file: File) {
    setBusy(true);
    onError(null);
    try {
      const fd = new FormData();
      fd.append("logo", await shrink(file), "logo");
      const res = await uploadLogo(fd);
      if (res.url) {
        onChange(res.url);
        signal("logo", value ? "changed" : "added");
      } else {
        onError(res.error ?? t.errLogo);
        signal("form_error", `logo · ${res.error ?? "?"}`);
      }
    } catch {
      onError(t.errLogo);
      signal("form_error", "logo · unreadable");
    }
    setBusy(false);
  }

  return (
    <span className="relative block shrink-0">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        aria-label={value ? t.logoChange : t.logoAdd}
        className={`press relative grid size-[3.5rem] place-items-center overflow-hidden rounded-[1.125rem] ${value ? "bg-white shadow-[var(--shadow-card),inset_0_0_0_1px_var(--color-line)]" : "border-2 border-dashed border-brand/35 bg-brand-soft/60 text-brand"}`}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="size-full object-contain p-1" />
        ) : (
          <span className="flex flex-col items-center gap-0.5">
            <Camera className="size-5" />
            <span className="text-[0.625rem] font-bold leading-none">{t.logo}</span>
          </span>
        )}
        {busy && (
          <span className="absolute inset-0 grid place-items-center bg-white/80">
            <span className="size-6 animate-spin rounded-full border-[3px] border-line border-t-brand" />
          </span>
        )}
      </button>
      {value && !busy && (
        <button type="button" onClick={() => onChange("")} aria-label={t.logoRemove} className="press absolute -end-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-ink text-white shadow-card">
          <X className="size-3.5" strokeWidth={3} />
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void pick(f);
        }}
      />
    </span>
  );
}
