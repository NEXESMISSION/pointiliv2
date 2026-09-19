import QRCode from "qrcode";
import { Check, Gift } from "lucide-react";
import { CardIcon } from "@/components/CardIcon";
import { getI18n } from "@/lib/i18n/server";
import { siteUrl } from "@/lib/url";

/** A real, scannable QR (it opens "How it works") for the product illustrations. */
export function demoQr(color = "#0c0c14") {
  return QRCode.toString(`${siteUrl()}/how-it-works`, { type: "svg", width: 512, margin: 0, errorCorrectionLevel: "M", color: { dark: color, light: "#00000000" } });
}

function Qr({ svg, className = "" }: { svg: string; className?: string }) {
  return <div aria-hidden className={`[&>svg]:block [&>svg]:size-full ${className}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}

function Stamps({ filled, total, size = "md" }: { filled: number; total: number; size?: "sm" | "md" }) {
  return (
    <div className={`grid grid-cols-5 ${size === "sm" ? "gap-1" : "gap-1.5"}`}>
      {Array.from({ length: total }, (_, i) =>
        i < filled ? (
          <span key={i} className="grid aspect-square place-items-center rounded-full bg-white text-brand-600">
            <Check className="size-[55%]" strokeWidth={3.2} />
          </span>
        ) : (
          <span key={i} className="grid aspect-square place-items-center rounded-full border-[1.5px] border-dashed border-white/40 text-white/60">
            {i === total - 1 && <Gift className="size-[50%]" />}
          </span>
        ),
      )}
    </div>
  );
}

/** Hero: the shop's counter QR next to the customer's phone — the whole product in one picture. */
export async function HeroShowcase({ qr }: { qr: string }) {
  const { t, fill } = await getI18n();
  const s = t.marketing.showcase;
  return (
    <div role="img" aria-label={s.heroAlt} className="relative grid grid-cols-[1fr_1.12fr] items-center">
      {/* Counter QR */}
      <div className="relative -me-5 -rotate-3 rounded-[1.25rem] border border-line bg-white p-3 shadow-lift sm:-me-8 sm:p-5">
        <div className="flex items-center gap-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#FFF4DE] text-[#D97706] sm:size-9">
            <CardIcon name="coffee" className="size-4 sm:size-5" />
          </span>
          <span className="min-w-0 text-start leading-tight">
            <span className="block truncate text-[11px] font-semibold text-ink sm:text-sm">{s.demoCafe}</span>
            <span className="block truncate text-[10px] text-muted sm:text-xs">{s.scanForStamp}</span>
          </span>
        </div>
        <Qr svg={qr} className="mt-3 aspect-square sm:mt-4" />
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-line sm:mt-4">
          <div className="h-full w-2/3 rounded-full bg-brand-600" />
        </div>
        <p className="mt-1.5 text-center text-[10px] text-muted sm:text-xs">{fill(s.newCode, { time: "0:42" })}</p>
      </div>

      {/* Customer phone */}
      <div className="relative z-10 rounded-[2rem] border border-line bg-white p-1.5 shadow-lift sm:rounded-[2.5rem] sm:p-2">
        <div className="relative overflow-hidden rounded-[1.6rem] bg-canvas px-2.5 pb-3 pt-7 sm:rounded-[2rem] sm:px-4 sm:pb-5 sm:pt-10">
          <span aria-hidden className="absolute left-1/2 top-2 h-3.5 w-12 -translate-x-1/2 rounded-full bg-ink sm:top-3 sm:h-5 sm:w-20" />

          <div className="flex animate-pop items-center gap-2 rounded-xl border border-line bg-white p-1.5 text-start shadow-card sm:p-2.5" style={{ animationDelay: "500ms" }}>
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-success-500 text-white sm:size-7">
              <Check className="size-3 sm:size-4" strokeWidth={3} />
            </span>
            <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-ink sm:text-[13px]">{s.stampAdded}</span>
            <span className="text-[9px] text-muted sm:text-xs">{s.now}</span>
          </div>

          <div className="mt-2 rounded-2xl p-2.5 text-start text-white sm:mt-3 sm:p-4" style={{ background: "linear-gradient(150deg, #7547EE 0%, #5029C5 100%)" }}>
            <div className="flex items-center gap-2">
              <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-white/15 sm:size-9 sm:rounded-xl">
                <CardIcon name="coffee" className="size-3.5 sm:size-5" />
              </span>
              <span className="min-w-0 flex-1 truncate text-[11px] font-semibold sm:text-[15px]">{s.demoCafe}</span>
              <span className="text-[13px] font-bold tabular sm:text-xl">
                7<span className="text-[10px] font-medium text-white/60 sm:text-sm">/10</span>
              </span>
            </div>
            <div className="mt-2.5 sm:mt-4">
              <Stamps filled={7} total={10} size="sm" />
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-white/12 px-2 py-1.5 text-[9px] font-medium sm:mt-4 sm:rounded-xl sm:px-3 sm:py-2 sm:text-xs">
              <Gift className="size-3 shrink-0 sm:size-3.5" />
              <span className="min-w-0 flex-1 truncate">{s.freeCoffee}</span>
              <span className="shrink-0 text-white/70">{fill(s.toGo, { n: 3 })}</span>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-2 rounded-xl border border-line bg-white p-2 text-start sm:mt-3 sm:p-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-ink text-white sm:size-8">
              <CardIcon name="scissors" className="size-3.5 sm:size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[10px] font-semibold text-ink sm:text-[13px]">{s.demoSalon}</span>
              <span className="mt-1 block h-1 overflow-hidden rounded-full bg-line">
                <span className="block h-full w-[38%] rounded-full bg-ink" />
              </span>
            </span>
            <span className="text-[10px] font-semibold text-muted tabular sm:text-xs">3/8</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Small product snippets that illustrate each step. */
export async function StepVisual({ step, qr }: { step: "qr" | "scan" | "stamp" | "reward"; qr: string }) {
  const { t } = await getI18n();
  const s = t.marketing.showcase;
  return (
    <div aria-hidden className="relative grid h-44 place-items-center overflow-hidden rounded-xl bg-canvas">
      <div className="absolute inset-0 bg-[radial-gradient(#dcdce3_1px,transparent_1px)] [background-size:16px_16px] opacity-70" />
      <div className="relative">
        {step === "qr" && (
          <div className="w-32 rounded-2xl border border-line bg-white p-3 shadow-lift">
            <Qr svg={qr} className="aspect-square" />
            <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-line">
              <div className="h-full w-3/5 rounded-full bg-brand-600" />
            </div>
          </div>
        )}

        {step === "scan" && (
          <div className="w-28 rounded-[1.4rem] bg-ink p-1.5 shadow-lift">
            <div className="relative grid aspect-[9/13] place-items-center overflow-hidden rounded-[1.1rem] bg-[#1c1c28]">
              <div className="relative size-16">
                <Qr svg={qr} className="size-full opacity-90 invert" />
                {["left-0 top-0 border-l-2 border-t-2", "right-0 top-0 border-r-2 border-t-2", "bottom-0 left-0 border-b-2 border-l-2", "bottom-0 right-0 border-b-2 border-r-2"].map((c) => (
                  <span key={c} className={`absolute -m-2 size-4 rounded-[3px] border-brand-400 ${c}`} />
                ))}
                <span className="absolute inset-x-[-6px] top-1/2 h-0.5 animate-pulse rounded-full bg-brand-400 shadow-[0_0_12px_2px_rgba(139,92,246,0.7)]" />
              </div>
            </div>
          </div>
        )}

        {step === "stamp" && (
          <div className="w-52 rounded-2xl p-3.5 text-white shadow-lift" style={{ background: "linear-gradient(150deg, #7547EE 0%, #5029C5 100%)" }}>
            <div className="flex items-center justify-between text-[13px] font-semibold">
              <span>{s.demoCafe}</span>
              <span className="tabular">8/10</span>
            </div>
            <div className="mt-3">
              <Stamps filled={8} total={10} />
            </div>
            <span className="absolute -end-3 -top-3 rounded-full bg-success-500 px-2.5 py-1 text-xs font-bold text-white shadow-lift">+1</span>
          </div>
        )}

        {step === "reward" && (
          <div className="flex w-52 items-center gap-3 rounded-2xl border border-line bg-white p-3.5 shadow-lift">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <Gift className="size-5" />
            </span>
            <span className="min-w-0 flex-1 text-start">
              <span className="block text-sm font-semibold text-ink">{t.marketing.showcase.freeCoffee}</span>
              <span className="block font-mono text-xs tracking-widest text-muted">482 913</span>
            </span>
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-success-500 text-white">
              <Check className="size-4" strokeWidth={3} />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
