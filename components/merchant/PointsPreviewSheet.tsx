"use client";

import type { PointsPreview } from "@/app/actions/merchant";
import { useT } from "@/components/i18n/Provider";
import { PreviewSheet, type PreviewLine } from "@/components/merchant/PreviewSheet";
import { formatDate } from "@/lib/format";
import { rateRule } from "@/lib/points";

/** What is worth a word before saving: anything that touches points already earned. */
export function worthAPointsSheet(p: PointsPreview): boolean {
  if (!(p.holders ?? 0)) return false;
  return !!(p.raised?.length || p.lowered?.length || p.removed?.length || p.expire_on || p.expire_off || Number(p.rate_from) !== Number(p.rate_to));
}

/**
 * «قبل ما تسجّل» for a points card: who holds points, and what the change
 * does to them — a rise waits 14 days, a gift taken off stays 14 more, a new
 * rate counts from the next purchase. Only good news gets the party.
 */
export function PointsPreviewSheet({ preview, onClose, onSave, saving }: { preview: PointsPreview | null; onClose: () => void; onSave: () => void; saving: boolean }) {
  const { t, count, fill, locale } = useT();
  const w = t.points;
  const pv = preview;
  const lines: PreviewLine[] = [];
  let good = false;
  if (pv) {
    const until = pv.until ? formatDate(pv.until, locale, { year: undefined }) : "";
    lines.push({ icon: "people", tone: "bg-sea-50", title: count(w.pvHolders, pv.holders ?? 0), hint: w.pvHoldersHint });
    if (Number(pv.rate_from) !== Number(pv.rate_to)) lines.push({ icon: "coin", tone: "bg-sea-50", title: fill(w.pvRate, { rule: rateRule(Number(pv.rate_to), w) }), hint: w.pvRateHint });
    for (const r of pv.raised ?? [])
      lines.push({ icon: "ticket", tone: "bg-surface-2", title: fill(w.pvRaised, { name: r.name, from: r.from, to: r.to }), hint: r.can_afford > 0 ? count(w.pvRaisedHint, r.can_afford, { from: r.from, date: until }) : fill(w.pvRaisedNobody, { date: until }) });
    for (const r of pv.lowered ?? [])
      lines.push({ icon: "gift", tone: "bg-coral-50", title: fill(w.pvLowered, { name: r.name, from: r.from, to: r.to }), hint: r.now_afford > 0 ? count(w.pvLoweredHint, r.now_afford) : w.pvLoweredNobody });
    for (const r of pv.removed ?? []) lines.push({ icon: "hourglass", tone: "bg-surface-2", title: fill(w.pvRemoved, { name: r.name }), hint: fill(w.pvRemovedHint, { date: until }) });
    if (pv.expire_on) lines.push({ icon: "hourglass", tone: "bg-surface-2", title: w.pvExpireOn, hint: w.pvExpireOnHint });
    if (pv.expire_off) lines.push({ icon: "sparkles", tone: "bg-success-50", title: w.pvExpireOff, hint: w.pvExpireOffHint });
    const better = !!pv.lowered?.length || !!pv.expire_off || Number(pv.rate_to) < Number(pv.rate_from);
    const worse = !!pv.raised?.length || !!pv.removed?.length || !!pv.expire_on || Number(pv.rate_to) > Number(pv.rate_from);
    good = better && !worse;
  }
  return <PreviewSheet open={!!pv} good={good} lines={lines} onClose={onClose} onSave={onSave} saving={saving} variant="sea" />;
}
