"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RotateCw } from "lucide-react";
import { previewCardChange, restoreCardVersion, type CardPreview } from "@/app/actions/merchant";
import { useT } from "@/components/i18n/Provider";
import { ChangePreview, worthASheet } from "@/components/merchant/ChangePreview";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Icon3D, category3D } from "@/components/ui/Icon3D";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/format";

export type CardVersion = {
  version: number;
  stamps_required: number;
  reward_name: string;
  levels: { id: string; name: string; stamps: number }[];
  valid_days: number;
  created_at: string;
  until: string | null;
  by: string;
  by_admin: boolean;
  running: number;
};

/**
 * Every save of the card, newest first: who, when, and how many customers
 * are still finishing a card started under it. Any old one can come back,
 * as a new version, after the same «قبل ما تسجّل» as any save.
 */
export function CardHistory({ items, live, category }: { items: CardVersion[]; live: number; category: string }) {
  const { t, count, fill, locale } = useT();
  const w = t.merchant.loyalty;
  const toast = useToast();
  const router = useRouter();
  const [busy, start] = useTransition();
  const [picked, setPicked] = useState<CardVersion | null>(null);
  const [pv, setPv] = useState<CardPreview | null>(null);
  const [forAll, setForAll] = useState(false);
  const [stale, setStale] = useState(false);
  const day = (iso: string) => formatDate(iso, locale, { year: undefined });

  const bring = async (v: CardVersion, all: boolean) => {
    const res = await restoreCardVersion(v.version, live, all);
    setPv(null);
    setPicked(null);
    if (!res.ok) {
      setStale(!!res.stale);
      toast(res.message, "error");
      return;
    }
    toast(res.message, "success");
    router.refresh();
  };
  const restore = (v: CardVersion) =>
    start(async () => {
      setPicked(v);
      const p = await previewCardChange(v);
      if (!p.ok) {
        setPicked(null);
        toast(p.message ?? "", "error");
        return;
      }
      if (p.version !== undefined && p.version !== live) {
        setPicked(null);
        setStale(true);
        return;
      }
      if (!worthASheet(p)) return bring(v, false);
      setForAll(false);
      setPv(p);
    });

  return (
    <div className="space-y-3">
      {stale && (
        <Alert
          tone="warning"
          action={
            <Button size="sm" variant="secondary" onClick={() => window.location.reload()}>
              <RotateCw className="size-4" /> {w.reload}
            </Button>
          }
        >
          {w.changedMeanwhile}
        </Alert>
      )}

      <div className="divide-y divide-line overflow-hidden rounded-[22px] bg-surface shadow-card">
        {items.map((v) => {
          const isLive = v.version === live;
          const start = day(v.created_at);
          const end = v.until ? day(v.until) : start;
          const when = isLive || !v.until ? fill(w.since, { date: start }) : end === start ? start : fill(w.between, { from: start, to: end });
          const meta = [when, v.by, v.levels.length ? count(w.levelsN, v.levels.length) : "", v.valid_days ? count(t.formats.days, v.valid_days) : ""].filter(Boolean).join(" · ");
          return (
            <div key={v.version} className="flex items-center gap-3 px-3.5 py-3">
              <span className={`grid size-11 shrink-0 place-items-center rounded-[14px] ${isLive ? "bg-brand-100" : "bg-surface-2"}`}>
                <Icon3D name={category3D(category)} size={28} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-ink">{count(w.versionGoal, v.stamps_required, { reward: v.reward_name })}</span>
                <span className="block text-[12.5px] leading-snug text-muted">{meta}</span>
                {!isLive && v.running > 0 && <span className="block truncate text-[12.5px] font-medium text-brand-700">{count(w.stillOnIt, v.running)}</span>}
              </span>
              {isLive ? (
                <span className="shrink-0 rounded-full bg-success-50 px-2.5 py-1 text-xs font-semibold text-success-600">{w.liveVersion}</span>
              ) : (
                <Button size="sm" variant="secondary" loading={busy && picked?.version === v.version} disabled={busy} onClick={() => restore(v)} className="shrink-0">
                  {w.restore}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <p className="px-1 text-[12.5px] leading-relaxed text-muted">{items.length > 1 ? w.restoreNote : w.noChanges}</p>

      <ChangePreview
        preview={pv}
        reward={picked?.reward_name ?? ""}
        forAll={forAll}
        onForAll={setForAll}
        onClose={() => {
          setPv(null);
          setPicked(null);
        }}
        onSave={() => start(() => (picked ? bring(picked, forAll) : Promise.resolve()))}
        saving={busy}
      />
    </div>
  );
}
