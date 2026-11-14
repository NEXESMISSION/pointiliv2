"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { chooseGift } from "@/app/actions-choices";
import { Confetti } from "@/components/StampLand";
import { Icon3D } from "@/components/ui";
import { signal } from "@/lib/track";

/**
 * A full card whose shop lets the customer choose (13 Nov 2026): «اختار الكادو متاعك» and the shop's options, one
 * tap. The choice is the gift from then on — the card shows it waiting, and the customer's code takes it at the
 * counter. Not chosen here, the counter asks it when it is handed over.
 */
export function ChooseGift({ choices }: { choices: { moment: number; options: string[] }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [picked, setPicked] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const first = choices[0];
  if (!first) return null;

  const pick = (o: string) =>
    start(async () => {
      setErr(false);
      const ok = await chooseGift(first.moment, o).catch(() => false);
      if (!ok) return setErr(true);
      setPicked(o);
      navigator.vibrate?.(50);
      signal("gift_chosen", o);
      setTimeout(() => router.refresh(), 900);
    });

  return (
    <div className="relative mx-auto mt-3 w-full max-w-[min(100%,52dvh)] shrink-0 animate-pop overflow-hidden rounded-[1.5rem] bg-[linear-gradient(150deg,#ffa183,#ff6b4a_55%,#e0452a)] p-4 text-white shadow-[0_18px_40px_-18px_rgb(255_107_74/0.85)]">
      {picked && <Confetti count={60} />}
      <div className="flex items-center gap-3">
        <Icon3D name="gift" size={44} className="shrink-0 animate-float" />
        <span className="min-w-0 flex-1">
          <b className="block text-[1.1875rem] leading-tight">{picked ? `اخترت ${picked}` : "اختار الكادو متاعك"}</b>
          <span className="block text-[0.8125rem] text-white/90">{picked ? "ورّي الكود متاعك في المحل وخوذو" : "كمّلت الكارط: اختار اللي تحب"}</span>
        </span>
      </div>
      {!picked && (
        <div className={`mt-3 grid gap-2 ${first.options.length > 2 ? "grid-cols-2" : "grid-cols-1"}`}>
          {first.options.map((o) => (
            <button key={o} type="button" disabled={pending} onClick={() => pick(o)} className="press h-12 rounded-[1rem] bg-white px-3 text-[1rem] font-bold text-coral shadow-[0_8px_18px_-10px_rgb(0_0_0/0.4)] disabled:opacity-60">
              <bdi>{o}</bdi>
            </button>
          ))}
        </div>
      )}
      {err && <p className="mt-2 text-center text-[0.8125rem] font-semibold text-white">ما تعدّاتش، عاود</p>}
      {choices.length > 1 && !picked && <p className="mt-2 text-center text-[0.75rem] text-white/85">عندك {choices.length} كادوات تختارهم، واحد بواحد</p>}
    </div>
  );
}
