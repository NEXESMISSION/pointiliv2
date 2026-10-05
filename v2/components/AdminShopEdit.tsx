"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { adminSaveCard, adminShopEdit } from "@/app/actions";
import { CBtn } from "@/components/console";
import { KIND_GROUPS, t } from "@/lib/t";

const field = "h-10 w-full rounded-[0.625rem] border border-line bg-surface px-3 text-[16px]";
const label = "mb-1 block text-[0.8125rem] font-semibold text-muted";
const WAITS = [
  { v: 60, l: t.waitHour },
  { v: 1440, l: t.waitDay },
  { v: 0, l: t.waitNone },
  { v: 180, l: "3 سوايع" },
];

/**
 * The founder's hand on a shop, all of it: its name and kind, and its card —
 * how many tampons, which gift, how long between two — with the same rules
 * as the owner's (the customers on their way keep theirs, unless moved).
 */
export function AdminShopEdit({ shop }: { shop: { id: string; name: string; kind: string; goal: number | null; gift: string | null; stamp_gap: number } }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(shop.name);
  const [kind, setKind] = useState(shop.kind);
  const [goal, setGoal] = useState(String(shop.goal ?? 8));
  const [gift, setGift] = useState(shop.gift ?? "");
  const [gap, setGap] = useState(shop.stamp_gap);
  const [move, setMove] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const g = Number(goal);
  const ok = name.trim().length >= 2 && g >= 3 && g <= 30 && gift.trim().length >= 2;
  const save = () =>
    start(async () => {
      setError(null);
      const a = name.trim() !== shop.name || kind !== shop.kind ? await adminShopEdit(shop.id, name.trim(), kind) : true;
      const b = g !== shop.goal || gift.trim() !== (shop.gift ?? "") || gap !== shop.stamp_gap ? await adminSaveCard(shop.id, g, gift.trim(), gap, move) : true;
      if (!a || !b) return setError(t.errNetwork);
      setOpen(false);
      router.refresh();
    });

  if (!open) {
    return (
      <CBtn kind="soft" className="w-full" onClick={() => setOpen(true)}>
        <Pencil className="size-4" /> {t.aEditShop}
      </CBtn>
    );
  }
  return (
    <div className="space-y-3 rounded-[1rem] border border-line bg-canvas/60 p-3.5">
      <label className="block">
        <span className={label}>{t.shopName}</span>
        <input value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} className={field} />
      </label>
      <label className="block">
        <span className={label}>{t.aShopKind}</span>
        <select value={kind} onChange={(e) => setKind(e.target.value)} className={field}>
          {KIND_GROUPS.map((grp) => (
            <optgroup key={grp.id} label={grp.label}>
              {grp.kinds.map((k) => (
                <option key={k} value={k}>
                  {t.kinds[k] ?? k}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-[6rem_1fr] gap-2">
        <label className="block">
          <span className={label}>{t.cardPopGoal}</span>
          <input value={goal} onChange={(e) => setGoal(e.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" dir="ltr" className={`${field} text-center`} />
        </label>
        <label className="block">
          <span className={label}>{t.cardPopGift}</span>
          <input value={gift} onChange={(e) => setGift(e.target.value.slice(0, 60))} className={field} />
        </label>
      </div>
      <div>
        <span className={label}>{t.cardPopWait}</span>
        <div className="flex flex-wrap gap-1.5">
          {WAITS.map((w) => (
            <button key={w.v} type="button" onClick={() => setGap(w.v)} className={`h-9 rounded-full px-3.5 text-[0.8438rem] font-bold ${gap === w.v ? "bg-brand text-white" : "bg-surface text-body ring-1 ring-line"}`}>
              {w.l}
            </button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-[0.875rem] font-semibold text-body">
        <input type="checkbox" checked={move} onChange={(e) => setMove(e.target.checked)} className="size-4 accent-[#6c47ff]" />
        {t.aMoveOnWay}
      </label>
      {error && <p className="text-[0.8438rem] font-semibold text-coral">{error}</p>}
      <div className="flex gap-2">
        <CBtn kind="main" disabled={pending || !ok} onClick={save}>
          {pending ? t.checking : t.save}
        </CBtn>
        <CBtn kind="soft" disabled={pending} onClick={() => setOpen(false)}>
          {t.back}
        </CBtn>
      </div>
    </div>
  );
}
