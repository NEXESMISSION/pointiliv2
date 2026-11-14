"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Play, Plus, X } from "lucide-react";
import Link from "@/components/Link";
import { FilmButton } from "@/components/Help";
import { Switch } from "@/components/Owner";
import { setGiftChoices } from "@/app/actions-choices";
import { stampsN, t } from "@/lib/t";

const ERR: Record<string, string> = {
  count: "اكتب من 2 حتى 4 كادوات.",
  too_long: "الكادوات طوال برشا مع بعضهم: قصّر شويّة.",
  invalid: "كل كادو بين 2 و20 حرف.",
  wheel: "الروليت مشعلة: الكادو بالحظ.",
  no_card: "حضّر الكارط قبل.",
};

/**
 * «الحريف يختار الكادو» (13 Nov 2026): off by default — the card's gift is one thing. On, the owner lists 2 to 4
 * gifts, and a customer who fills the card picks the one they like (on their phone, or at the counter). The card
 * says it everywhere as «قهوة · كرواسون · عصير» (lib choice: the gift text itself carries the options).
 */
export function GiftChoices({ goal, gift, kind, wheel, back }: { goal: number; gift: string; kind: string; wheel: boolean; back: string }) {
  const router = useRouter();
  const startOn = gift.includes(" · ");
  const [on, setOn] = useState(startOn);
  const [list, setList] = useState<string[]>(() => (startOn ? gift.split(" · ").map((x) => x.trim()).filter(Boolean) : [gift.replace(/\s*بلاش$/, "").trim()].filter(Boolean)));
  const [fresh, setFresh] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  // the trade's usual gifts, one tap each (their «بلاش» left out: the card says it is a gift already)
  const ideas = (t.ideas[kind] ?? t.ideas.other ?? []).map((x) => x.replace(/\s*بلاش$/, "").trim()).filter((x) => x && !list.includes(x));

  const add = (x: string) => {
    const v = x.replace(/·/g, " ").trim().slice(0, 20);
    if (v.length < 2 || list.includes(v) || list.length >= 4) return;
    setList([...list, v]);
    setFresh("");
    setSaved(false);
    setErr(null);
  };
  const save = () =>
    start(async () => {
      setErr(null);
      if (on && (list.length < 2 || list.length > 4)) return setErr(ERR.count);
      const r = await setGiftChoices(on ? list : null);
      if (!r.ok) return setErr(ERR[r.error ?? ""] ?? t.errNetwork);
      setSaved(true);
      router.refresh();
    });
  const said = on && list.length >= 2 ? list.join(" · ") : (list[0] ?? gift);
  const changed = on !== startOn || (on && list.join(" · ") !== gift);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 pb-3 pt-[1.6dvh]">
      <FilmButton src="/clips/gift-choice-v2.mp4" label="الحريف يختار الكادو" className="press flex h-11 w-fit items-center gap-2 rounded-full bg-surface pe-4 ps-1.5 text-[0.875rem] font-bold text-brand shadow-card">
        <span className="grid size-8 place-items-center rounded-full bg-brand text-white">
          <Play className="size-4 translate-x-[1px] fill-white" />
        </span>
        شوف كيفاش يخدم
      </FilmButton>

      {/* on or off, said plainly */}
      <div className="flex items-center gap-3 rounded-[1.25rem] bg-surface p-4 shadow-card">
        <span className="min-w-0 flex-1">
          <b className="block text-[0.9375rem]">الحريف يختار</b>
          <span className="block text-[0.8125rem] leading-snug text-muted">
            {wheel ? "الروليت مشعلة: الكادو بالحظ" : on ? "كي يكمّل الكارط، يختار واحد من الكادوات" : `مطفي: الكادو واحد (${gift})`}
          </span>
        </span>
        <Switch
          on={on}
          disabled={wheel}
          label="الحريف يختار"
          onClick={() => {
            setOn(!on);
            setSaved(false);
            setErr(null);
          }}
        />
      </div>
      {wheel && (
        <Link href="/shop/wheel" className="press -mt-1 px-1 text-[0.8125rem] font-bold text-brand">
          طفّي الروليت باش الحريف يختار ←
        </Link>
      )}

      {/* the gifts to choose from */}
      {on && !wheel && (
        <section className="rounded-[1.25rem] bg-surface p-4 shadow-card">
          <b className="block text-[0.9375rem]">الكادوات</b>
          <span className="block text-[0.75rem] text-muted">من 2 حتى 4 · الحريف ياخو واحد</span>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {list.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setList(list.filter((x) => x !== n));
                  setSaved(false);
                }}
                aria-label={`${n} ✕`}
                className="press flex items-center gap-1.5 rounded-full bg-coral py-2 pe-2.5 ps-3.5 text-[0.9375rem] font-bold text-white"
              >
                {n}
                <span className="grid size-5 place-items-center rounded-full bg-white/25">
                  <X className="size-3" strokeWidth={3} />
                </span>
              </button>
            ))}
          </div>
          {list.length < 4 && ideas.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {ideas.slice(0, 6).map((n) => (
                <button key={n} type="button" onClick={() => add(n)} className="press flex items-center gap-1 rounded-full border-[1.5px] border-dashed border-coral/45 bg-canvas py-[0.4375rem] pe-3.5 ps-2.5 text-[0.9375rem] font-semibold text-body">
                  <Plus className="size-4 text-coral" strokeWidth={3} />
                  {n}
                </button>
              ))}
            </div>
          )}
          {list.length < 4 && (
            <div className="mt-3 flex gap-1.5">
              <input
                value={fresh}
                onChange={(e) => setFresh(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    add(fresh);
                  }
                }}
                maxLength={20}
                placeholder="…ولا اكتب كادو آخر"
                aria-label="كادو آخر"
                className="min-w-0 flex-1 rounded-[1rem] bg-canvas px-4 py-3 text-[17px] focus:outline-none focus:ring-2 focus:ring-coral"
              />
              <button type="button" onClick={() => add(fresh)} disabled={fresh.trim().length < 2} aria-label="زيد كادو" className="press grid size-[3.1rem] shrink-0 place-items-center rounded-[1rem] bg-coral text-white disabled:opacity-30">
                <Plus className="size-5" strokeWidth={3} />
              </button>
            </div>
          )}
        </section>
      )}

      {/* the card, as the customers will read it */}
      <p className="rounded-[1rem] bg-coral-soft px-4 py-2.5 text-center text-[0.875rem] font-bold text-coral">
        {stampsN(goal)} = <bdi>{wheel ? "دورة في الروليت" : said}</bdi>
      </p>

      {err && <p className="text-center text-[0.875rem] font-semibold text-coral">{err}</p>}
      <button
        type="button"
        onClick={save}
        disabled={pending || wheel || (!changed && !saved) || (on && list.length < 2)}
        className="press mt-auto flex h-[3.25rem] shrink-0 items-center justify-center gap-2 rounded-[1.25rem] bg-brand text-[1.0625rem] font-bold text-white disabled:opacity-50"
      >
        <Check className="size-5" strokeWidth={3} /> {pending ? t.checking : saved && !changed ? "تسجّل" : t.save}
      </button>
      {saved && !changed && (
        <Link href={back} className="press text-center text-[0.875rem] font-semibold text-muted">
          {t.done}
        </Link>
      )}
    </div>
  );
}
