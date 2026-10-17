"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, X } from "lucide-react";
import { Back } from "@/components/Back";
import { Switch } from "@/components/Owner";
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
  // typed: the field keeps the focus for the next one; tapped from the usual ones: no keyboard opening on a phone
  const add = (raw: string, typed = true) => {
    const fresh = raw.split(/[,،\n]/).map((x) => x.trim()).filter((x) => x && x.length <= 40);
    if (!fresh.length) return;
    setList((old) => {
      const out = [...old];
      for (const n of fresh) if (!out.some((x) => x.toLowerCase() === n.toLowerCase()) && out.length < 20) out.push(n);
      return out;
    });
    if (!typed) return;
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
      <Back home="/shop/settings" />
      <h1 className="mt-2 text-[1.625rem] font-bold leading-tight">{t.itemsTitle}</h1>
      {/* what it is for, said in words only: an example drawn with chips and bars looked like buttons
          that did nothing (the founder, 17 Oct 2026: «look like steps and buttons, not clickable») */}
      <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted">{t.itemsIntro}</p>

      {/* everything that can be tapped, in one card: what the shop sells (a tap takes one off), the
          trade's usual ones (a tap adds one), and the field for anything else */}
      <section className="mt-[2.4dvh] rounded-[1.375rem] bg-surface p-4 shadow-card">
        <h2 className="text-[1rem] font-bold">{t.itemsYours}</h2>
        {list.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {list.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setList((old) => old.filter((x) => x !== n))}
                aria-label={`${n} ✕`}
                className="press flex items-center gap-1.5 rounded-full bg-brand py-2 pe-2.5 ps-3.5 text-[0.9375rem] font-bold text-white"
              >
                {n}
                <span className="grid size-5 place-items-center rounded-full bg-white/25">
                  <X className="size-3" strokeWidth={3} />
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-[0.8125rem] text-faint">{t.itemsNone}</p>
        )}

        {/* the trade's usual ones: one tap each, and they disappear as they are taken */}
        {rest.length > 0 && (
          <>
            <p className="mt-4 text-[0.8125rem] font-semibold text-muted">{t.itemsPick}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {rest.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => add(n, false)}
                  className="press flex items-center gap-1 rounded-full border-[1.5px] border-dashed border-brand/45 bg-canvas py-[0.4375rem] pe-3.5 ps-2.5 text-[0.9375rem] font-semibold text-body"
                >
                  <Plus className="size-4 text-brand" strokeWidth={3} />
                  {n}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="mt-4 flex gap-1.5">
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
            className="min-w-0 flex-1 rounded-[1rem] bg-canvas px-4 py-3 text-[17px] focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <button type="button" onClick={() => add(said)} disabled={!said.trim()} aria-label={t.itemsAdd} className="press grid size-[3.1rem] shrink-0 place-items-center rounded-[1rem] bg-brand text-white disabled:opacity-30">
            <Plus className="size-5" strokeWidth={3} />
          </button>
        </div>
      </section>

      {/* the counter asks, or not: a real switch, said in one line */}
      <div className="mt-4 flex items-center justify-between gap-3 rounded-[1.375rem] bg-surface p-4 shadow-card">
        <span className="min-w-0">
          <span className="block text-[0.9375rem] font-bold">{t.itemsAskOn}</span>
          <span className="mt-0.5 block text-[0.8125rem] leading-snug text-muted">{t.itemsAskOnHint}</span>
        </span>
        <Switch on={live} onClick={() => setLive(!live)} label={t.itemsAskOn} />
      </div>

      {err && <p className="mt-3 text-center text-[0.9375rem] font-semibold text-coral">{err}</p>}

      <button type="button" onClick={save} disabled={saving} className="press mt-4 flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-[1.25rem] bg-brand text-[1.0625rem] font-bold text-white disabled:opacity-60">
        <Check className="size-5" strokeWidth={3} /> {saving ? t.saving : t.save}
      </button>
    </div>
  );
}
