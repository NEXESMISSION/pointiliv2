"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Download, ImageIcon, Share2, X } from "lucide-react";
import { monthsSaid } from "@/lib/t";

/** one subscription turned on, as the founder's books keep it */
export type PlanShot = { id?: number | null; at: string; kind: "paid" | "until"; months: number | null; until: string | null; amount: number | null; method: string | null; shop: string; owner?: string | null };

const W = 1080;
const H = 1350;
const TZ = "Africa/Tunis";
const day = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "long", year: "numeric", timeZone: TZ }).format(new Date(iso));
const WAYS: Record<string, string> = { cash: "كاش", d17: "D17", virement: "Virement", versement: "Versement", mandat: "Mandat" };

/** a rounded rectangle path */
function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * The receipt of a subscription, drawn as a picture to send the owner (on
 * WhatsApp): the shop, «الأبونمان متاعك تفعّل», until when, for how long, what
 * was paid and how, the day, and a thank-you. Drawn in the browser with the
 * app's own font, so the Arabic is joined and right to left as on screen.
 */
async function draw(p: PlanShot): Promise<string> {
  const family = getComputedStyle(document.body).fontFamily || "sans-serif";
  await Promise.all([document.fonts.load(`700 64px ${family}`, "الأبونمان"), document.fonts.load(`400 40px ${family}`, "متاعك")]).catch(() => {});
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const font = (weight: number, size: number) => `${weight} ${size}px ${family}`;

  // the background: the brand's violet, light from the top corner
  const bg = ctx.createLinearGradient(0, 0, W * 0.4, H);
  bg.addColorStop(0, "#9B7BFF");
  bg.addColorStop(0.45, "#6C47FF");
  bg.addColorStop(1, "#3B1FC0");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  for (const [x, y, r] of [[120, 140, 220], [980, 300, 160], [900, 1260, 260], [80, 1150, 120]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // the name on top
  ctx.direction = "ltr";
  ctx.textAlign = "center";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = font(700, 64);
  ctx.fillText("Pointili", W / 2, 150);

  // the card
  const cx = 70;
  const cy = 230;
  const cw = W - 140;
  const ch = 930;
  ctx.save();
  ctx.shadowColor = "rgba(20,10,60,0.35)";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 24;
  round(ctx, cx, cy, cw, ch, 56);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.restore();

  // the crown, the words, the shop
  ctx.textAlign = "center";
  ctx.font = font(400, 120);
  ctx.fillText("👑", W / 2, cy + 165);
  ctx.direction = "rtl";
  ctx.fillStyle = "#0F0E17";
  ctx.font = font(700, 62);
  ctx.fillText("الأبونمان متاعك تفعّل", W / 2, cy + 280);
  ctx.fillStyle = "#6C47FF";
  ctx.font = font(700, 52);
  ctx.fillText(p.shop.length > 26 ? `${p.shop.slice(0, 25)}…` : p.shop, W / 2, cy + 365);
  if (p.owner) {
    ctx.fillStyle = "#6B6880";
    ctx.font = font(400, 36);
    ctx.fillText(p.owner, W / 2, cy + 420);
  }

  // until when: the big line, in mint
  const until = p.until ? day(p.until) : null;
  round(ctx, cx + 60, cy + 470, cw - 120, 120, 32);
  ctx.fillStyle = "#E7F8EF";
  ctx.fill();
  ctx.fillStyle = "#0E9F5B";
  ctx.font = font(700, 48);
  ctx.fillText(until ? `✓ مخلّص حتى ${until}` : "✓ مخلّص", W / 2, cy + 548);

  // the details: label on the right, value on the left
  const rows: [string, string][] = [];
  if (p.months) rows.push(["المدّة", monthsSaid(p.months)]);
  if (p.amount !== null && p.amount > 0) rows.push(["المبلغ", `${p.amount} د`]);
  if (p.method && WAYS[p.method]) rows.push(["الخلاص", WAYS[p.method]!]);
  rows.push(["نهار التفعيل", day(p.at)]);
  let y = cy + 670;
  for (const [label, value] of rows.slice(0, 4)) {
    ctx.direction = "rtl";
    ctx.textAlign = "right";
    ctx.fillStyle = "#6B6880";
    ctx.font = font(400, 38);
    ctx.fillText(label, cx + cw - 70, y);
    ctx.textAlign = "left";
    ctx.fillStyle = "#0F0E17";
    ctx.font = font(700, 40);
    ctx.fillText(value, cx + 70, y);
    y += 62;
  }
  if (p.id) {
    ctx.direction = "ltr";
    ctx.textAlign = "center";
    ctx.fillStyle = "#A8A5B8";
    ctx.font = font(400, 28);
    ctx.fillText(`N° ${p.id}`, W / 2, cy + ch - 34);
  }

  // the thanks, under the card
  ctx.direction = "ltr";
  ctx.textAlign = "center";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = font(700, 46);
  ctx.fillText("Merci pour votre confiance.", W / 2, 1245);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = font(400, 32);
  ctx.fillText("www.pointili.online", W / 2, 1300);
  return c.toDataURL("image/png");
}

/**
 * A subscription's picture, to send the owner: a button that opens it, or
 * open by itself (`startOpen`) right after the founder turned it on. Saved,
 * copied (to paste in WhatsApp on the computer) or shared from the phone.
 */
export function PlanImage({ plan, startOpen = false, onClose, label = "تصويرة" }: { plan: PlanShot; startOpen?: boolean; onClose?: () => void; label?: string }) {
  const [open, setOpen] = useState(startOpen);
  const [url, setUrl] = useState<string | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const asked = useRef(false);

  useEffect(() => {
    if (!open || asked.current) return;
    asked.current = true;
    void draw(plan).then(setUrl);
  }, [open, plan]);

  const name = `Pointili - ${plan.shop}.png`;
  const blob = async () => (await fetch(url!)).blob();
  const close = () => {
    setOpen(false);
    onClose?.();
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="relative z-[2] inline-flex h-8 items-center gap-1 rounded-[0.5rem] border border-line bg-surface px-2.5 text-[0.8125rem] font-semibold text-body hover:border-brand hover:text-brand">
        <ImageIcon className="size-4" /> {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/55 p-5" onClick={close} role="dialog" aria-modal="true" aria-label={label}>
          <div className="w-full max-w-sm rounded-[1.25rem] bg-surface p-4 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <b className="text-[0.9375rem]">تصويرة الأبونمان</b>
              <button type="button" onClick={close} className="grid size-8 place-items-center rounded-full hover:bg-canvas" aria-label="X">
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-3 overflow-hidden rounded-[0.875rem] bg-canvas">
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={name} className="block w-full" />
              ) : (
                <div className="grid aspect-[4/5] place-items-center text-[0.875rem] text-muted">…</div>
              )}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <a href={url ?? undefined} download={name} className={`inline-flex h-10 items-center justify-center gap-1 rounded-[0.625rem] bg-brand text-[0.8125rem] font-bold text-white ${url ? "" : "pointer-events-none opacity-50"}`}>
                <Download className="size-4" /> نزّل
              </a>
              <button
                type="button"
                disabled={!url}
                onClick={async () => {
                  try {
                    await navigator.clipboard.write([new ClipboardItem({ "image/png": await blob() })]);
                    setSaid("تكوبات: ألصقها في واتساب");
                  } catch {
                    setSaid("ما تكوباتش: نزّلها");
                  }
                }}
                className="inline-flex h-10 items-center justify-center gap-1 rounded-[0.625rem] border border-line bg-surface text-[0.8125rem] font-bold text-body disabled:opacity-50"
              >
                <Copy className="size-4" /> كوبي
              </button>
              <button
                type="button"
                disabled={!url}
                onClick={async () => {
                  const file = new File([await blob()], name, { type: "image/png" });
                  if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] }).catch(() => {});
                  else setSaid("الـشارينغ موش متوفّر هوني: نزّلها");
                }}
                className="inline-flex h-10 items-center justify-center gap-1 rounded-[0.625rem] bg-[#25D366] text-[0.8125rem] font-bold text-white disabled:opacity-50"
              >
                <Share2 className="size-4" /> ابعث
              </button>
            </div>
            {said && <p className="mt-2 text-[0.8125rem] font-semibold text-muted">{said}</p>}
          </div>
        </div>
      )}
    </>
  );
}
