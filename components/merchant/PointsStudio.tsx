"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { ChevronRight, Plus, RotateCw, Undo2, X } from "lucide-react";
import { previewPointsChange, savePointsCard, type PointsPreview } from "@/app/actions/merchant";
import { Chip, Row, Section, Swatches } from "@/components/merchant/CardStudio";
import { PointsPreviewSheet, worthAPointsSheet } from "@/components/merchant/PointsPreviewSheet";
import { PointsPass } from "@/components/PointsPass";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { Icon3D } from "@/components/ui/Icon3D";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/components/i18n/Provider";
import { SWATCHES, TEMPLATE_IDS, TEMPLATES, type CardDesign, type TemplateId } from "@/lib/card-design";
import { formatDate } from "@/lib/format";
import { MAX_GIFTS, RATE_PICKS, rateRule } from "@/lib/points";

/** A gift in the catalog; `now` and the rest come from the database when a price rise is on its way. */
export type GiftDraft = { id?: string; name: string; points: number; now?: number; next_points?: number | null; next_at?: string | null; ends_at?: string | null };
export type PointsValues = { name: string; description: string; dinars_per_point: number; points_expire: boolean; catalog: GiftDraft[] };
type Business = { name: string; logo_url: string | null; cover_url: string | null; category: string };

const giftsOk = (c: GiftDraft[]) => c.length >= 1 && c.length <= MAX_GIFTS && c.every((g) => g.name.trim().length >= 2 && Number.isInteger(g.points) && g.points >= 1 && g.points <= 100_000);
const terms = (v: PointsValues) => JSON.stringify({ r: v.dinars_per_point, e: v.points_expire, c: v.catalog.map((g) => [g.id ?? null, g.name.trim(), g.points]) });

/**
 * The points card on one sheet (board 2, P6): how much makes a point, the
 * gifts priced in points, whether points expire — and the look, as for a
 * stamps card. Saving a change that touches points already earned shows
 * «قبل ما تسجّل» first: a price rise waits 14 days, a gift taken off stays
 * 14 more, a new rate only counts from the next purchase.
 */
export function PointsStudio({ initial, leaving: initialLeaving, design: initialDesign, business, isNew, disabled, version, branding }: { initial: PointsValues; leaving: GiftDraft[]; design: CardDesign; business: Business; isNew: boolean; disabled?: boolean; version: number | null; branding: ReactNode }) {
  const { t, count, fill, locale } = useT();
  const w = t.points;
  const lw = t.merchant.loyalty;
  const ds = t.merchant.design;
  const toast = useToast();
  const router = useRouter();
  const [saving, start] = useTransition();

  const allIdeas = t.merchant.ideas as unknown as Record<string, Record<string, string>>;
  const ideas = Object.values(allIdeas[business.category] ?? allIdeas.other!);

  const [v, setV] = useState<PointsValues>(initial);
  const [leaving, setLeaving] = useState<GiftDraft[]>(initialLeaving);
  const [d, setD] = useState<CardDesign>(initialDesign);
  const [saved, setSaved] = useState({ v: terms(initial), d: JSON.stringify(initialDesign), desc: initial.description });
  const [brand, setBrand] = useState(initialDesign.template === "bold" ? initialDesign.bg : "#0891B2");
  const [ver, setVer] = useState(version);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [pv, setPv] = useState<PointsPreview | null>(null);

  const patch = (p: Partial<PointsValues>) => setV((x) => ({ ...x, ...p }));
  const setGift = (i: number, p: Partial<GiftDraft>) => patch({ catalog: v.catalog.map((g, k) => (k === i ? { ...g, ...p } : g)) });
  const applyTemplate = (tpl: TemplateId, color = brand) => setD((x) => ({ ...x, template: tpl, ...TEMPLATES[tpl].make(color) }));
  const dirty = isNew || terms(v) !== saved.v || JSON.stringify(d) !== saved.d || v.description !== saved.desc;
  const valid = giftsOk(v.catalog);
  const day = (iso: string) => formatDate(iso, locale, { year: undefined });
  const rates = [...new Set([...RATE_PICKS, v.dinars_per_point])].sort((a, b) => a - b);
  const cheapest = [...v.catalog].filter((g) => g.points > 0).sort((a, b) => a.points - b.points)[0];
  const sample = cheapest ? Math.round(cheapest.points * 0.6) : 60;

  const fail = (message: string, isStale = false) => {
    setError(message);
    setStale(isStale);
    toast(message, "error");
  };
  const persist = async () => {
    const res = await savePointsCard({ ...v, catalog: v.catalog.map((g) => ({ id: g.id, name: g.name, points: g.points })), design: d, expected_version: ver });
    setPv(null);
    if (!res.ok) return fail(res.message, res.stale);
    toast(res.message, "success");
    if (res.created) {
      router.push("/welcome/ready");
      return;
    }
    if (res.version) setVer(res.version);
    setSaved({ v: terms(v), d: JSON.stringify(d), desc: v.description });
    router.refresh();
  };
  const save = () =>
    start(async () => {
      setError(null);
      if (isNew) return persist();
      const p = await previewPointsChange({ dinars_per_point: v.dinars_per_point, points_expire: v.points_expire, catalog: v.catalog });
      if (!p.ok) return fail(p.message ?? "");
      if (ver !== null && p.version !== undefined && p.version !== ver) return fail(lw.changedMeanwhile, true);
      if (!worthAPointsSheet(p)) return persist();
      setPv(p);
    });

  const addGift = (name = "") => {
    if (v.catalog.length >= MAX_GIFTS) return;
    const top = Math.max(0, ...v.catalog.map((g) => g.points));
    patch({ catalog: [...v.catalog, { name, points: top ? top + 100 : 100 }] });
  };

  return (
    <>
      <fieldset disabled={disabled} className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <aside className="sticky top-0 z-20 -mx-4 min-w-0 bg-canvas px-4 pb-2 pt-1 lg:static lg:order-last lg:mx-0 lg:sticky lg:top-6 lg:bg-transparent lg:p-0">
          <PointsPass
            size="tile"
            className="lg:hidden"
            design={d}
            business={business}
            subtitle={rateRule(v.dinars_per_point, w)}
            balance={sample}
            goal={cheapest?.points ?? 100}
            next={cheapest ? { name: cheapest.name || w.giftName, remaining: Math.max(0, cheapest.points - sample) } : null}
          />
          <div className="hidden lg:block">
            <PointsPass
              design={d}
              business={business}
              subtitle={rateRule(v.dinars_per_point, w)}
              balance={sample}
              goal={cheapest?.points ?? 100}
              next={cheapest ? { name: cheapest.name || w.giftName, remaining: Math.max(0, cheapest.points - sample) } : null}
            />
          </div>
        </aside>

        <div className="min-w-0 space-y-3">
          {error && (
            <Alert
              tone={stale ? "warning" : "error"}
              action={
                stale && (
                  <Button size="sm" variant="secondary" onClick={() => window.location.reload()}>
                    <RotateCw className="size-4" /> {lw.reload}
                  </Button>
                )
              }
            >
              {error}
            </Alert>
          )}

          <Card className="divide-y divide-line">
            <Section label={w.rateQuestion}>
              <div className="grid grid-cols-4 gap-1.5">
                {rates.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => patch({ dinars_per_point: r })}
                    aria-pressed={v.dinars_per_point === r}
                    className={`h-10 truncate rounded-xl px-1 text-[14px] font-semibold transition-colors ${v.dinars_per_point === r ? "bg-sea-500 text-white shadow-[0_8px_18px_-8px_var(--color-sea-500)]" : "bg-surface text-body shadow-card hover:bg-canvas"}`}
                  >
                    {r < 1 ? fill(w.millimes, { m: Math.round(r * 1000) }) : <><span className="num">{r}</span> {w.dt}</>}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs leading-snug text-muted">{count(w.rateExample, Math.floor(20 / v.dinars_per_point))}</p>
            </Section>

            <Section label={w.catalog}>
              <div className="space-y-2">
                {v.catalog.map((g, i) => (
                  <div key={g.id ?? `new-${i}`}>
                    <div className="flex items-center gap-2">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sea-50" aria-hidden>
                        <Icon3D name="ticket" size={22} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <Input value={g.name} onChange={(e) => setGift(i, { name: e.target.value })} placeholder={w.giftName} maxLength={60} aria-label={w.giftName} />
                      </div>
                      <div className="w-20 shrink-0">
                        <Input
                          type="number"
                          inputMode="numeric"
                          dir="ltr"
                          min={1}
                          max={100000}
                          value={Number.isFinite(g.points) ? g.points : ""}
                          onChange={(e) => setGift(i, { points: Math.round(Number(e.target.value)) })}
                          className="px-1 text-center tabular"
                          aria-label={w.giftPoints}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          // a saved gift taken off stays on offer 14 days: it moves to «leaving» on save
                          patch({ catalog: v.catalog.filter((_, k) => k !== i) });
                        }}
                        disabled={v.catalog.length <= 1}
                        aria-label={w.removeGift}
                        className="grid size-10 shrink-0 place-items-center rounded-xl text-muted hover:bg-canvas hover:text-danger-600 disabled:opacity-30"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                    {g.next_at && g.next_points && g.next_points === g.points && (
                      <p className="ms-11 mt-1 text-xs text-muted">
                        {count(w.count, g.now ?? g.points)} · {fill(w.risingTo, { n: g.next_points, date: day(g.next_at) })}
                      </p>
                    )}
                  </div>
                ))}
                {leaving.map((g) => (
                  <div key={g.id} className="flex items-center gap-2 rounded-xl bg-surface-2 px-2 py-1.5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface" aria-hidden>
                      <Icon3D name="hourglass" size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-body line-through decoration-faint">{g.name}</span>
                      <span className="block truncate text-xs text-muted">{g.ends_at ? fill(w.leaving, { date: day(g.ends_at) }) : ""}</span>
                    </span>
                    <button
                      type="button"
                      disabled={v.catalog.length >= MAX_GIFTS}
                      onClick={() => {
                        setLeaving((l) => l.filter((x) => x.id !== g.id));
                        patch({ catalog: [...v.catalog, { ...g, ends_at: null }] });
                      }}
                      className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-[13px] font-semibold text-sea-700 hover:bg-sea-50"
                    >
                      <Undo2 className="size-4" />
                    </button>
                  </div>
                ))}
                {v.catalog.length < MAX_GIFTS && (
                  <button type="button" onClick={() => addGift()} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-sea-700 hover:bg-sea-50">
                    <Plus className="size-4" /> {w.addGift}
                  </button>
                )}
                {!valid && <p className="text-xs font-medium text-danger-600">{w.catalogInvalid}</p>}
              </div>
              <Row className="mt-2">
                {ideas
                  .filter((idea) => !v.catalog.some((g) => g.name.trim() === idea))
                  .map((idea) => (
                    <Chip key={idea} active={false} onClick={() => addGift(idea)}>
                      <Plus className="size-3.5" /> {idea}
                    </Chip>
                  ))}
              </Row>
            </Section>

            <div className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{w.expireLabel}</p>
                <p className="mt-0.5 text-xs leading-snug text-muted">{w.expireHint}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={v.points_expire}
                aria-label={w.expireLabel}
                onClick={() => patch({ points_expire: !v.points_expire })}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${v.points_expire ? "bg-sea-500" : "bg-line"}`}
              >
                <span className={`absolute top-0.5 size-6 rounded-full bg-surface shadow-card transition-all ${v.points_expire ? "end-0.5" : "start-0.5"}`} />
              </button>
            </div>
          </Card>

          {/* how it looks: the same look as a stamps card */}
          <Card className="divide-y divide-line">
            <Section label={ds.style}>
              <Row className="gap-2">
                {TEMPLATE_IDS.map((tpl) => (
                  <Chip key={tpl} active={d.template === tpl} onClick={() => applyTemplate(tpl)}>
                    {t.data.templates[tpl].name}
                  </Chip>
                ))}
              </Row>
            </Section>
            <Section label={ds.mainColour}>
              <Swatches
                value={brand}
                choices={SWATCHES}
                onPick={(c) => {
                  setBrand(c);
                  applyTemplate(d.template, c);
                }}
                label={ds.colourAria}
                customLabel={ds.customColour}
                fill={fill}
              />
            </Section>
            <Section label={t.merchant.branding.title}>{branding}</Section>
          </Card>

          {!isNew && !disabled && (
            <Link href="/loyalty/history" className="press flex items-center gap-3 rounded-[20px] bg-surface p-3 shadow-card">
              <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-surface-2">
                <Icon3D name="hourglass" size={28} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-ink">{lw.history}</span>
                <span className="block truncate text-[12.5px] text-muted">{lw.historyHint}</span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-faint rtl:-scale-x-100" />
            </Link>
          )}
        </div>
      </fieldset>

      {!disabled && (
        <div className="sticky bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 mt-3 lg:bottom-4">
          <div className="flex items-center gap-3 rounded-2xl bg-ink/95 p-1.5 ps-3 text-white shadow-lift backdrop-blur">
            <p className="min-w-0 flex-1 truncate text-[13px]">{isNew ? lw.oneButton : dirty ? ds.unsaved : ds.allSaved}</p>
            <Button size="md" variant="sea" loading={saving} disabled={!dirty || !valid} onClick={save}>
              {isNew ? t.merchant.home.createCta : t.common.save}
            </Button>
          </div>
        </div>
      )}

      <PointsPreviewSheet preview={pv} onClose={() => setPv(null)} onSave={() => start(() => persist())} saving={saving} />
    </>
  );
}
