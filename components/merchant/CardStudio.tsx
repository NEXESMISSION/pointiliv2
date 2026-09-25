"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Check, Heart, ImageIcon, Star } from "lucide-react";
import { saveCard } from "@/app/actions/merchant";
import { CardIcon } from "@/components/CardIcon";
import { LoyaltyCardVisual } from "@/components/LoyaltyCardVisual";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/components/i18n/Provider";
import { CARD_ICONS } from "@/lib/constants";
import { isLight, patternImage, PATTERNS, shade, surface, SWATCHES, TEMPLATE_IDS, TEMPLATES, type CardDesign, type StampStyle, type TemplateId } from "@/lib/card-design";
import type { CardImpact } from "@/lib/types";

export type CardValues = {
  name: string;
  description: string;
  stamps_required: number;
  reward_name: string;
  reward_description: string;
  color: string;
  cooldown_minutes: number;
  valid_days: number;
};
type Business = { name: string; logo_url: string | null; cover_url: string | null; category: string };

const STAMP_PICKS = [6, 8, 10, 12];
const WAIT_PICKS = [0, 60, 1440];
const VALID_PICKS = [0, 30, 90, 180, 365];
const STAMP_ORDER: StampStyle[] = ["icon", "logo", "check", "heart", "star"];
const STAMP_ICONS: Record<StampStyle, ReactNode> = {
  icon: null,
  logo: <ImageIcon className="size-4" />,
  check: <Check className="size-4" strokeWidth={3} />,
  heart: <Heart className="size-4" fill="currentColor" />,
  star: <Star className="size-4" fill="currentColor" />,
};

function guessBrand(d: CardDesign) {
  if (d.template === "bold") return d.bg;
  if (d.template === "classic" || d.template === "pastel") return d.accent;
  return "#6535E0";
}

/**
 * The whole card on one sheet: what it gives, how it looks, the pictures on
 * it, how long it lives. The preview never leaves the screen, every change
 * shows on it at once, and one button saves all of it. Nothing folded away.
 */
export function CardStudio({ initial, design: initialDesign, business, isNew, disabled, impact, branding }: { initial: CardValues; design: CardDesign; business: Business; isNew: boolean; disabled?: boolean; impact: CardImpact | null; branding: ReactNode }) {
  const { t, count, fill } = useT();
  const w = t.merchant.loyalty;
  const ds = t.merchant.design;
  const toast = useToast();
  const router = useRouter();
  const [saving, start] = useTransition();

  const allIdeas = t.merchant.ideas as unknown as Record<string, Record<string, string>>;
  const ideas = Object.values(allIdeas[business.category] ?? allIdeas.other!);

  const [v, setV] = useState<CardValues>({ ...initial, reward_name: initial.reward_name || ideas[0]! });
  const [d, setD] = useState<CardDesign>(initialDesign);
  const [saved, setSaved] = useState({ v: { ...initial, reward_name: initial.reward_name || ideas[0]! }, d: initialDesign });
  const [brand, setBrand] = useState(() => guessBrand(initialDesign));
  const [custom, setCustom] = useState(!STAMP_PICKS.includes(initial.stamps_required));
  const [preview, setPreview] = useState(Math.max(1, Math.round(initial.stamps_required * 0.6)));
  const [ask, setAsk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patch = (p: Partial<CardValues>) => setV((x) => ({ ...x, ...p }));
  const set = (p: Partial<CardDesign>) => setD((x) => ({ ...x, ...p }));
  const applyTemplate = (tpl: TemplateId, color = brand) => setD((x) => ({ ...x, template: tpl, ...TEMPLATES[tpl].make(color) }));
  const pickBrand = (c: string) => {
    setBrand(c);
    applyTemplate(d.template, c);
  };
  const dirty = isNew || JSON.stringify(v) !== JSON.stringify(saved.v) || JSON.stringify(d) !== JSON.stringify(saved.d);

  // ── what saving would do to customers already collecting ──────────────
  const stamps = v.stamps_required;
  const current = impact?.stamps_required ?? null;
  const rows = impact?.progress ?? [];
  const tally = (f: (r: CardImpact["progress"][number]) => boolean) => rows.filter(f).reduce((a, r) => a + r.n, 0);
  const raised = !isNew && current !== null && stamps > current;
  const lowered = !isNew && current !== null && stamps < current;
  const keepGoal = raised ? tally((r) => r.target < stamps) : 0;
  const unlockNow = lowered ? tally((r) => r.balance >= stamps && r.balance < r.target) : 0;
  const renamed = !isNew && !!initial.reward_name && v.reward_name.trim() !== initial.reward_name && (impact?.customers ?? 0) > 0;
  const needsConfirm = keepGoal > 0 || unlockNow > 0 || renamed;

  const impactMessages = (
    <>
      {raised && keepGoal > 0 && (
        <li>
          <b>{count(t.common.customersCount, keepGoal)}</b> {fill(w.keepGoalRest, { n: stamps })}
        </li>
      )}
      {lowered && <li>{unlockNow > 0 ? <><b>{count(t.common.customersCount, unlockNow)}</b> {fill(w.unlockNowRest, { reward: v.reward_name || w.theReward })}</> : w.fewerAll}</li>}
      {renamed && (
        <li>
          {fill(w.renamed, { next: v.reward_name.trim(), prev: initial.reward_name })}
          {impact && impact.pending_redemptions > 0 ? fill(w.renamedPending, { requests: count(w.requestsCount, impact.pending_redemptions) }) : ""}
        </li>
      )}
    </>
  );

  const run = () =>
    start(async () => {
      setError(null);
      const res = await saveCard({ ...v, reward_name: v.reward_name.trim(), design: d });
      if (!res.ok) {
        setError(res.message);
        toast(res.message, "error");
        return;
      }
      toast(res.message, "success");
      if (res.created) {
        router.push("/dashboard?ready=1");
        return;
      }
      setSaved({ v, d });
      router.refresh();
    });
  const save = () => (needsConfirm ? setAsk(true) : run());

  const accentChoices = Array.from(new Set(["#FFFFFF", brand, "#F5C451", "#111827", shade(brand, 0.35), "#E11D48", "#0E9F6E"].map((c) => c.toUpperCase())));
  const bgChoices = Array.from(new Set([brand, shade(brand, 0.3), ...SWATCHES].map((c) => c.toUpperCase())));
  const cardProps = { design: d, business, subtitle: v.description, total: stamps, rewardName: v.reward_name };
  const validChoices = [...new Set([...VALID_PICKS, initial.valid_days])].sort((a, b) => a - b);

  return (
    <>
      <fieldset disabled={disabled} className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        {/* The preview stays put: on a phone it is pinned to the top of the scroll, on a desk it sits beside the sheet. */}
        <aside className="sticky top-0 z-20 -mx-4 min-w-0 bg-canvas px-4 pb-2 pt-1 lg:static lg:order-last lg:mx-0 lg:sticky lg:top-6 lg:bg-transparent lg:p-0">
          <LoyaltyCardVisual size="tile" className="lg:hidden" filled={preview} {...cardProps} />
          <div className="hidden lg:block">
            <LoyaltyCardVisual filled={preview} {...cardProps} />
            <label className="mt-2 flex items-center gap-2.5 rounded-xl bg-white px-3 py-2 text-[13px] shadow-card">
              <span className="font-medium text-body">{ds.previewStamps}</span>
              <input type="range" min={0} max={stamps} value={Math.min(preview, stamps)} onChange={(e) => setPreview(Number(e.target.value))} className="min-w-0 flex-1 accent-brand-600" />
              <span dir="ltr" className="w-12 text-end font-semibold text-ink tabular">
                {Math.min(preview, stamps)}/{stamps}
              </span>
            </label>
          </div>
        </aside>

        <div className="min-w-0 space-y-3">
          {error && <Alert>{error}</Alert>}

          {/* what the card gives */}
          <Card className="divide-y divide-line">
            <Section label={w.stampsQuestion} hint={w.stampsHint}>
              <div className="grid grid-cols-5 gap-2">
                {STAMP_PICKS.map((n) => (
                  <Pick key={n} active={!custom && stamps === n} onClick={() => { setCustom(false); patch({ stamps_required: n }); }}>
                    {n}
                  </Pick>
                ))}
                <Pick active={custom} onClick={() => setCustom(true)}>{w.otherNumber}</Pick>
              </div>
              {custom && (
                <Input type="number" min={2} max={30} value={stamps} onChange={(e) => patch({ stamps_required: Math.min(30, Math.max(2, Number(e.target.value) || 2)) })} className="mt-2 tabular" aria-label={w.otherNumber} />
              )}
              {(raised || lowered) && (keepGoal > 0 || lowered) && (
                <Alert tone={lowered ? "success" : "info"} className="mt-3" title={lowered ? w.goodNews : w.fair}>
                  <ul className="list-none space-y-1">{impactMessages}</ul>
                </Alert>
              )}
            </Section>

            <Section label={w.rewardQuestion}>
              <Input id="reward_name" value={v.reward_name} onChange={(e) => patch({ reward_name: e.target.value })} placeholder={w.rewardPlaceholder} required maxLength={60} aria-label={t.common.reward} />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ideas.map((idea) => (
                  <button
                    key={idea}
                    type="button"
                    onClick={() => patch({ reward_name: idea })}
                    className={`h-8 rounded-full px-3 text-xs font-medium transition-colors ${v.reward_name === idea ? "bg-brand-50 text-brand-700 ring-1 ring-brand-300" : "border border-line bg-white text-body hover:bg-canvas"}`}
                  >
                    {idea}
                  </button>
                ))}
              </div>
              <Input value={v.reward_description} onChange={(e) => patch({ reward_description: e.target.value })} placeholder={w.rewardLinePlaceholder} maxLength={200} className="mt-2" aria-label={w.rewardLine} />
              {renamed && (
                <Alert tone="warning" className="mt-3">
                  <ul className="list-none">{impactMessages}</ul>
                </Alert>
              )}
            </Section>

            <Section label={w.waitQuestion}>
              <div className="grid grid-cols-3 gap-2">
                {WAIT_PICKS.map((m) => (
                  <Pick key={m} active={v.cooldown_minutes === m} onClick={() => patch({ cooldown_minutes: m })} small>
                    {m === 0 ? w.waitEveryTime : m === 60 ? w.waitHour : w.waitDay}
                  </Pick>
                ))}
              </div>
            </Section>
          </Card>

          {/* how it looks */}
          <Card className="divide-y divide-line">
            <Section label={ds.style}>
              <Row className="gap-2">
                {TEMPLATE_IDS.map((tpl) => {
                  const look = { ...d, template: tpl, ...TEMPLATES[tpl].make(brand) } as CardDesign;
                  const s = surface(look, !!business.cover_url);
                  const active = d.template === tpl;
                  return (
                    <button key={tpl} type="button" onClick={() => applyTemplate(tpl)} aria-pressed={active} className={`w-24 shrink-0 rounded-xl p-1 text-start transition ${active ? "bg-brand-50 ring-2 ring-brand-600" : "bg-canvas hover:bg-line/60"}`}>
                      <span className="relative block h-10 overflow-hidden rounded-lg" style={{ background: s.background, border: s.border }}>
                        {s.photo && business.cover_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={business.cover_url} alt="" className="absolute inset-0 size-full object-cover opacity-70" />
                        )}
                        {look.pattern !== "none" && <span className="absolute inset-0" style={{ backgroundImage: patternImage(look.pattern, s.light) }} />}
                        <span className="absolute bottom-1.5 start-1.5 flex gap-1">
                          {[0, 1, 2, 3].map((i) => (
                            <span key={i} className="size-3 rounded-full" style={i < 2 ? { background: look.accent } : { border: `2px dashed ${s.emptyBorder}` }} />
                          ))}
                        </span>
                        <span className="absolute start-1.5 top-1.5 h-1.5 w-8 rounded-full" style={{ background: s.fg, opacity: 0.8 }} />
                      </span>
                      <span className="block truncate px-0.5 pt-1 text-xs font-semibold text-ink">{t.data.templates[tpl].name}</span>
                    </button>
                  );
                })}
              </Row>
            </Section>

            <Section label={ds.mainColour}>
              <Swatches value={brand} choices={SWATCHES} onPick={pickBrand} label={ds.colourAria} customLabel={ds.customColour} fill={fill} />
            </Section>

            <Section label={ds.stamps}>
              <Row>
                {STAMP_ORDER.map((id) => (
                  <Chip key={id} active={d.stamp === id} disabled={id === "logo" && !business.logo_url} onClick={() => set({ stamp: id })}>
                    {id === "icon" ? <CardIcon name={d.icon} className="size-4" /> : STAMP_ICONS[id]} {t.data.stampStyles[id]}
                  </Chip>
                ))}
              </Row>
              {d.stamp === "logo" && !business.logo_url && <p className="mt-2 text-xs text-muted">{ds.logoNeeded}</p>}
              {d.stamp === "icon" && (
                <Row className="mt-2">
                  {CARD_ICONS.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => set({ icon: name })}
                      aria-label={t.merchant.icons[name]}
                      aria-pressed={d.icon === name}
                      className={`grid size-10 shrink-0 place-items-center rounded-xl border transition ${d.icon === name ? "border-transparent bg-ink text-white" : "border-line bg-white text-body hover:bg-canvas"}`}
                    >
                      <CardIcon name={name} className="size-5" />
                    </button>
                  ))}
                </Row>
              )}
              <p className="mb-1.5 mt-3 text-[13px] font-medium text-muted">{ds.stampColour}</p>
              <Swatches value={d.accent} choices={accentChoices} onPick={(c) => set({ accent: c })} label={ds.colourAria} customLabel={ds.customColour} fill={fill} />
            </Section>

            <Section label={ds.background}>
              <Swatches value={d.bg} choices={bgChoices} onPick={(c) => set({ bg: c, text: isLight(c) ? "dark" : "light", use_cover: false })} label={ds.colourAria} customLabel={ds.customColour} fill={fill} />
              <Row className="mt-2.5">
                <Chip active={!!d.bg2} onClick={() => set({ bg2: d.bg2 ? null : shade(d.bg, 0.28) })}>
                  {ds.gradient}
                </Chip>
                <Chip active={d.use_cover} disabled={!business.cover_url} onClick={() => set({ use_cover: !d.use_cover, text: !d.use_cover ? "light" : d.text })}>
                  {ds.useCover}
                </Chip>
                {PATTERNS.map((p) => (
                  <Chip key={p} active={d.pattern === p} onClick={() => set({ pattern: p })}>
                    {t.data.patterns[p]}
                  </Chip>
                ))}
              </Row>
              <Row className="mt-2">
                <span className="self-center pe-1 text-[13px] font-medium text-muted">{ds.textColour}</span>
                <Chip active={d.text === "light"} onClick={() => set({ text: "light" })}>
                  <span className="size-4 rounded-full border border-line bg-white" /> {ds.light}
                </Chip>
                <Chip active={d.text === "dark"} onClick={() => set({ text: "dark" })} disabled={d.use_cover && !!business.cover_url}>
                  <span className="size-4 rounded-full bg-ink" /> {ds.dark}
                </Chip>
              </Row>
            </Section>

            <Section label={ds.shortLine}>
              <Input value={v.description} onChange={(e) => patch({ description: e.target.value })} placeholder={ds.shortLinePlaceholder} maxLength={60} aria-label={ds.shortLine} />
            </Section>

            <Section label={t.merchant.branding.title}>{branding}</Section>

            <Section label={w.validLabel} hint={w.validHint}>
              <Select value={v.valid_days} onChange={(e) => patch({ valid_days: Number(e.target.value) })} aria-label={w.validLabel}>
                {validChoices.map((n) => (
                  <option key={n} value={n}>
                    {n === 0 ? w.validNever : count(t.formats.days, n)}
                  </option>
                ))}
              </Select>
            </Section>
          </Card>
        </div>
      </fieldset>

      {!disabled && (
        <div className="sticky bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 mt-3 lg:bottom-4">
          <div className="flex items-center gap-3 rounded-2xl bg-ink/95 p-1.5 ps-3 text-white shadow-lift backdrop-blur">
            <p className="min-w-0 flex-1 truncate text-[13px]">{isNew ? w.oneButton : dirty ? ds.unsaved : ds.allSaved}</p>
            <Button size="md" loading={saving} disabled={!dirty} onClick={save}>
              {isNew ? t.merchant.home.createCta : t.common.save}
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={ask}
        onClose={() => setAsk(false)}
        title={w.confirmTitle}
        confirmLabel={t.common.save}
        onConfirm={() => {
          setAsk(false);
          run();
        }}
      >
        <ul className="list-disc space-y-2 ps-5">{impactMessages}</ul>
      </ConfirmDialog>
    </>
  );
}

function Section({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="p-3">
      <p className="mb-2 text-sm font-semibold text-ink">{label}</p>
      {children}
      {hint && <p className="mt-1.5 text-xs leading-snug text-muted">{hint}</p>}
    </div>
  );
}

function Pick({ active, onClick, children, small }: { active: boolean; onClick: () => void; children: ReactNode; small?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-10 truncate rounded-xl px-1 font-semibold tabular transition-colors ${small ? "text-[13px]" : "text-[15px]"} ${active ? "bg-brand-600 text-white shadow-brand" : "border border-line bg-white text-body hover:bg-canvas"}`}
    >
      {children}
    </button>
  );
}

/** One line that slides sideways: a phone shows the first few, a thumb brings the rest. Wrapping them would triple the page. */
function Row({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`-mx-3 flex gap-1.5 overflow-x-auto px-3 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}>{children}</div>;
}

function Chip({ active, disabled, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold transition disabled:opacity-40 ${active ? "bg-ink text-white" : "border border-line bg-white text-body hover:bg-canvas"}`}
    >
      {children}
    </button>
  );
}

function Swatches({ value, choices, onPick, label, customLabel, fill }: { value: string; choices: string[]; onPick: (hex: string) => void; label: string; customLabel: string; fill: (template: string, vars?: Record<string, string | number>) => string }) {
  return (
    <Row className="items-center gap-2">
      {choices.map((c) => {
        const active = c.toUpperCase() === value.toUpperCase();
        return (
          <button
            key={c}
            type="button"
            onClick={() => onPick(c.toUpperCase())}
            aria-label={fill(label, { hex: c })}
            aria-pressed={active}
            className={`grid size-9 shrink-0 place-items-center rounded-full ring-offset-2 transition ${active ? "ring-2 ring-ink" : ""}`}
            style={{ background: c, boxShadow: isLight(c) ? "inset 0 0 0 1px rgba(15,18,34,0.12)" : undefined }}
          >
            {active && <Check className="size-4" strokeWidth={3} style={{ color: isLight(c) ? "#0F1222" : "#FFFFFF" }} />}
          </button>
        );
      })}
      <label className="relative grid size-9 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full border-2 border-dashed border-line text-lg font-bold text-muted" title={customLabel}>
        +
        <input type="color" value={value} onChange={(e) => onPick(e.target.value.toUpperCase())} className="absolute inset-0 cursor-pointer opacity-0" aria-label={customLabel} />
      </label>
    </Row>
  );
}
