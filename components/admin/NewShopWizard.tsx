"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Check, Copy, Dices, Plus, Send, Store, Trash2, X } from "lucide-react";
import { actAsBusiness, openShop, type NewShopInput } from "@/app/actions/admin";
import { CardIcon } from "@/components/CardIcon";
import { Confetti } from "@/components/Confetti";
import { LoyaltyCardVisual } from "@/components/LoyaltyCardVisual";
import { PointsPass } from "@/components/PointsPass";
import { useT } from "@/components/i18n/Provider";
import { Button } from "@/components/ui/Button";
import { Icon3D, category3D } from "@/components/ui/Icon3D";
import { TEMPLATES, resolveDesign } from "@/lib/card-design";
import { CATEGORIES, type CardIconName } from "@/lib/constants";
import { RATE_PICKS, rateRule } from "@/lib/points";

const COLORS = ["#6C47FF", "#FF6B4A", "#0891B2", "#1F1B2E", "#E0457B", "#16A34A", "#D97706", "#6B4226"];
const MARKS: CardIconName[] = ["coffee", "croissant", "cake", "pizza", "burger", "scissors", "sparkles", "star"];
const STAMP_GOALS = [6, 8, 10, 12, 15];
const LEVEL_GOALS = [12, 15, 20, 25];
const REC: Record<string, "stamps" | "levels" | "points"> = {
  cafe: "stamps",
  bakery: "levels",
  pizzeria: "stamps",
  restaurant: "levels",
  fast_food: "levels",
  ice_cream: "stamps",
  salon: "points",
  beauty: "points",
  retail: "points",
  gym: "stamps",
  other: "stamps",
};

/** 4 letters and 4 digits, none that read alike (l/1, o/0). */
function friendlyPassword() {
  const letters = "abcdefghjkmnpqrstuvwxyz";
  let s = "";
  for (let i = 0; i < 4; i++) s += letters[Math.floor(Math.random() * letters.length)];
  return s + String(Math.floor(1000 + Math.random() * 9000));
}

const digits = (v: string) => v.replace(/\D/g, "").replace(/^216/, "").slice(0, 8);
const spaced = (d: string) => d.replace(/^(\d{2})(\d{0,3})(\d{0,3}).*$/, (_, a, b, c) => [a, b, c].filter(Boolean).join(" "));

type Done = { businessId: string; phone: string; password: string };

/** The founder opens a shop in six steps (board 9), then hands the login over. */
export function NewShopWizard() {
  const { t, fill } = useT();
  const w = t.admin.wizard;
  const cats = t.data.categories as Record<string, string>;
  const steps = [w.stepShop, w.stepOwner, w.stepPlan, w.stepSystem, w.stepCard, w.stepLook];
  const [step, setStep] = useState(1);
  const [s, setS] = useState<NewShopInput>({
    name: "",
    category: "cafe",
    city: "",
    ownerName: "",
    phone: "",
    password: friendlyPassword(),
    plan: "yearly",
    paid: "cash",
    system: "stamps",
    goal: 10,
    reward: w.idea1,
    levels: [],
    rate: 1,
    gifts: [],
    color: COLORS[0]!,
    icon: "coffee",
  });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (patch: Partial<NewShopInput>) => setS((v) => ({ ...v, ...patch }));

  const design = useMemo(() => resolveDesign({ ...TEMPLATES.bold.make(s.color), template: "bold", stamp: "icon", icon: s.icon }), [s.color, s.icon]);
  const levelsOk =
    s.system !== "levels" ||
    (s.levels.length > 0 &&
      s.levels.every((l) => l.stamps >= 1 && l.stamps < s.goal && l.name.trim().length >= 2) &&
      new Set(s.levels.map((l) => l.stamps)).size === s.levels.length);
  const giftsOk = s.gifts.length >= 1 && s.gifts.every((g) => g.name.trim().length >= 2 && Number.isInteger(g.points) && g.points >= 1 && g.points <= 100_000);
  const cardOk = s.system === "points" ? giftsOk : s.reward.trim().length >= 2 && levelsOk;
  const canGo = [s.name.trim().length >= 2, digits(s.phone).length === 8 && s.password.length >= 8, true, true, cardOk, true][step - 1];
  const p = t.points;
  const shopIdeas = Object.values((t.merchant.ideas as unknown as Record<string, Record<string, string>>)[s.category] ?? {});
  const until = new Date();
  until.setMonth(until.getMonth() + (s.plan === "yearly" ? 12 : s.plan === "six_month" ? 6 : 1));

  function pickSystem(system: NewShopInput["system"]) {
    if (system === "points" && s.system !== "points") set({ system, rate: 1, color: s.color === COLORS[0] ? "#0891B2" : s.color, gifts: (shopIdeas.length ? shopIdeas : [w.idea1, w.idea2]).slice(0, 2).map((name, i) => ({ name, points: (i + 1) * 100 })) });
    else if (system === "levels" && s.system !== "levels") set({ system, goal: 20, levels: [{ stamps: 6, name: w.idea1 }, { stamps: 10, name: w.idea3 }], reward: w.idea2 });
    else if (system === "stamps" && s.system !== "stamps") set({ system, goal: 10, levels: [], reward: w.idea1 });
    else set({ system });
  }

  function submit(input: NewShopInput) {
    start(async () => {
      setError(null);
      const r = await openShop({ ...input, phone: digits(input.phone) });
      if (!r.ok) {
        setError(r.message);
        return;
      }
      setDone(r);
      setStep(7);
    });
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      /* the text stays on screen to read out */
    }
  }

  // ── the ready screen ───────────────────────────────────────────────────
  if (step === 7 && done) {
    const phone = `+216 ${spaced(digits(done.phone))}`;
    const wa = `https://wa.me/216${digits(done.phone)}?text=${encodeURIComponent(
      fill(w.waMessage, { owner: s.ownerName.split(" ")[0] || "", name: s.name, url: typeof location === "undefined" ? "" : location.origin, phone, password: done.password }),
    )}`;
    return (
      <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-canvas px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(2.5rem+env(safe-area-inset-top))]">
        <Confetti count={48} />
        <div className="mx-auto w-full max-w-md text-center">
          <Icon3D name="party" size={72} className="mx-auto animate-pop" />
          <h1 className="mt-3 text-[26px] font-bold text-ink">{fill(w.readyTitle, { name: s.name })}</h1>
          <p className="mt-1 text-sm text-muted">{s.system === "skip" ? w.ownerChooses : w.handover}</p>
          <div className="mt-4 divide-y divide-line overflow-hidden rounded-[22px] bg-surface text-start shadow-card">
            {[
              { k: "phone", label: w.phoneL, value: phone },
              { k: "password", label: w.passwordL, value: done.password },
            ].map((row) => (
              <div key={row.k} className="flex items-center gap-3 px-4 py-3.5">
                <span className="flex-1 text-[13.5px] text-muted">{row.label}</span>
                <b className="num text-lg text-ink">{row.value}</b>
                <button type="button" onClick={() => copy(row.value, row.k)} className="press grid size-9 place-items-center rounded-full text-brand-600 hover:bg-brand-100" aria-label={w.copy}>
                  {copied === row.k ? <Check className="size-5" /> : <Copy className="size-5" />}
                </button>
              </div>
            ))}
          </div>
          <a href={wa} target="_blank" rel="noopener noreferrer" className="press mt-4 flex h-[54px] items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(150deg,var(--color-brand-400)_-30%,var(--color-brand-600)_50%,var(--color-brand-800)_130%)] font-semibold text-white shadow-brand">
            <Send className="size-5" /> {w.whatsapp}
          </a>
          <div className="mt-2.5 grid grid-cols-2 gap-2.5">
            <form action={actAsBusiness.bind(null, done.businessId)}>
              <Button type="submit" variant="secondary" size="lg" block icon={<Store className="size-5" />}>
                {w.actAs}
              </Button>
            </form>
            <Link href="/admin/businesses" className="press flex h-[50px] items-center justify-center rounded-[18px] bg-surface text-[15px] font-semibold text-ink shadow-card">
              {w.backToShops}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── the six steps ──────────────────────────────────────────────────────
  const chip = (on: boolean) => `press rounded-[18px] bg-surface shadow-card ${on ? "shadow-[0_0_0_2px_var(--color-brand-600),var(--shadow-card)] bg-brand-100 text-brand-700" : "text-ink"}`;
  const field = "h-[50px] w-full rounded-2xl bg-surface px-4 text-base text-ink shadow-[var(--shadow-card),inset_0_0_0_1px_var(--color-line)] outline-none placeholder:text-faint focus:shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-brand-600)]";
  const label = "mb-1.5 mt-4 block px-0.5 text-[13.5px] font-semibold text-muted";
  const cheapest = [...s.gifts].sort((a, b) => a.points - b.points)[0];
  const preview =
    s.system === "points" ? (
      <PointsPass
        size="tile"
        design={design}
        business={{ name: s.name || "Pointili", logo_url: null }}
        subtitle={rateRule(s.rate, p)}
        balance={cheapest ? Math.round(cheapest.points * 0.6) : 0}
        goal={cheapest?.points ?? 100}
        next={cheapest ? { name: cheapest.name, remaining: cheapest.points - Math.round(cheapest.points * 0.6) } : null}
      />
    ) : (
    <LoyaltyCardVisual
      size="tile"
      design={design}
      business={{ name: s.name || "Pointili", logo_url: null }}
      filled={0}
      total={s.goal}
      levels={s.system === "levels" ? s.levels.map((l) => l.stamps) : []}
      rewardName={s.reward}
    />
    );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-canvas">
      <div className="mx-auto flex w-full max-w-md items-center gap-3 px-4 pb-2 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <Link href="/admin/businesses" className="press grid size-[42px] shrink-0 place-items-center rounded-full bg-surface text-ink shadow-card" aria-label={w.close}>
          <X className="size-5" />
        </Link>
        <div className="grid flex-1 grid-cols-6 gap-1.5" aria-hidden>
          {steps.map((_, i) => (
            <span key={i} className={`h-[5px] rounded-full transition-colors ${i < step ? "bg-brand-600" : "bg-line"}`} />
          ))}
        </div>
        <span className="num w-8 text-center text-[13px] text-faint">{step}/6</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-md px-5 pb-6">
          <h1 className="mt-2 text-[26px] font-bold text-ink">{steps[step - 1]}</h1>

          {step === 1 && (
            <>
              <p className="text-sm text-muted">{w.shopQ}</p>
              <label className={label} htmlFor="w-name">{w.nameLabel}</label>
              <input id="w-name" className={field} value={s.name} onChange={(e) => set({ name: e.target.value })} autoFocus maxLength={60} />
              <span className={label}>{w.typeLabel}</span>
              <div className="grid grid-cols-4 gap-2">
                {Object.keys(CATEGORIES).slice(0, 8).map((c) => (
                  <button key={c} type="button" onClick={() => set({ category: c })} className={`${chip(s.category === c)} px-1 pb-2 pt-2.5 text-center text-[12px] font-medium`}>
                    <Icon3D name={category3D(c)} size={32} className="mx-auto mb-1" />
                    <span className="block truncate">{cats[c]}</span>
                  </button>
                ))}
              </div>
              <label className={label} htmlFor="w-city">{w.cityLabel}</label>
              <input id="w-city" className={field} value={s.city} onChange={(e) => set({ city: e.target.value })} maxLength={80} />
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-muted">{w.ownerQ}</p>
              <label className={label} htmlFor="w-owner">{w.ownerName}</label>
              <input id="w-owner" className={field} value={s.ownerName} onChange={(e) => set({ ownerName: e.target.value })} maxLength={60} autoFocus />
              <label className={label} htmlFor="w-phone">{w.phone}</label>
              <div className={`${field} flex items-center gap-2`} dir="ltr">
                <span className="text-faint">+216</span>
                <input id="w-phone" className="num h-full min-w-0 flex-1 bg-transparent outline-none" inputMode="tel" value={spaced(digits(s.phone))} onChange={(e) => set({ phone: e.target.value })} placeholder="12 345 678" />
              </div>
              <label className={label} htmlFor="w-pw">{w.password}</label>
              <div className={`${field} flex items-center gap-2 pe-1.5`}>
                <input id="w-pw" dir="ltr" className="num h-full min-w-0 flex-1 bg-transparent outline-none" value={s.password} onChange={(e) => set({ password: e.target.value })} maxLength={72} />
                <button type="button" onClick={() => set({ password: friendlyPassword() })} className="press grid size-[38px] place-items-center rounded-xl bg-brand-100 text-brand-600" aria-label={w.dice}>
                  <Dices className="size-5" />
                </button>
              </div>
              <p className="mt-2 px-0.5 text-[12.5px] text-faint">{w.passwordHint}</p>
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-sm text-muted">{w.planQ}</p>
              <div className="mt-4 grid grid-cols-3 gap-2.5">
                {(
                  [
                    { id: "six_month", l: w.sixMonths, p: "80" },
                    { id: "yearly", l: w.year, p: "120", best: true },
                    { id: "trial", l: w.trial, p: "0" },
                  ] as const
                ).map((o) => (
                  <button key={o.id} type="button" onClick={() => set({ plan: o.id })} className={`${chip(s.plan === o.id)} relative p-3.5 text-start`}>
                    {"best" in o && <em className="absolute -top-2.5 start-2.5 rounded-full bg-success-500 px-2 py-0.5 text-[11px] font-semibold not-italic text-white">{w.bestPrice}</em>}
                    <b className="block text-[15px] font-semibold">{o.l}</b>
                    <span className="num text-[22px] font-bold">{o.p}</span> <span className="text-sm">د</span>
                  </button>
                ))}
              </div>
              {s.plan !== "trial" && (
                <>
                  <span className={label}>{w.paidQ}</span>
                  <div className="flex gap-1 rounded-[15px] bg-surface-2 p-1 shadow-[inset_0_0_0_1px_var(--color-line)]">
                    {(["cash", "d17", "bank_transfer", "later"] as const).map((m) => (
                      <button key={m} type="button" onClick={() => set({ paid: m })} className={`h-10 flex-1 rounded-[11px] text-[14px] font-medium ${s.paid === m ? "bg-surface font-semibold text-ink shadow-card" : "text-muted"}`}>
                        {w.paid[m]}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <p className="mt-4 rounded-2xl bg-brand-100 px-4 py-3 text-sm text-brand-700">
                {fill(w.untilLine, { date: until.toLocaleDateString("fr-TN") })}
                {s.plan !== "trial" && s.paid === "later" ? ` · ${w.remindPay}` : ""}
              </p>
            </>
          )}

          {step === 4 && (
            <>
              <p className="text-sm text-muted">{fill(w.systemQ, { name: s.name })}</p>
              {(
                [
                  { id: "stamps", n: w.stamps, l: w.stampsLine, icon: "coffee", tint: "bg-brand-100" },
                  { id: "levels", n: w.levels, l: w.levelsLine, icon: "trophy", tint: "bg-coral-50" },
                  { id: "points", n: w.points, l: w.pointsLine, icon: "coin", tint: "bg-sea-50" },
                ] as const
              ).map((o) => {
                const on = s.system === o.id;
                const soon = false;
                return (
                  <button
                    key={o.id}
                    type="button"
                    disabled={soon}
                    onClick={() => pickSystem(o.id)}
                    className={`${chip(on)} mt-2.5 flex w-full items-center gap-3 p-3.5 text-start disabled:opacity-55`}
                  >
                    <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${o.tint}`}>
                      <Icon3D name={o.icon} size={32} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block text-base font-semibold">{o.n}</b>
                      <span className="block text-[13px] text-muted">{o.l}</span>
                      {soon ? (
                        <em className="mt-1 inline-block rounded-full bg-surface-2 px-2 py-0.5 text-[11.5px] font-semibold not-italic text-muted">{w.soon}</em>
                      ) : REC[s.category] === o.id ? (
                        <em className="mt-1 inline-block rounded-full bg-success-50 px-2 py-0.5 text-[11.5px] font-semibold not-italic text-success-600">{fill(w.recommend, { cat: cats[s.category] ?? "" })}</em>
                      ) : null}
                    </span>
                    <span className={`grid size-6 shrink-0 place-items-center rounded-full border-2 ${on ? "border-brand-600 bg-brand-600 text-white" : "border-line text-transparent"}`}>
                      <Check className="size-3.5" strokeWidth={3} />
                    </span>
                  </button>
                );
              })}
              <button type="button" onClick={() => submit({ ...s, system: "skip" })} disabled={pending} className="mt-4 w-full py-2 text-center text-[14.5px] font-semibold text-brand-600">
                {w.skip}
              </button>
            </>
          )}

          {step === 5 && s.system === "points" && (
            <>
              <div className="mt-3">{preview}</div>
              <span className={label}>{p.rateQuestion}</span>
              <div className="flex gap-2">
                {RATE_PICKS.map((r) => (
                  <button key={r} type="button" onClick={() => set({ rate: r })} className={`h-[46px] flex-1 rounded-[15px] text-[14px] font-semibold shadow-card ${s.rate === r ? "bg-sea-500 text-white" : "bg-surface text-ink"}`}>
                    {r < 1 ? fill(p.millimes, { m: Math.round(r * 1000) }) : <><span className="num">{r}</span> {p.dt}</>}
                  </button>
                ))}
              </div>
              <span className={label}>{p.catalog}</span>
              {s.gifts.map((g, i) => (
                <div key={i} className="mb-2 flex items-center gap-2 rounded-2xl bg-surface p-2 shadow-card">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={100000}
                    value={g.points}
                    onChange={(e) => set({ gifts: s.gifts.map((x, k) => (k === i ? { ...x, points: Math.round(Number(e.target.value)) || 0 } : x)) })}
                    className="num h-10 w-20 shrink-0 rounded-xl bg-sea-50 text-center font-bold text-sea-700 outline-none"
                    aria-label={p.giftPoints}
                  />
                  <input value={g.name} onChange={(e) => set({ gifts: s.gifts.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)) })} className="h-10 min-w-0 flex-1 bg-transparent px-1 outline-none" maxLength={60} aria-label={p.giftName} />
                  <button type="button" disabled={s.gifts.length <= 1} onClick={() => set({ gifts: s.gifts.filter((_, k) => k !== i) })} className="press grid size-9 place-items-center rounded-full text-muted hover:bg-surface-2 disabled:opacity-30" aria-label={p.removeGift}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
              {s.gifts.length < 6 && (
                <button
                  type="button"
                  onClick={() => set({ gifts: [...s.gifts, { name: "", points: Math.max(0, ...s.gifts.map((g) => g.points)) + 100 }] })}
                  className="press flex h-11 w-full items-center justify-center gap-1.5 rounded-[14px] bg-sea-50 text-sm font-semibold text-sea-700"
                >
                  <Plus className="size-4" /> {p.addGift}
                </button>
              )}
              {!giftsOk && <p className="mt-2 px-0.5 text-xs font-medium text-danger-600">{p.catalogInvalid}</p>}
            </>
          )}

          {step === 5 && s.system !== "points" && (
            <>
              <div className="mt-3">{preview}</div>
              <span className={label}>{w.goalQ}</span>
              <div className="flex gap-2">
                {(s.system === "levels" ? LEVEL_GOALS : STAMP_GOALS).map((g) => (
                  <button key={g} type="button" onClick={() => set({ goal: g, levels: s.levels.filter((l) => l.stamps < g) })} className={`num h-[46px] flex-1 rounded-[15px] text-base font-semibold shadow-card ${s.goal === g ? "bg-brand-600 text-white" : "bg-surface text-ink"}`}>
                    {g}
                  </button>
                ))}
              </div>
              {s.system === "levels" && (
                <>
                  <span className={label}>{w.levelsTitle}</span>
                  {s.levels.map((l, i) => (
                    <div key={i} className="mb-2 flex items-center gap-2 rounded-2xl bg-surface p-2 shadow-card">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={s.goal - 1}
                        value={l.stamps}
                        onChange={(e) => set({ levels: s.levels.map((x, k) => (k === i ? { ...x, stamps: Number(e.target.value) || 0 } : x)) })}
                        className="num h-10 w-14 shrink-0 rounded-xl bg-coral-50 text-center font-bold text-coral-600 outline-none"
                        aria-label={w.levelTag}
                      />
                      <input value={l.name} onChange={(e) => set({ levels: s.levels.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)) })} className="h-10 min-w-0 flex-1 bg-transparent px-1 outline-none" maxLength={60} />
                      <button type="button" onClick={() => set({ levels: s.levels.filter((_, k) => k !== i) })} className="press grid size-9 place-items-center rounded-full text-muted hover:bg-surface-2" aria-label={w.back}>
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                  {s.levels.length < 3 && (
                    <button
                      type="button"
                      onClick={() => {
                        const n = [3, 6, 10, 15].find((x) => x < s.goal && !s.levels.some((l) => l.stamps === x)) ?? 1;
                        set({ levels: [...s.levels, { stamps: n, name: fill(w.levelName, { n }) }] });
                      }}
                      className="press flex h-11 w-full items-center justify-center gap-1.5 rounded-[14px] bg-brand-100 text-sm font-semibold text-brand-600"
                    >
                      <Plus className="size-4" /> {w.addLevel}
                    </button>
                  )}
                </>
              )}
              <label className={label} htmlFor="w-reward">{w.reward}</label>
              <input id="w-reward" className={field} value={s.reward} onChange={(e) => set({ reward: e.target.value })} maxLength={60} />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[w.idea1, w.idea2, w.idea3, w.idea4].map((x) => (
                  <button key={x} type="button" onClick={() => set({ reward: x })} className="rounded-full bg-surface px-3 py-1.5 text-[12.5px] text-muted shadow-[inset_0_0_0_1px_var(--color-line)]">
                    {x}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 6 && (
            <>
              <div className="mt-3">{preview}</div>
              <span className={label}>{w.color}</span>
              <div className="flex flex-wrap gap-3 px-1">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set({ color: c })}
                    className="press size-10 rounded-full"
                    style={{ background: c, boxShadow: s.color === c ? "0 0 0 3px var(--color-canvas), 0 0 0 5px var(--color-ink)" : undefined }}
                    aria-label={c}
                    aria-pressed={s.color === c}
                  />
                ))}
              </div>
              <span className={label}>{w.stamp}</span>
              <div className="flex flex-wrap gap-2">
                {MARKS.map((m) => (
                  <button key={m} type="button" onClick={() => set({ icon: m })} className={`${chip(s.icon === m)} grid size-12 place-items-center`} aria-label={m} aria-pressed={s.icon === m}>
                    <CardIcon name={m} className="size-6" />
                  </button>
                ))}
              </div>
              <p className="mt-4 px-0.5 text-[12.5px] text-faint">{w.logoLater}</p>
            </>
          )}

          {error && <p className="mt-4 rounded-2xl bg-danger-50 px-4 py-3 text-sm font-medium text-danger-600" role="alert">{error}</p>}
        </div>
      </div>

      <div className={`mx-auto grid w-full max-w-md gap-2.5 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2.5 ${step > 1 ? "grid-cols-[1fr_2fr]" : "grid-cols-1"}`}>
        {step > 1 && (
          <Button variant="ghost" size="xl" onClick={() => setStep(step - 1)} disabled={pending}>
            {w.back}
          </Button>
        )}
        <Button size="xl" disabled={!canGo} loading={pending} onClick={() => (step === 6 ? submit(s) : setStep(step + 1))}>
          {step === 6 ? w.create : w.next}
        </Button>
      </div>
    </div>
  );
}
