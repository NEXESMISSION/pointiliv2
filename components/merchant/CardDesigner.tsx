"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Check, Heart, ImageIcon, Star } from "lucide-react";
import { saveCardDesign } from "@/app/actions/merchant";
import { CardIcon } from "@/components/CardIcon";
import { LoyaltyCardVisual } from "@/components/LoyaltyCardVisual";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/components/i18n/Provider";
import { CARD_ICONS } from "@/lib/constants";
import { isLight, patternImage, PATTERNS, shade, surface, SWATCHES, TEMPLATE_IDS, TEMPLATES, type CardDesign, type StampStyle, type TemplateId } from "@/lib/card-design";

type Business = { name: string; logo_url: string | null; cover_url: string | null };

const STAMP_ICONS: Record<StampStyle, ReactNode> = {
  icon: null,
  logo: <ImageIcon className="size-4" />,
  check: <Check className="size-4" strokeWidth={3} />,
  heart: <Heart className="size-4" fill="currentColor" />,
  star: <Star className="size-4" fill="currentColor" />,
};
const STAMP_ORDER: StampStyle[] = ["icon", "logo", "check", "heart", "star"];

function guessBrand(d: CardDesign) {
  if (d.template === "bold") return d.bg;
  if (d.template === "classic" || d.template === "pastel") return d.accent;
  return "#6535E0";
}

export function CardDesigner({ initial, description, business, stampsRequired, rewardName, welcome, disabled, branding }: { initial: CardDesign; description: string; business: Business; stampsRequired: number; rewardName: string; welcome: boolean; disabled?: boolean; branding: ReactNode }) {
  const [d, setD] = useState<CardDesign>(initial);
  const [saved, setSaved] = useState({ design: initial, description });
  const [brand, setBrand] = useState(() => guessBrand(initial));
  const [subtitle, setSubtitle] = useState(description);
  const [preview, setPreview] = useState(Math.max(1, Math.round(stampsRequired * 0.6)));
  const [tab, setTab] = useState("style");
  const [saving, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const { t, fill } = useT();
  const w = t.merchant.design;

  const dirty = JSON.stringify(d) !== JSON.stringify(saved.design) || subtitle !== saved.description;
  const set = (patch: Partial<CardDesign>) => setD((x) => ({ ...x, ...patch }));
  const applyTemplate = (tpl: TemplateId, color = brand) => setD((x) => ({ ...x, template: tpl, ...TEMPLATES[tpl].make(color) }));
  const pickBrand = (c: string) => {
    setBrand(c);
    applyTemplate(d.template, c);
  };

  const save = () =>
    start(async () => {
      const res = await saveCardDesign({ design: d, description: subtitle });
      toast(res.ok ? w.saved : res.message, res.ok ? "success" : "error");
      if (!res.ok) return;
      setSaved({ design: d, description: subtitle });
      if (welcome) router.push("/dashboard?ready=1");
      else router.refresh();
    });

  const accentChoices = Array.from(new Set(["#FFFFFF", brand, "#F5C451", "#111827", shade(brand, 0.35), "#E11D48", "#0E9F6E"].map((c) => c.toUpperCase())));
  const bgChoices = Array.from(new Set([brand, shade(brand, 0.3), ...SWATCHES].map((c) => c.toUpperCase())));

  // one panel at a time: the six sections stacked are three phone screens tall
  const tabs = [
    {
      key: "style",
      label: w.style,
      hint: w.styleHint,
      body: (
        <div className="grid grid-cols-3 gap-2">
          {TEMPLATE_IDS.map((tpl) => {
            const look = { ...d, template: tpl, ...TEMPLATES[tpl].make(brand) } as CardDesign;
            const s = surface(look, !!business.cover_url);
            const active = d.template === tpl;
            return (
              <button
                key={tpl}
                type="button"
                onClick={() => applyTemplate(tpl)}
                className={`rounded-xl p-1 text-start transition ${active ? "bg-brand-50 ring-2 ring-brand-600" : "bg-canvas hover:bg-line/60"}`}
                aria-pressed={active}
              >
                <span className="relative block h-14 overflow-hidden rounded-xl" style={{ background: s.background, border: s.border }}>
                  {s.photo && business.cover_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={business.cover_url} alt="" className="absolute inset-0 size-full object-cover opacity-70" />
                  )}
                  {look.pattern !== "none" && <span className="absolute inset-0" style={{ backgroundImage: patternImage(look.pattern, s.light) }} />}
                  <span className="absolute bottom-2 start-2 flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className="size-3.5 rounded-full" style={i < 2 ? { background: look.accent } : { border: `2px dashed ${s.emptyBorder}` }} />
                    ))}
                  </span>
                  <span className="absolute start-2 top-2 h-2 w-10 rounded-full" style={{ background: s.fg, opacity: 0.8 }} />
                </span>
                <span className="block px-0.5 pt-1">
                  <span className="block truncate text-[13px] font-semibold text-ink">{t.data.templates[tpl].name}</span>
                  <span className="block truncate text-xs text-muted">{tpl === "photo" && !business.cover_url ? w.addCover : t.data.templates[tpl].hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      ),
    },
    {
      key: "colour",
      label: w.mainColour,
      body: <Swatches value={brand} choices={SWATCHES} onPick={pickBrand} label={w.colourAria} customLabel={w.customColour} fill={fill} />,
    },
    {
      key: "stamps",
      label: w.stamps,
      body: (
        <>
          <div className="flex flex-wrap gap-2">
            {STAMP_ORDER.map((id) => (
              <Chip key={id} active={d.stamp === id} disabled={id === "logo" && !business.logo_url} onClick={() => set({ stamp: id })}>
                {id === "icon" ? <CardIcon name={d.icon} className="size-4" /> : STAMP_ICONS[id]} {t.data.stampStyles[id]}
              </Chip>
            ))}
          </div>
          {d.stamp === "logo" && !business.logo_url && <p className="mt-2 text-xs text-muted">{w.logoNeeded}</p>}
          {d.stamp === "icon" && (
            <div className="mt-3 grid grid-cols-6 gap-2">
              {CARD_ICONS.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => set({ icon: name })}
                  aria-label={t.merchant.icons[name]}
                  aria-pressed={d.icon === name}
                  className={`grid aspect-square place-items-center rounded-2xl border transition ${d.icon === name ? "border-transparent bg-ink text-white" : "border-line bg-white text-body hover:bg-canvas"}`}
                >
                  <CardIcon name={name} className="size-5" />
                </button>
              ))}
            </div>
          )}
          <p className="mb-1.5 mt-3 text-sm font-medium text-body">{w.stampColour}</p>
          <Swatches value={d.accent} choices={accentChoices} onPick={(c) => set({ accent: c })} label={w.colourAria} customLabel={w.customColour} fill={fill} />
        </>
      ),
    },
    {
      key: "background",
      label: w.background,
      body: (
        <>
          <Swatches value={d.bg} choices={bgChoices} onPick={(c) => set({ bg: c, text: isLight(c) ? "dark" : "light", use_cover: false })} label={w.colourAria} customLabel={w.customColour} fill={fill} />
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Toggle label={w.gradient} checked={!!d.bg2} onChange={(on) => set({ bg2: on ? shade(d.bg, 0.28) : null })} />
            <Toggle label={w.useCover} checked={d.use_cover} disabled={!business.cover_url} hint={business.cover_url ? undefined : w.coverNeeded} onChange={(on) => set({ use_cover: on, text: on ? "light" : d.text })} />
          </div>
          <p className="mb-1.5 mt-3 text-sm font-medium text-body">{w.pattern}</p>
          <div className="flex flex-wrap gap-2">
            {PATTERNS.map((p) => (
              <Chip key={p} active={d.pattern === p} onClick={() => set({ pattern: p })}>
                {t.data.patterns[p]}
              </Chip>
            ))}
          </div>
          <p className="mb-1.5 mt-3 text-sm font-medium text-body">{w.textColour}</p>
          <div className="flex gap-2">
            <Chip active={d.text === "light"} onClick={() => set({ text: "light" })}>
              <span className="size-4 rounded-full border border-line bg-white" /> {w.light}
            </Chip>
            <Chip active={d.text === "dark"} onClick={() => set({ text: "dark" })} disabled={d.use_cover && !!business.cover_url}>
              <span className="size-4 rounded-full bg-ink" /> {w.dark}
            </Chip>
          </div>
        </>
      ),
    },
    {
      key: "text",
      label: w.textOnCard,
      body: (
        <>
          <label htmlFor="card-subtitle" className="mb-1.5 block text-sm font-medium text-body">
            {w.shortLine}
          </label>
          <Input id="card-subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder={w.shortLinePlaceholder} maxLength={60} />
        </>
      ),
    },
    { key: "branding", label: t.merchant.branding.title, body: branding },
  ];

  return (
    <>
      <fieldset disabled={disabled} className="grid min-w-0 grid-cols-1 gap-2.5 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <aside className="order-first min-w-0 lg:sticky lg:top-8 lg:order-last">
          {/* a phone gets the compact card, so the controls fit under it without scrolling */}
          <LoyaltyCardVisual size="tile" className="lg:hidden" design={d} business={business} subtitle={subtitle} filled={preview} total={stampsRequired} rewardName={rewardName} />
          <div className="hidden lg:block">
            <LoyaltyCardVisual design={d} business={business} subtitle={subtitle} filled={preview} total={stampsRequired} rewardName={rewardName} />
          </div>
          <label className="mt-2 flex items-center gap-2.5 rounded-xl bg-white px-3 py-2 text-[13px] shadow-card">
            <span className="font-medium text-body">{w.previewStamps}</span>
            <input type="range" min={0} max={stampsRequired} value={preview} onChange={(e) => setPreview(Number(e.target.value))} className="min-w-0 flex-1 accent-brand-600" />
            <span dir="ltr" className="w-12 text-end font-semibold text-ink tabular">
              {preview}/{stampsRequired}
            </span>
          </label>
          <p className="mb-2 mt-4 hidden text-xs font-medium text-muted lg:block">{w.onHomeScreen}</p>
          <div className="hidden lg:block">
            <LoyaltyCardVisual size="tile" design={d} business={business} subtitle={subtitle} filled={preview} total={stampsRequired} rewardName={rewardName} />
          </div>
        </aside>

        <div className="min-w-0 space-y-2">
          <div className="grid grid-cols-3 gap-1.5">
            {tabs.map((tb) => (
              <button
                key={tb.key}
                type="button"
                onClick={() => setTab(tb.key)}
                aria-pressed={tab === tb.key}
                className={`h-9 truncate rounded-xl px-1.5 text-xs font-semibold transition ${tab === tb.key ? "bg-ink text-white" : "border border-line bg-white text-body hover:bg-canvas"}`}
              >
                {tb.label}
              </button>
            ))}
          </div>
          {/* the open panel scrolls inside itself, so the card above it never moves */}
          <Card className={`overflow-y-auto p-3 lg:max-h-none ${welcome ? "max-h-[8rem]" : "max-h-[16rem]"}`}>
            {tabs.map((tb) => (
              <div key={tb.key} className={tab === tb.key ? "" : "hidden"}>
                {tb.hint && <p className="mb-2 text-center text-xs text-muted">{tb.hint}</p>}
                {tb.body}
              </div>
            ))}
          </Card>
        </div>
      </fieldset>

      {!disabled && (
        <div className="sticky bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 mt-2.5 lg:bottom-4">
          <div className="flex items-center gap-3 rounded-2xl bg-ink/95 p-1.5 ps-3 text-white shadow-lift backdrop-blur">
            <p className="min-w-0 flex-1 truncate text-[13px]">{dirty ? w.unsaved : welcome ? w.happy : w.allSaved}</p>
            {welcome && (
              <Link href="/dashboard?ready=1" className="px-2 text-sm font-semibold text-white/70 hover:text-white">
                {w.skip}
              </Link>
            )}
            <Button size="md" loading={saving} disabled={!dirty && !welcome} onClick={save}>
              {welcome ? w.saveFinish : w.saveDesign}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

function Chip({ active, disabled, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition disabled:opacity-40 ${active ? "bg-ink text-white" : "border border-line bg-white text-body hover:bg-canvas"}`}
    >
      {children}
    </button>
  );
}

function Swatches({ value, choices, onPick, label, customLabel, fill }: { value: string; choices: string[]; onPick: (hex: string) => void; label: string; customLabel: string; fill: (template: string, vars?: Record<string, string | number>) => string }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {choices.map((c) => {
        const active = c.toUpperCase() === value.toUpperCase();
        return (
          <button
            key={c}
            type="button"
            onClick={() => onPick(c.toUpperCase())}
            aria-label={fill(label, { hex: c })}
            aria-pressed={active}
            className={`grid size-10 place-items-center rounded-full ring-offset-2 transition ${active ? "ring-2 ring-ink" : ""}`}
            style={{ background: c, boxShadow: isLight(c) ? "inset 0 0 0 1px rgba(15,18,34,0.12)" : undefined }}
          >
            {active && <Check className="size-4" strokeWidth={3} style={{ color: isLight(c) ? "#0F1222" : "#FFFFFF" }} />}
          </button>
        );
      })}
      <label className="relative grid size-10 cursor-pointer place-items-center overflow-hidden rounded-full border-2 border-dashed border-line text-lg font-bold text-muted" title={customLabel}>
        +
        <input type="color" value={value} onChange={(e) => onPick(e.target.value.toUpperCase())} className="absolute inset-0 cursor-pointer opacity-0" aria-label={customLabel} />
      </label>
    </div>
  );
}

function Toggle({ label, checked, onChange, disabled, hint }: { label: string; checked: boolean; onChange: (on: boolean) => void; disabled?: boolean; hint?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-2 text-start disabled:opacity-50"
    >
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-success-500" : "bg-line"}`}>
        <span className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-[inset-inline-start] ${checked ? "start-[1.375rem]" : "start-0.5"}`} />
      </span>
    </button>
  );
}
