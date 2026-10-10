"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, X } from "lucide-react";
import { Back } from "@/components/Back";
import { useScreen } from "@/components/Tracker";
import { saveItems } from "@/app/actions";
import { t } from "@/lib/t";

/** What each trade usually sells, in the words its owners actually use —
 *  taken from the gifts they wrote themselves, not from a dictionary. */
const USUAL: Record<string, string[]> = {
  cafe: ["اكسبراس", "كابوسة", "ديريكت", "شاي", "فيلتر", "عصير"],
  fastfood: ["سندويتش", "كراب", "شاورما", "فريت", "قرعة", "بيتزا"],
  barber: ["حلاقة", "ذقن", "حجامة", "تحسينة", "صبغة"],
  hair: ["بروشينغ", "سوان", "صبغة", "قص", "ليساج"],
  beauty: ["سوان وجه", "سوان رجلين", "سيل", "حواجب", "مانيكير"],
  perfume: ["عطر", "عطر صغير", "ديو", "كريم"],
  carwash: ["لافاج", "لافاج كامل", "بوليساج", "أنتيرير"],
  pastry: ["ميلفاي", "تيراميسو", "قاطو", "تارت"],
  bakery: ["خبزة", "كرواسون", "بغرير", "مسمن"],
  pizza: ["بيتزا", "كالزون", "باستا", "سلطة"],
  restaurant: ["صحن", "سلطة", "شربة", "مشوي"],
  juice: ["عصير", "ميلك شايك", "جلاطي", "سموذي"],
  grocery: ["قضية", "خبز", "حليب", "ماء"],
  clothes: ["قميجة", "سروال", "روب", "فيست"],
  phones: ["شارجور", "كوك", "فيتر", "إكرون"],
  mechanic: ["دياغنوستيك", "فيدانج", "بنو", "بوجي"],
  print: ["صفحة", "فوطوكوبي", "أمبريسيون"],
};

/**
 * What the shop sells: names, as chips.
 *
 * A row of the trade's usual ones is offered first, because almost every café
 * sells the same six things and tapping is faster than typing them. The field
 * underneath takes anything else, and splits on commas so a whole list can be
 * pasted at once.
 *
 * No prices, no pictures, no stock, no categories — the only question any of
 * this has to answer later is «which one was it».
 */
export function Items({ names, on, kind }: { names: string[]; on: boolean; kind: string }) {
  const [list, setList] = useState<string[]>(names);
  const [said, setSaid] = useState("");
  const [live, setLive] = useState(on);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const box = useRef<HTMLInputElement>(null);
  const router = useRouter();
  useScreen("shop-items");

  const has = (n: string) => list.some((x) => x.toLowerCase() === n.toLowerCase());
  const add = (raw: string) => {
    const fresh = raw.split(/[,،\n]/).map((x) => x.trim()).filter((x) => x && x.length <= 40);
    if (!fresh.length) return;
    setList((old) => {
      const out = [...old];
      for (const n of fresh) if (!out.some((x) => x.toLowerCase() === n.toLowerCase()) && out.length < 20) out.push(n);
      return out;
    });
    setSaid("");
    box.current?.focus();
  };

  const save = async () => {
    if (saving) return;
    setErr(null);
    setSaving(true);
    try {
      const r = await saveItems(list, live);
      if (!r.ok) {
        setErr(r.error === "too_many" ? t.itemsTooMany : r.error === "too_long" ? t.itemsTooLong : t.itemsNoSave);
        return;
      }
      router.push("/shop");
      router.refresh();
    } catch {
      setErr(t.itemsNoSave);
    } finally {
      setSaving(false);
    }
  };

  const rest = (USUAL[kind] ?? []).filter((n) => !has(n));

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-8 pt-3">
      <Back home="/shop" />
      <h1 className="mt-2 text-[1.375rem] font-bold leading-tight">{t.itemsTitle}</h1>
      <p className="mt-1 text-[0.9375rem] leading-relaxed text-muted">{t.itemsWhat}</p>

      {list.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {list.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setList((old) => old.filter((x) => x !== n))}
              className="press flex items-center gap-1.5 rounded-full bg-brand px-3 py-2 text-[0.9375rem] font-bold text-white"
            >
              {n}
              <X className="size-3.5 opacity-70" strokeWidth={3} />
            </button>
          ))}
        </div>
      )}

      {/* the trade's usual ones: one tap each, and they disappear as they are taken */}
      {rest.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {rest.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => add(n)}
              className="press flex items-center gap-1 rounded-full bg-surface px-3 py-2 text-[0.9375rem] font-semibold text-body ring-1 ring-line"
            >
              <Plus className="size-3.5 text-brand" strokeWidth={3} />
              {n}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-1.5">
        <input
          ref={box}
          value={said}
          onChange={(e) => setSaid(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(said);
            }
          }}
          dir="auto"
          maxLength={200}
          placeholder={t.itemsAdd}
          // in px, not rem: the root shrinks on a small phone and anything
          // under 16px makes iOS zoom in on the first tap
          className="min-w-0 flex-1 rounded-[1rem] bg-surface px-4 py-3 text-[17px] ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <button type="button" onClick={() => add(said)} disabled={!said.trim()} className="press grid size-[3.1rem] shrink-0 place-items-center rounded-[1rem] bg-ink text-white disabled:opacity-30">
          <Plus className="size-5" strokeWidth={3} />
        </button>
      </div>

      <label className="press mt-4 flex items-center justify-between gap-3 rounded-[1.25rem] bg-surface p-4 ring-1 ring-line">
        <span className="min-w-0">
          <span className="block text-[1rem] font-bold">{t.itemsAskOn}</span>
          <span className="mt-0.5 block text-[0.8438rem] leading-snug text-muted">{t.itemsAskOnHint}</span>
        </span>
        <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} className="size-6 shrink-0 accent-brand" />
      </label>

      {err && <p className="mt-3 text-center text-[0.9375rem] font-semibold text-coral">{err}</p>}

      <button type="button" onClick={save} disabled={saving} className="press mt-4 flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-[1.25rem] bg-brand text-[1.0625rem] font-bold text-white disabled:opacity-60">
        <Check className="size-5" strokeWidth={3} /> {saving ? t.saving : t.save}
      </button>
    </div>
  );
}
