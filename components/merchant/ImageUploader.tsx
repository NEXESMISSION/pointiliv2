"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { ImageUp, Trash2 } from "lucide-react";
import { removeBusinessImage, uploadBusinessImage } from "@/app/actions/merchant";
import { BusinessAvatar, CardIcon } from "@/components/CardIcon";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { cardColor } from "@/lib/constants";

type Kind = "logo" | "cover";
const SIZE: Record<Kind, [number, number]> = { logo: [512, 512], cover: [1600, 700] };

/**
 * Centre-crop to the right shape and shrink before uploading, so a 6 MB phone
 * photo becomes ~150 KB and uploads in a second on mobile data.
 */
async function prepareImage(file: File, kind: Kind): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const [tw, th] = SIZE[kind];
  const ratio = tw / th;
  let sw = bitmap.width;
  let sh = bitmap.height;
  if (sw / sh > ratio) sw = sh * ratio;
  else sh = sw / ratio;
  const scale = Math.min(1, tw / sw);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  const ctx = canvas.getContext("2d")!;
  const webp = canvas.toDataURL("image/webp").startsWith("data:image/webp");
  if (!webp) {
    ctx.fillStyle = "#fff"; // JPEG has no transparency
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(bitmap, (bitmap.width - sw) / 2, (bitmap.height - sh) / 2, sw, sh, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, webp ? "image/webp" : "image/jpeg", 0.85));
  if (!blob) throw new Error("encode");
  return blob;
}

export function ImageUploader({ kind, url, disabled, icon, color }: { kind: Kind; url: string | null; disabled?: boolean; icon?: string | null; color?: string | null }) {
  const [busy, start] = useTransition();
  const [preview, setPreview] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const router = useRouter();
  const shown = preview ?? url;
  const c = cardColor(color);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Choose an image file.", "error");
      return;
    }
    start(async () => {
      try {
        const blob = await prepareImage(file, kind);
        setPreview(URL.createObjectURL(blob));
        const fd = new FormData();
        fd.append("kind", kind);
        fd.append("file", new File([blob], `${kind}.${blob.type === "image/webp" ? "webp" : "jpg"}`, { type: blob.type }));
        const res = await uploadBusinessImage(fd);
        toast(res.message, res.ok ? "success" : "error");
        if (res.ok) router.refresh();
        else setPreview(null);
      } catch {
        setPreview(null);
        toast("Couldn't read that image. Try a JPG or PNG photo.", "error");
      } finally {
        if (input.current) input.current.value = "";
      }
    });
  };

  const remove = () =>
    start(async () => {
      const res = await removeBusinessImage(kind);
      setPreview(null);
      toast(res.message, res.ok ? "success" : "error");
      router.refresh();
    });

  const picker = (label: string, dark = false) => (
    <label
      className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${dark ? "bg-black/55 text-white backdrop-blur hover:bg-black/70" : "border border-line bg-white text-body hover:bg-canvas"} ${busy ? "pointer-events-none opacity-60" : ""}`}
    >
      <ImageUp className="size-4" /> {label}
      <input ref={input} type="file" accept="image/*" className="sr-only" disabled={disabled || busy} onChange={(e) => onFile(e.target.files?.[0])} />
    </label>
  );

  if (kind === "cover") {
    return (
      <div>
        <p className="mb-2 text-sm font-medium text-body">Cover photo</p>
        <div className="relative aspect-[16/7] overflow-hidden rounded-2xl" style={shown ? undefined : { background: `linear-gradient(135deg, ${c.accent}, ${c.accent}B3)` }}>
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt="Cover photo" className="size-full object-cover" />
          ) : (
            <div className="grid size-full place-items-center text-white">
              <CardIcon name={icon} className="size-14 opacity-30" />
            </div>
          )}
          {busy && (
            <div className="absolute inset-0 grid place-items-center bg-black/30 text-white">
              <Spinner className="size-8" />
            </div>
          )}
          {!disabled && (
            <div className="absolute bottom-2 right-2 flex gap-2">
              {picker(url ? "Change" : "Add cover photo", true)}
              {url && !busy && (
                <button type="button" onClick={remove} className="grid size-10 place-items-center rounded-xl bg-black/55 text-white backdrop-blur hover:bg-black/70" aria-label="Remove cover photo">
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          )}
        </div>
        <p className="mt-1.5 text-xs text-muted">Your shop, your counter or your best product. Shown on customers&apos; cards and behind your QR.</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <BusinessAvatar logo={shown} icon={icon} color={color} size={68} />
        {busy && (
          <span className="absolute inset-0 grid place-items-center rounded-2xl bg-black/30 text-white">
            <Spinner className="size-6" />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">Logo</p>
        <p className="text-xs text-muted">Square images work best.</p>
        {!disabled && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {picker(url ? "Change logo" : "Upload logo")}
            {url && !busy && (
              <button type="button" onClick={remove} className="h-10 px-2 text-sm font-semibold text-danger-600">
                Remove
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
