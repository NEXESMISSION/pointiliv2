"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { saveCard } from "@/app/actions";
import { HelpButton, type HelpSettings } from "@/components/Help";
import { Pass } from "@/components/Pass";
import { Steps } from "@/components/Steps";
import { useScreen } from "@/components/Tracker";
import { Btn, boxLook } from "@/components/ui";
import { cardDefaults } from "@/lib/card-defaults";
import { t } from "@/lib/t";
import { signal } from "@/lib/track";
import type { FormState } from "@/lib/types";

const GOALS = [5, 6, 8, 10, 12];
const TAP_LABEL = "جرّب: زيد تامبون على الكارط";
/**
 * The card above the two questions. Its height follows its width (about
 * 9rem + 0.4 × its width); everything else on the screen takes about
 * 21rem + 14dvh, so the card may be as wide as 2.5 × (86dvh − 30rem) and
 * all of it still fits on a short phone. Never under 17rem.
 */
const SHRINK = "mx-auto w-full max-w-[min(100%,max(17rem,calc(2.5*(86dvh_-_30rem))))]";

type Shop = { name: string; kind: string; logo?: string | null; stamp_logo?: boolean };

/**
 * A new owner's card, on one screen: how many tampons, and which gift. Both
 * are already answered for what the shop sells (a café: 8 and a free coffee),
 * so «حلّ الكارط» alone is enough; the card above changes with each tap, and
 * a tap on the card itself lands one more tampon on it. The colour follows the
 * kind and the wait between two tampons is an hour — both change later from
 * «المحل», with everything else.
 */
export function CardFirst({ shop, help }: { shop: Shop; help?: HelpSettings }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveCard, null);
  const ideas = t.ideas[shop.kind] ?? t.ideas.other!;
  const start = cardDefaults(shop.kind);
  const [goal, setGoal] = useState(start.goal);
  const [gift, setGift] = useState(ideas[0] ?? "");
  // «حاجة أخرى»: the gift typed by hand, in place of the ideas
  const [typing, setTyping] = useState(false);
  const [tap, setTap] = useState<{ goal: number; n: number } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useScreen("first-card");
  useEffect(() => {
    if (state?.error) signal("form_error", `first-card · ${state.error}`);
  }, [state]);
  useEffect(() => {
    if (typing) input.current?.focus();
  }, [typing]);
  // a save whose answer dies on the way back (a connection that drops): the database is asked
  // instead — the card is there, on to the next screen; still nothing after half a minute, said
  const [lost, setLost] = useState(false);
  useEffect(() => {
    if (!pending) return;
    const started = Date.now();
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const look = async () => {
      const now = await fetch("/api/card", { cache: "no-store", signal: AbortSignal.timeout(5000) })
        .then((r) => (r.ok ? (r.json() as Promise<{ goal: number | null }>) : null))
        .catch(() => null);
      if (!alive) return;
      // a whole new load: the router's own answer is the one that never came back
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      if (now?.goal) window.location.assign("/shop/start");
      else if (Date.now() - started > 30_000) setLost(true);
      else timer = setTimeout(look, 3000);
    };
    timer = setTimeout(look, 8000);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [pending]);

  const onCard = tap && tap.goal === goal ? tap.n : Math.max(1, Math.round(goal * 0.4));
  const preview = { name: shop.name, kind: shop.kind, logo: shop.logo, goal, gift: gift.trim() || "…", color: start.color, stamp_logo: shop.stamp_logo };
  const chip = (on: boolean) => `press rounded-full font-bold ${on ? "bg-brand text-white shadow-[0_8px_18px_-10px_rgb(108_71_255/0.8)]" : "bg-surface text-ink shadow-card"}`;

  return (
    <form action={action} className="safe-t safe-b mx-auto flex h-dvh w-full max-w-md flex-col overflow-x-clip overflow-y-auto px-[clamp(1rem,5vw,1.5rem)]">
      <header className="flex shrink-0 items-center gap-3 pt-2">
        <div className="min-w-0 flex-1">
          <Steps at={2} />
        </div>
        {help ? <HelpButton help={help} compact /> : null}
      </header>

      {/* never shorter than what it holds: on the smallest phones the whole screen scrolls, the button never sits on a chip */}
      <div className="flex flex-1 flex-col justify-center-safe py-[1.8dvh]">
        {/* the two labels under the card ask the same: the smallest phones keep them and drop this */}
        <h1 className="text-balance text-[1.25rem] font-bold leading-snug [@media(max-height:520px)]:sr-only">{t.firstCardQ}</h1>

        {/* the card is a try: a tap lands one more tampon on it, up to the gift, then it starts over */}
        <button type="button" onClick={() => setTap({ goal, n: onCard >= goal ? 0 : onCard + 1 })} aria-label={TAP_LABEL} className={`press mt-[2dvh] block rounded-[1.75rem] text-start ${SHRINK}`}>
          <Pass shop={preview} stamps={onCard} fresh={tap?.goal === goal} />
        </button>

        <p className="mb-1.5 mt-[2.4dvh] px-1 text-[0.8125rem] font-semibold text-muted">{t.firstCardGoal}</p>
        <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={t.firstCardGoal}>
          {GOALS.map((g) => (
            <button key={g} type="button" role="radio" aria-checked={goal === g} onClick={() => setGoal(g)} className={`num h-[2.875rem] text-[1.25rem] ${chip(goal === g)} !rounded-[1rem]`}>
              {g}
            </button>
          ))}
        </div>

        <p className="mb-1.5 mt-[2dvh] px-1 text-[0.8125rem] font-semibold text-muted">{t.firstCardGift}</p>
        {typing ? (
          <input
            ref={input}
            value={gift}
            onChange={(e) => setGift(e.target.value)}
            // Enter sends the card: there is nothing else to answer
            placeholder={t.firstCardOtherPh}
            maxLength={60}
            aria-label={t.firstCardGift}
            className={`block h-[2.875rem] w-full px-4 text-[16px] outline-none placeholder:text-faint focus:shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-brand)] ${boxLook}`}
          />
        ) : (
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t.firstCardGift}>
            {ideas.map((idea) => (
              <button key={idea} type="button" role="radio" aria-checked={gift === idea} onClick={() => setGift(idea)} className={`h-[2.5rem] px-3.5 text-[0.9375rem] ${chip(gift === idea)}`}>
                {idea}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setGift("");
                setTyping(true);
              }}
              className="press flex h-[2.5rem] items-center gap-1.5 rounded-full bg-brand-soft px-3.5 text-[0.9375rem] font-bold text-brand"
            >
              <Pencil className="size-3.5" strokeWidth={2.6} /> {t.firstCardOther}
            </button>
          </div>
        )}
        {state?.error && <p className="mt-3 rounded-2xl bg-coral-soft px-4 py-3 text-[0.9375rem] font-medium text-coral">{state.error}</p>}
        {lost && <p className="mt-3 rounded-2xl bg-coral-soft px-4 py-3 text-[0.9375rem] font-medium text-coral">{t.cardLost}</p>}
      </div>

      <div className="shrink-0 pb-3">
        {lost ? (
          <Btn key="again" type="button" onClick={() => window.location.reload()}>
            {t.cardLostAgain}
          </Btn>
        ) : (
          <Btn key="send" type="submit" disabled={pending || gift.trim().length < 2}>
            {pending ? t.checking : t.firstCardGo}
          </Btn>
        )}
        <p className="mt-1.5 text-center text-[0.8125rem] text-faint [@media(max-height:520px)]:hidden">{t.firstCardLater}</p>
      </div>

      <input type="hidden" name="goal" value={goal} />
      <input type="hidden" name="gift" value={gift.trim()} />
      <input type="hidden" name="color" value={start.color} />
      <input type="hidden" name="gap" value={60} />
      <input type="hidden" name="next" value="/shop/start" />
    </form>
  );
}
