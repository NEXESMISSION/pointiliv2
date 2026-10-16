"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Check, ChevronRight, Pencil } from "lucide-react";
import { saveCard, setShopLogo } from "@/app/actions";
import { setStampLogo } from "@/app/shop/card/actions";
import { HelpButton, type HelpSettings } from "@/components/Help";
import { LogoPicker } from "@/components/LogoPicker";
import { Pass } from "@/components/Pass";
import { Steps } from "@/components/Steps";
import { useScreen } from "@/components/Tracker";
import { Btn, boxLook } from "@/components/ui";
import { cardDefaults } from "@/lib/card-defaults";
import { t } from "@/lib/t";
import { signal } from "@/lib/track";
import type { FormState } from "@/lib/types";

const GOALS = [5, 6, 8, 10, 12];
/** the wait between two tampons, in minutes: an hour, once a day (the next day in Tunis), none — or hours typed */
const WAITS = [60, 1440, 0];
const COLORS = ["#D7141A", "#FF6B4A", "#B45309", "#12B76A", "#0891B2", "#1D5FA8", "#6C47FF", "#E0457B", "#1F1B2E"];
const TAP_LABEL = "جرّب: زيد تامبون على الكارط";
/**
 * The card above the questions. Its height follows its width (about 9rem +
 * 0.4 × its width); everything else on a part takes about 24rem + 14dvh, so
 * the card may be as wide as 2.5 × (86dvh − 33rem) and all of it still fits
 * on a short phone. Never under 16rem.
 */
const SHRINK = "mx-auto w-full max-w-[min(100%,max(16rem,calc(2.5*(86dvh_-_33rem))))]";
/** the second part holds more under the card: a smaller card, and none at all on the smallest phones */
const SHRINK_LOOK = "mx-auto w-full max-w-[min(100%,max(15rem,calc(2.5*(84dvh_-_33rem))))] [@media(max-height:520px)]:hidden";

type Shop = { name: string; kind: string; color?: string | null; logo?: string | null; stamp_logo?: boolean };

const box = (on: boolean) => `press font-bold ${on ? "bg-brand text-white shadow-[0_8px_18px_-10px_rgb(108_71_255/0.8)]" : "bg-surface text-ink shadow-card"}`;
const numBox = (bad: boolean, lit: boolean) =>
  `num h-10 w-[4.25rem] text-center text-[16px] font-bold outline-none placeholder:font-normal placeholder:text-faint ${boxLook} ${bad ? "shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-coral)]" : lit ? "shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-brand)]" : "focus:shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-brand)]"}`;

/**
 * A new owner's card, in two short parts — everything a card has, nothing
 * left for later:
 *  1. the card: how many tampons (one of five, or typed: 3 to 30) and which
 *     gift (the kind's ideas, or typed);
 *  2. its look and its rule: the colour, the logo (from the phone) and the
 *     tampon's shape (the tick, or the logo), and how long a customer waits
 *     between two tampons (an hour, once a day, none, or hours typed).
 * Everything is already answered for what the shop sells, so «كمّل» and «حلّ
 * الكارط» alone are enough; the card above changes with every answer, and a
 * tap on it lands one more tampon.
 */
export function CardFirst({ shop, help }: { shop: Shop; help?: HelpSettings }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveCard, null);
  const ideas = t.ideas[shop.kind] ?? t.ideas.other!;
  const start = cardDefaults(shop.kind);
  const [part, setPart] = useState<1 | 2>(1);
  const [goal, setGoal] = useState(start.goal);
  const [other, setOther] = useState("");
  const otherBad = other !== "" && !(Number(other) >= 3 && Number(other) <= 30);
  const [gift, setGift] = useState(ideas[0] ?? "");
  // «حاجة أخرى»: the gift typed by hand, in place of the ideas
  const [typing, setTyping] = useState(false);
  const [color, setColor] = useState(start.color);
  const [logo, setLogo] = useState(shop.logo ?? "");
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoErr, setLogoErr] = useState<string | null>(null);
  const [stampLogo, setStampLogoOn] = useState(!!shop.stamp_logo && !!shop.logo);
  const [gap, setGap] = useState(60);
  const [hours, setHours] = useState("");
  const hoursBad = hours !== "" && !(Number(hours) >= 1 && Number(hours) <= 72);
  const [saveErr, setSaveErr] = useState(false);
  const [tap, setTap] = useState<{ goal: number; n: number } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);
  useScreen(part === 1 ? "first-card" : "first-card-look");
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

  // the logo and the tampon's shape belong to the shop: saved first, then the card itself
  const send = async () => {
    setSaveErr(false);
    if (logo !== (shop.logo ?? "")) {
      const ok = await setShopLogo(logo).catch(() => false);
      if (!ok) return setSaveErr(true);
    }
    if (stampLogo !== (!!shop.stamp_logo && !!shop.logo)) {
      const r = await setStampLogo(stampLogo && !!logo).catch(() => ({ ok: false }));
      if (!r.ok) return setSaveErr(true);
    }
    form.current?.requestSubmit();
  };

  const onCard = tap && tap.goal === goal ? tap.n : Math.max(1, Math.round(goal * 0.4));
  const preview = { name: shop.name, kind: shop.kind, logo: logo || null, goal, gift: gift.trim() || "…", color, stamp_logo: stampLogo && !!logo };
  const label = "mb-1.5 mt-[1.6dvh] px-1 text-[0.8125rem] font-semibold text-muted";
  const canGo = !otherBad && gift.trim().length >= 2;

  return (
    <form ref={form} action={action} className="safe-t safe-b mx-auto flex h-dvh w-full max-w-md flex-col overflow-x-clip overflow-y-auto px-[clamp(1rem,5vw,1.5rem)]">
      <header className="flex shrink-0 items-center gap-3 pt-2">
        {part === 2 ? (
          <button type="button" onClick={() => setPart(1)} className="press grid size-10 shrink-0 place-items-center rounded-full bg-surface shadow-card" aria-label={t.back}>
            <ChevronRight className="size-5" />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <Steps at={2} />
        </div>
        {help ? <HelpButton help={help} compact /> : null}
      </header>

      {/* never shorter than what it holds: on the smallest phones the whole screen scrolls, the button never sits on a chip */}
      <div className="flex flex-1 flex-col justify-center-safe py-[1.6dvh]">
        <h1 className="text-balance text-[1.25rem] font-bold leading-snug [@media(max-height:520px)]:sr-only">{part === 1 ? t.firstCardQ : t.firstCardLook}</h1>

        {/* the card is a try: a tap lands one more tampon on it, up to the gift, then it starts over */}
        <button type="button" onClick={() => setTap({ goal, n: onCard >= goal ? 0 : onCard + 1 })} aria-label={TAP_LABEL} className={`press mt-[1.6dvh] block rounded-[1.75rem] text-start ${part === 1 ? SHRINK : SHRINK_LOOK}`}>
          <Pass shop={preview} stamps={onCard} fresh={tap?.goal === goal} />
        </button>

        {part === 1 ? (
          <>
            <p className={label}>{t.firstCardGoal}</p>
            <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={t.firstCardGoal}>
              {GOALS.map((g) => (
                <button
                  key={g}
                  type="button"
                  role="radio"
                  aria-checked={goal === g && !other}
                  onClick={() => {
                    setGoal(g);
                    setOther("");
                  }}
                  className={`num h-[2.75rem] rounded-[1rem] text-[1.0625rem] ${box(goal === g && !other)}`}
                >
                  {g}
                </button>
              ))}
            </div>
            <label className="mt-1.5 flex items-center justify-center gap-2">
              <span className="text-[0.8125rem] font-semibold text-muted">{t.wizGoalOther}</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={2}
                value={other}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 2);
                  setOther(v);
                  if (Number(v) >= 3 && Number(v) <= 30) setGoal(Number(v));
                }}
                placeholder="15"
                aria-label={t.wizGoalOther}
                aria-invalid={otherBad}
                className={numBox(otherBad, !!other && !otherBad)}
              />
              <span className={`text-[0.75rem] ${otherBad ? "font-semibold text-coral" : "text-faint"}`}>{t.wizGoalRange}</span>
            </label>

            <p className={label}>{t.firstCardGift}</p>
            {typing ? (
              <input
                ref={input}
                value={gift}
                onChange={(e) => setGift(e.target.value)}
                placeholder={t.firstCardOtherPh}
                maxLength={60}
                aria-label={t.firstCardGift}
                className={`block h-[2.75rem] w-full px-4 text-[16px] outline-none placeholder:text-faint focus:shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-brand)] ${boxLook}`}
              />
            ) : (
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t.firstCardGift}>
                {ideas.map((idea) => (
                  <button key={idea} type="button" role="radio" aria-checked={gift === idea} onClick={() => setGift(idea)} className={`h-[2.375rem] rounded-full px-3.5 text-[0.9375rem] ${box(gift === idea)}`}>
                    {idea}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setGift("");
                    setTyping(true);
                  }}
                  className="press flex h-[2.375rem] items-center gap-1.5 rounded-full bg-brand-soft px-3.5 text-[0.9375rem] font-bold text-brand"
                >
                  <Pencil className="size-3.5" strokeWidth={2.6} /> {t.firstCardOther}
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* the colour */}
            <p className={label}>{t.firstCardColor}</p>
            <div className="flex justify-between gap-1" role="radiogroup" aria-label={t.firstCardColor}>
              {COLORS.map((c) => (
                <button key={c} type="button" role="radio" onClick={() => setColor(c)} aria-label={c} aria-checked={color === c} className="press grid size-[1.875rem] shrink-0 place-items-center rounded-full text-white" style={{ background: c, boxShadow: color === c ? `0 0 0 2px var(--color-canvas), 0 0 0 4px ${c}` : undefined }}>
                  {color === c && <Check className="size-3.5" strokeWidth={3} />}
                </button>
              ))}
            </div>

            {/* the logo, and the tampon's shape: the tick, or the logo itself */}
            <p className={label}>{t.firstCardLogo}</p>
            <div className="flex items-center gap-2">
              <LogoPicker value={logo} onChange={(url) => { setLogo(url); if (url) setStampLogoOn(true); }} onError={setLogoErr} onBusy={setLogoBusy} />
              <div className="grid flex-1 grid-cols-2 gap-1.5" role="radiogroup" aria-label={t.stampLook}>
                {[false, true].map((on) => (
                  <button
                    key={String(on)}
                    type="button"
                    role="radio"
                    disabled={on && !logo}
                    aria-checked={stampLogo === on}
                    onClick={() => setStampLogoOn(on)}
                    className={`flex h-[2.75rem] items-center justify-center gap-1.5 rounded-[1rem] px-1 text-[0.8125rem] disabled:opacity-45 ${box(stampLogo === on)}`}
                  >
                    {on ? t.stampLogo : t.stampTick}
                  </button>
                ))}
              </div>
            </div>
            {logoErr && <span className="mt-1 block px-1 text-[0.8125rem] font-medium text-coral">{logoErr}</span>}

            {/* how long a customer waits between two tampons */}
            <p className={label}>{t.firstCardWait}</p>
            <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label={t.firstCardWait}>
              {WAITS.map((w) => (
                <button
                  key={w}
                  type="button"
                  role="radio"
                  aria-checked={gap === w && !hours}
                  onClick={() => {
                    setGap(w);
                    setHours("");
                  }}
                  className={`h-[2.75rem] rounded-[1rem] px-1 text-[0.8125rem] leading-tight ${box(gap === w && !hours)}`}
                >
                  {w === 60 ? t.waitHour : w === 1440 ? t.waitDay : t.waitNone}
                </button>
              ))}
            </div>
            <label className="mt-1.5 flex items-center justify-center gap-2">
              <span className="text-[0.8125rem] font-semibold text-muted">{t.wizWaitOther}</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={2}
                value={hours}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 2);
                  setHours(v);
                  if (Number(v) >= 1 && Number(v) <= 72) setGap(Number(v) * 60);
                  else if (v === "") setGap(60);
                }}
                placeholder="3"
                aria-label={t.wizWaitOther}
                aria-invalid={hoursBad}
                className={numBox(hoursBad, !!hours && !hoursBad)}
              />
              <span className={`text-[0.75rem] ${hoursBad ? "font-semibold text-coral" : "text-faint"}`}>{t.wizWaitRange}</span>
            </label>
          </>
        )}
        {state?.error && <p className="mt-3 rounded-2xl bg-coral-soft px-4 py-3 text-[0.9375rem] font-medium text-coral">{state.error}</p>}
        {(lost || saveErr) && <p className="mt-3 rounded-2xl bg-coral-soft px-4 py-3 text-[0.9375rem] font-medium text-coral">{lost ? t.cardLost : t.errNetwork}</p>}
      </div>

      <div className="shrink-0 pb-3">
        {lost ? (
          <Btn key="again" type="button" onClick={() => window.location.reload()}>
            {t.cardLostAgain}
          </Btn>
        ) : part === 1 ? (
          <Btn key="next" type="button" disabled={!canGo} onClick={() => setPart(2)}>
            {t.next}
          </Btn>
        ) : (
          <Btn key="send" type="button" disabled={pending || logoBusy || hoursBad || !canGo} onClick={() => void send()}>
            {pending ? t.checking : logoBusy ? t.logoWait : t.firstCardGo}
          </Btn>
        )}
        {part === 1 && <p className="mt-1.5 text-center text-[0.8125rem] text-faint [@media(max-height:520px)]:hidden">{t.firstCardLater}</p>}
      </div>

      <input type="hidden" name="goal" value={goal} />
      <input type="hidden" name="gift" value={gift.trim()} />
      <input type="hidden" name="color" value={color} />
      <input type="hidden" name="gap" value={gap} />
      <input type="hidden" name="next" value="/shop/start" />
    </form>
  );
}
