"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Back } from "@/components/Back";
import { useScreen } from "@/components/Tracker";
import { saveItems } from "@/app/actions";
import { t } from "@/lib/t";

/**
 * What the shop sells, as a list one writes rather than a thing one builds.
 *
 * No prices, no pictures, no stock, no categories. Names, one to a line —
 * because the only question it has to answer later is «which one was it».
 * Keeping it a plain piece of writing is what stops it growing into a menu
 * the owner has to maintain.
 *
 * Switching it off leaves the names where they are: turning it back on costs
 * nothing, and what was already written down keeps its meaning.
 */
export function Items({ names, on }: { names: string[]; on: boolean }) {
  const [text, setText] = useState(names.join("\n"));
  const [live, setLive] = useState(on);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  useScreen("shop-items");

  const lines = text.split("\n").map((s) => s.trim()).filter(Boolean);

  const save = async () => {
    if (saving) return;
    setErr(null);
    setSaving(true);
    try {
      const r = await saveItems(lines, live);
      if (!r.ok) {
        setErr(r.error === "too_many" ? t.itemsTooMany : t.itemsNoSave);
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

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-8 pt-3">
      <Back home="/shop" />
      <h1 className="mt-2 text-[1.375rem] font-bold leading-tight">{t.itemsTitle}</h1>
      <p className="mt-1 text-[0.9375rem] leading-relaxed text-muted">{t.itemsWhat}</p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={7}
        dir="auto"
        placeholder={t.itemsPlaceholder}
        className="mt-4 w-full rounded-[1.25rem] bg-surface p-4 text-[1.0625rem] leading-[2.1] ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-brand"
      />
      <p className="mt-1.5 text-[0.8125rem] text-muted">{lines.length ? `${lines.length} ${t.itemsCount}` : t.itemsOnePerLine}</p>

      <label className="press mt-4 flex items-center justify-between gap-3 rounded-[1.25rem] bg-surface p-4 ring-1 ring-line">
        <span>
          <span className="block text-[1rem] font-bold">{t.itemsAskOn}</span>
          <span className="mt-0.5 block text-[0.8438rem] text-muted">{t.itemsAskOnHint}</span>
        </span>
        <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} className="size-6 shrink-0 accent-brand" />
      </label>

      {err && <p className="mt-3 text-center text-[0.9375rem] font-semibold text-coral">{err}</p>}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="press mt-4 flex h-[3.25rem] w-full items-center justify-center rounded-[1.25rem] bg-brand text-[1.0625rem] font-bold text-white disabled:opacity-60"
      >
        {saving ? t.saving : t.save}
      </button>
    </div>
  );
}
