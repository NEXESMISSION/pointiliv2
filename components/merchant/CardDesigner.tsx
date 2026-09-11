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
import { CARD_ICONS } from "@/lib/constants";
import { isLight, patternImage, PATTERNS, shade, surface, SWATCHES, TEMPLATE_IDS, TEMPLATES, type CardDesign, type PatternId, type StampStyle, type TemplateId } from "@/lib/card-design";

type Business = { name: string; logo_url: string | null; cover_url: string | null };

const PATTERN_LABEL: Record<PatternId, string> = { none: "None", dots: "Dots", waves: "Waves", grid: "Grid", confetti: "Confetti" };
const STAMP_OPTIONS: { id: StampStyle; label: string; icon: ReactNode }[] = [
  { id: "icon", label: "Icon", icon: null },
  { id: "logo", label: "Your logo", icon: <ImageIcon className="size-4" /> },
  { id: "check", label: "Check", icon: <Check className="size-4" strokeWidth={3} /> },
  { id: "heart", label: "Heart", icon: <Heart className="size-4" fill="currentColor" /> },
  { id: "star", label: "Star", icon: <Star className="size-4" fill="currentColor" /> },
];

function guessBrand(d: CardDesign) {
  if (d.template === "bold") return d.bg;
  if (d.template === "classic" || d.template === "pastel") return d.accent;
  return "#4536F0";
}

export function CardDesigner({ initial, description, business, stampsRequired, rewardName, welcome, disabled, branding }: { initial: CardDesign; description: string; business: Business; stampsRequired: number; rewardName: string; welcome: boolean; disabled?: boolean; branding: ReactNode }) {
  const [d, setD] = useState<CardDesign>(initial);
  const [saved, setSaved] = useState({ design: initial, description });
  const [brand, setBrand] = useState(() => guessBrand(initial));
  const [subtitle, setSubtitle] = useState(description);
  const [preview, setPreview] = useState(Math.max(1, Math.round(stampsRequired * 0.6)));
  const [saving, start] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const dirty = JSON.stringify(d) !== JSON.stringify(saved.design) || subtitle !== saved.description;
  const set = (patch: Partial<CardDesign>) => setD((x) => ({ ...x, ...patch }));
  const applyTemplate = (t: TemplateId, color = brand) => setD((x) => ({ ...x, template: t, ...TEMPLATES[t].make(color) }));
  const pickBrand = (c: string) => {
    setBrand(c);
    applyTemplate(d.template, c);
  };

  const save = () =>
    start(async () => {
      const res = await saveCardDesign({ design: d, description: subtitle });
      toast(res.message, res.ok ? "success" : "error");
      if (!res.ok) return;
      setSaved({ design: d, description: subtitle });
      if (welcome) router.push("/dashboard?ready=1");
      else router.refresh();
    });

  const accentChoices = Array.from(new Set(["#FFFFFF", brand, "#F5C451", "#111827", shade(brand, 0.35), "#E11D48", "#0E9F6E"].map((c) => c.toUpperCase())));
  const bgChoices = Array.from(new Set([brand, shade(brand, 0.3), ...SWATCHES].map((c) => c.toUpperCase())));

  return (
    <>
      <fieldset disabled={disabled} className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <aside className="order-first min-w-0 lg:sticky lg:top-8 lg:order-last">
          <LoyaltyCardVisual design={d} business={business} subtitle={subtitle} filled={preview} total={stampsRequired} rewardName={rewardName} />
          <label className="mt-3 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm shadow-card">
            <span className="font-medium text-body">Preview stamps</span>
            <input type="range" min={0} max={stampsRequired} value={preview} onChange={(e) => setPreview(Number(e.target.value))} className="min-w-0 flex-1 accent-brand-600" />
            <span className="w-12 text-right font-semibold text-ink tabular">
              {preview}/{stampsRequired}
            </span>
          </label>
          <p className="mb-2 mt-4 hidden text-xs font-medium text-muted lg:block">On your customers&apos; home screen</p>
          <div className="hidden lg:block">
            <LoyaltyCardVisual size="tile" design={d} business={business} subtitle={subtitle} filled={preview} total={stampsRequired} rewardName={rewardName} />
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          <Section title="Style" hint="A starting point — fine-tune everything below.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {TEMPLATE_IDS.map((t) => {
                const look = { ...d, template: t, ...TEMPLATES[t].make(brand) } as CardDesign;
                const s = surface(look, !!business.cover_url);
                const active = d.template === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className={`rounded-2xl p-1.5 text-left transition ${active ? "bg-brand-50 ring-2 ring-brand-600" : "bg-canvas hover:bg-line/60"}`}
                    aria-pressed={active}
                  >
                    <span className="relative block h-20 overflow-hidden rounded-xl" style={{ background: s.background, border: s.border }}>
                      {s.photo && business.cover_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={business.cover_url} alt="" className="absolute inset-0 size-full object-cover opacity-70" />
                      )}
                      {look.pattern !== "none" && <span className="absolute inset-0" style={{ backgroundImage: patternImage(look.pattern, s.light) }} />}
                      <span className="absolute bottom-2 left-2 flex gap-1">
                        {[0, 1, 2, 3].map((i) => (
                          <span key={i} className="size-3.5 rounded-full" style={i < 2 ? { background: look.accent } : { border: `2px dashed ${s.emptyBorder}` }} />
                        ))}
                      </span>
                      <span className="absolute left-2 top-2 h-2 w-10 rounded-full" style={{ background: s.fg, opacity: 0.8 }} />
                    </span>
                    <span className="block px-1 pb-0.5 pt-1.5">
                      <span className="block text-sm font-semibold text-ink">{TEMPLATES[t].label}</span>
                      <span className="block truncate text-xs text-muted">{t === "photo" && !business.cover_url ? "Add a cover photo" : TEMPLATES[t].hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="Main colour">
            <Swatches value={brand} choices={SWATCHES} onPick={pickBrand} />
          </Section>

          <Section title="Stamps">
            <div className="flex flex-wrap gap-2">
              {STAMP_OPTIONS.map((o) => (
                <Chip key={o.id} active={d.stamp === o.id} disabled={o.id === "logo" && !business.logo_url} onClick={() => set({ stamp: o.id })}>
                  {o.id === "icon" ? <CardIcon name={d.icon} className="size-4" /> : o.icon} {o.label}
                </Chip>
              ))}
            </div>
            {d.stamp === "logo" && !business.logo_url && <p className="mt-2 text-xs text-muted">Upload a logo below to use it as your stamp.</p>}
            {d.stamp === "icon" && (
              <div className="mt-4 grid grid-cols-6 gap-2">
                {CARD_ICONS.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => set({ icon: name })}
                    aria-label={name}
                    aria-pressed={d.icon === name}
                    className={`grid aspect-square place-items-center rounded-2xl border transition ${d.icon === name ? "border-transparent bg-ink text-white" : "border-line bg-white text-body hover:bg-canvas"}`}
                  >
                    <CardIcon name={name} className="size-5" />
                  </button>
                ))}
              </div>
            )}
            <p className="mb-2 mt-4 text-sm font-medium text-body">Stamp colour</p>
            <Swatches value={d.accent} choices={accentChoices} onPick={(c) => set({ accent: c })} />
          </Section>

          <Section title="Background">
            <Swatches value={d.bg} choices={bgChoices} onPick={(c) => set({ bg: c, text: isLight(c) ? "dark" : "light", use_cover: false })} />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Toggle label="Gradient" checked={!!d.bg2} onChange={(on) => set({ bg2: on ? shade(d.bg, 0.28) : null })} />
              <Toggle label="Use cover photo" checked={d.use_cover} disabled={!business.cover_url} hint={business.cover_url ? undefined : "Add a cover photo below"} onChange={(on) => set({ use_cover: on, text: on ? "light" : d.text })} />
            </div>
            <p className="mb-2 mt-4 text-sm font-medium text-body">Pattern</p>
            <div className="flex flex-wrap gap-2">
              {PATTERNS.map((p) => (
                <Chip key={p} active={d.pattern === p} onClick={() => set({ pattern: p })}>
                  {PATTERN_LABEL[p]}
                </Chip>
              ))}
            </div>
            <p className="mb-2 mt-4 text-sm font-medium text-body">Text colour</p>
            <div className="flex gap-2">
              <Chip active={d.text === "light"} onClick={() => set({ text: "light" })}>
                <span className="size-4 rounded-full border border-line bg-white" /> Light
              </Chip>
              <Chip active={d.text === "dark"} onClick={() => set({ text: "dark" })} disabled={d.use_cover && !!business.cover_url}>
                <span className="size-4 rounded-full bg-ink" /> Dark
              </Chip>
            </div>
          </Section>

          <Section title="Text on the card">
            <label htmlFor="card-subtitle" className="mb-1.5 block text-sm font-medium text-body">
              Short line under your name
            </label>
            <Input id="card-subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Coffee & more" maxLength={60} />
          </Section>

          {branding}
        </div>
      </fieldset>

      {!disabled && (
        <div className="sticky bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 mt-6 lg:bottom-4">
          <div className="flex items-center gap-3 rounded-2xl bg-ink/95 p-2 pl-4 text-white shadow-lift backdrop-blur">
            <p className="min-w-0 flex-1 truncate text-sm">{dirty ? "You have unsaved changes" : welcome ? "Happy with it?" : "All changes saved"}</p>
            {welcome && (
              <Link href="/dashboard?ready=1" className="px-2 text-sm font-semibold text-white/70 hover:text-white">
                Skip
              </Link>
            )}
            <Button size="md" loading={saving} disabled={!dirty && !welcome} onClick={save}>
              {welcome ? "Save & finish" : "Save design"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Card className="p-5">
      <p className="font-semibold text-ink">{title}</p>
      {hint && <p className="text-sm text-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </Card>
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

function Swatches({ value, choices, onPick }: { value: string; choices: string[]; onPick: (hex: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {choices.map((c) => {
        const active = c.toUpperCase() === value.toUpperCase();
        return (
          <button
            key={c}
            type="button"
            onClick={() => onPick(c.toUpperCase())}
            aria-label={`Colour ${c}`}
            aria-pressed={active}
            className={`grid size-10 place-items-center rounded-full ring-offset-2 transition ${active ? "ring-2 ring-ink" : ""}`}
            style={{ background: c, boxShadow: isLight(c) ? "inset 0 0 0 1px rgba(15,18,34,0.12)" : undefined }}
          >
            {active && <Check className="size-4" strokeWidth={3} style={{ color: isLight(c) ? "#0F1222" : "#FFFFFF" }} />}
          </button>
        );
      })}
      <label className="relative grid size-10 cursor-pointer place-items-center overflow-hidden rounded-full border-2 border-dashed border-line text-lg font-bold text-muted" title="Custom colour">
        +
        <input type="color" value={value} onChange={(e) => onPick(e.target.value.toUpperCase())} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Custom colour" />
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
      className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-2 text-left disabled:opacity-50"
    >
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-success-500" : "bg-line"}`}>
        <span className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-[left] ${checked ? "left-[1.375rem]" : "left-0.5"}`} />
      </span>
    </button>
  );
}
