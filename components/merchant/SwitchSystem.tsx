"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowRight, Minus, Plus } from "lucide-react";
import { switchSystem, type SwitchResult } from "@/app/actions/merchant";
import { useT } from "@/components/i18n/Provider";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { Icon3D, type Icon3DName } from "@/components/ui/Icon3D";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { RATE_PICKS } from "@/lib/points";

type Level = { id: string; name: string; stamps: number };
type Gift = { name: string; points: number };
const GOALS = [6, 8, 10, 12, 20];

/**
 * Changing system (board 8, K4): nobody starts again from zero. Stamps to
 * points asks what the main gift is worth — every stamp keeps its share of
 * the way, every gift reached on the way becomes its price; points to stamps
 * asks how many points make a stamp. The numbers are the database's, counted
 * again as the owner types, and the switch is one confirmed tap.
 */
export function SwitchSystem({ to, version, goal, gift, levels, catalog }: { to: "points" | "stamps"; version: number; goal: number; gift: string; levels: Level[]; catalog: Gift[] }) {
  const { t, count, fill } = useT();
  const w = t.points;
  const lw = t.merchant.loyalty;
  const toast = useToast();
  const router = useRouter();
  const [busy, start] = useTransition();

  // stamps → points
  const [main, setMain] = useState(100);
  const [rate, setRate] = useState(1);
  const [levelPts, setLevelPts] = useState<Record<string, number>>({});
  const levelPrice = (l: Level) => levelPts[l.id] ?? Math.ceil((l.stamps * main) / goal);
  // points → stamps: the dearest gift becomes the card's gift, and a stamp is worth its price over the goal
  // (following the goal and the gift until the owner sets it by hand)
  const dearest = [...catalog].sort((a, b) => b.points - a.points)[0];
  const [newGoal, setNewGoal] = useState(10);
  const [reward, setReward] = useState(dearest?.name ?? gift);
  const [ppsManual, setPpsManual] = useState<number | null>(null);
  const price = catalog.find((g) => g.name === reward.trim())?.points ?? dearest?.points ?? 100;
  const pps = ppsManual ?? Math.max(1, Math.ceil(price / newGoal));
  const setPps = (n: number) => setPpsManual(n);

  const terms = useMemo(
    () =>
      to === "points"
        ? {
            main_points: main,
            rate,
            expire: false,
            catalog: [{ name: gift, points: main }, ...levels.map((l) => ({ name: l.name, points: levelPrice(l) }))].filter((g) => g.points >= 1),
            level_points: Object.fromEntries(levels.map((l) => [l.id, levelPrice(l)])),
          }
        : { points_per_stamp: pps, goal: newGoal, reward: reward.trim(), levels: [], valid_days: 0 },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [to, main, rate, levelPts, pps, newGoal, reward, gift, levels, goal],
  );
  const valid = to === "points" ? main >= 1 && main <= 100_000 : pps >= 1 && reward.trim().length >= 2;

  const [pv, setPv] = useState<SwitchResult | null>(null);
  const [ask, setAsk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // the numbers, counted again by the database as the owner types
  useEffect(() => {
    if (!valid) return;
    let gone = false;
    const timer = setTimeout(async () => {
      const r = await switchSystem(to, terms, version, true);
      if (gone) return;
      if (r.ok) {
        setPv(r);
        setError(null);
      } else setError(r.message ?? null);
    }, 350);
    return () => {
      gone = true;
      clearTimeout(timer);
    };
  }, [to, terms, version, valid]);

  const run = () =>
    start(async () => {
      const r = await switchSystem(to, terms, version, false);
      setAsk(false);
      if (!r.ok) {
        setError(r.message ?? null);
        toast(r.message ?? "", "error");
        return;
      }
      toast(r.message ?? "", "success");
      router.push("/loyalty");
    });

  const sample = pv?.sample;
  const lines: { icon: Icon3DName; tone: string; title: string; hint: string }[] =
    to === "points"
      ? [
          { icon: "people", tone: "bg-brand-100", title: count(w.swHolders, pv?.holders ?? 0), hint: w.swHoldersHint },
          ...((pv?.levels_ready ?? 0) > 0 ? [{ icon: "gift" as const, tone: "bg-coral-50", title: count(w.swLevelsReady, pv?.levels_ready ?? 0), hint: w.swLevelsReadyHint }] : []),
          ...((pv?.pending ?? 0) > 0 ? [{ icon: "ticket" as const, tone: "bg-surface-2", title: count(w.swPending, pv?.pending ?? 0), hint: w.swPendingHint }] : []),
          { icon: "shop", tone: "bg-surface-2", title: w.swCounter, hint: w.swCounterHint },
        ]
      : [
          { icon: "people", tone: "bg-sea-50", title: count(w.swHolders, pv?.holders ?? 0), hint: w.swHoldersPtsHint },
          ...((pv?.full_cards ?? 0) > 0 ? [{ icon: "gift" as const, tone: "bg-coral-50", title: count(w.swFullCards, pv?.full_cards ?? 0), hint: w.swFullCardsHint }] : []),
          ...((pv?.pending ?? 0) > 0 ? [{ icon: "ticket" as const, tone: "bg-surface-2", title: count(w.swPending, pv?.pending ?? 0), hint: w.swPendingHint }] : []),
          { icon: "hourglass", tone: "bg-surface-2", title: w.swCatalogCloses, hint: w.swCatalogClosesHint },
          { icon: "shop", tone: "bg-surface-2", title: w.swCounter, hint: w.swCounterHint },
        ];

  return (
    <div className="space-y-3">
      {/* what one customer's card becomes */}
      <div className="flex items-center justify-center gap-3 py-1">
        {to === "points" ? (
          <>
            <Mini tone="brand" icon="coffee" big={`${sample?.stamps ?? 7}/${sample?.goal ?? goal}`} label={w.systemStamps} />
            <ArrowRight className="size-5 shrink-0 text-faint rtl:-scale-x-100" />
            <Mini tone="sea" icon="coin" big={String(sample?.points ?? Math.ceil((7 * main) / goal))} label={w.system} />
          </>
        ) : (
          <>
            <Mini tone="sea" icon="coin" big={String(sample?.points ?? 70)} label={w.system} />
            <ArrowRight className="size-5 shrink-0 text-faint rtl:-scale-x-100" />
            <Mini tone="brand" icon="coffee" big={String(sample?.stamps ?? Math.ceil(70 / pps))} label={w.systemStamps} />
          </>
        )}
      </div>

      {error && <Alert>{error}</Alert>}

      <Card className="space-y-4 p-4">
        {to === "points" ? (
          <>
            <div>
              <p className="text-sm font-semibold text-ink">{fill(w.swGiftWorth, { gift })}</p>
              <Stepper value={main} step={10} onChange={setMain} />
              <p className="mt-2 rounded-2xl bg-surface-2 px-3.5 py-2.5 text-[13px] leading-relaxed text-body">
                {count(w.swCalc, goal, { gift })}
                <br />
                <b>{fill(w.swPerStamp, { n: Math.round((main / goal) * 10) / 10 })}</b>
              </p>
            </div>
            {levels.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold text-ink">{w.swLevels}</p>
                <div className="space-y-2">
                  {levels.map((l) => (
                    <div key={l.id} className="flex items-center gap-2">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-coral-50" aria-hidden>
                        <Icon3D name="gift" size={20} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{l.name}</span>
                      <div className="w-24 shrink-0">
                        <Input
                          type="number"
                          inputMode="numeric"
                          dir="ltr"
                          min={1}
                          value={levelPrice(l)}
                          onChange={(e) => setLevelPts((x) => ({ ...x, [l.id]: Math.max(1, Math.round(Number(e.target.value)) || 1) }))}
                          className="text-center tabular"
                          aria-label={l.name}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="mb-2 text-sm font-semibold text-ink">{w.rateQuestion}</p>
              <div className="grid grid-cols-4 gap-1.5">
                {RATE_PICKS.map((r) => (
                  <button key={r} type="button" onClick={() => setRate(r)} aria-pressed={rate === r} className={`h-10 rounded-xl text-[14px] font-semibold ${rate === r ? "bg-sea-500 text-white" : "bg-surface text-body shadow-card"}`}>
                    {r < 1 ? fill(w.millimes, { m: Math.round(r * 1000) }) : <><span className="num">{r}</span> {w.dt}</>}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="text-sm font-semibold text-ink">{w.swPointsPerStamp}</p>
              <Stepper value={pps} step={5} onChange={setPps} />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-ink">{lw.stampsQuestion}</p>
              <div className="grid grid-cols-5 gap-1.5">
                {GOALS.map((g) => (
                  <button key={g} type="button" onClick={() => setNewGoal(g)} aria-pressed={newGoal === g} className={`num h-10 rounded-xl text-[15px] font-semibold ${newGoal === g ? "bg-brand-600 text-white" : "bg-surface text-body shadow-card"}`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-ink">{lw.rewardQuestion}</p>
              <Input value={reward} onChange={(e) => setReward(e.target.value)} maxLength={60} aria-label={lw.rewardQuestion} />
            </div>
          </>
        )}
      </Card>

      <div className="divide-y divide-line overflow-hidden rounded-[20px] bg-surface shadow-card">
        {lines.map((l, i) => (
          <div key={i} className="flex items-center gap-3 px-3.5 py-3">
            <span className={`grid size-10 shrink-0 place-items-center rounded-[12px] ${l.tone}`}>
              <Icon3D name={l.icon} size={24} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-semibold leading-snug text-ink">{l.title}</span>
              <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{l.hint}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="sticky bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-30 lg:bottom-4">
        <Button variant={to === "points" ? "sea" : "primary"} size="xl" block disabled={!valid || !pv} onClick={() => setAsk(true)} className="shadow-lift">
          {to === "points" ? w.swGoToPoints : w.swGoToStamps}
        </Button>
      </div>

      <ConfirmDialog open={ask} onClose={() => setAsk(false)} title={w.swConfirmTitle} confirmLabel={to === "points" ? w.swGoToPoints : w.swGoToStamps} loading={busy} onConfirm={run}>
        {w.swConfirm}
      </ConfirmDialog>
    </div>
  );
}

function Mini({ tone, icon, big, label }: { tone: "brand" | "sea"; icon: Icon3DName; big: string; label: string }) {
  return (
    <div
      className={`flex w-32 flex-col items-center rounded-[22px] px-3 py-3.5 text-white shadow-card ${
        tone === "sea" ? "bg-[linear-gradient(150deg,var(--color-sea-300),var(--color-sea-500)_55%,var(--color-sea-700))]" : "bg-[linear-gradient(150deg,var(--color-brand-400),var(--color-brand-600)_55%,var(--color-brand-800))]"
      }`}
    >
      <Icon3D name={icon} size={30} />
      <b className="num mt-1 text-[26px] leading-tight">{big}</b>
      <small className="text-[12px] text-white/80">{label}</small>
    </div>
  );
}

function Stepper({ value, step, onChange }: { value: number; step: number; onChange: (n: number) => void }) {
  return (
    <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl bg-surface-2 p-1.5">
      <button type="button" onClick={() => onChange(Math.max(1, value - step))} className="press grid size-11 place-items-center rounded-xl bg-surface text-ink shadow-card" aria-label="-">
        <Minus className="size-5" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        dir="ltr"
        value={value}
        min={1}
        onChange={(e) => onChange(Math.max(1, Math.min(100_000, Math.round(Number(e.target.value)) || 1)))}
        className="num w-24 bg-transparent text-center text-[26px] font-bold text-ink outline-none"
      />
      <button type="button" onClick={() => onChange(Math.min(100_000, value + step))} className="press grid size-11 place-items-center rounded-xl bg-surface text-ink shadow-card" aria-label="+">
        <Plus className="size-5" />
      </button>
    </div>
  );
}
