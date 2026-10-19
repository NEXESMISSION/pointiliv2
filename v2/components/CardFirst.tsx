"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Check, ChevronRight, Pencil } from "lucide-react";
import { saveCard, setShopLogo } from "@/app/actions";
import { setStampLogo } from "@/app/shop/card/actions";
import { HelpButton, type HelpSettings } from "@/components/Help";
import { LogoPicker } from "@/components/LogoPicker";
import { prefetchClip } from "@/components/HowClip";
import { MadePill, MorphCard, MorphGround, MorphHead, SlideChoice } from "@/components/Morph";
import { Confetti } from "@/components/StampLand";
import { Steps } from "@/components/Steps";
import { useScreen } from "@/components/Tracker";
import { WheelHow } from "@/components/Wheel";
import { GiftWay, WheelBuild } from "@/components/WheelBuild";
import { Btn, boxLook } from "@/components/ui";
import { cardDefaults } from "@/lib/card-defaults";
import { fill, t } from "@/lib/t";
import { signal } from "@/lib/track";
import { waitSays } from "@/lib/when";
import type { FormState } from "@/lib/types";

const GOALS = [5, 6, 8, 10, 12];
/** the wait between two tampons, in minutes: an hour, once a day (the next day in Tunis), none — or hours typed */
const WAITS = [60, 1440, 0];
const COLORS = ["#D7141A", "#FF6B4A", "#B45309", "#12B76A", "#0891B2", "#1D5FA8", "#6C47FF", "#E0457B", "#1F1B2E"];
const TAP_LABEL = "جرّب: زيد تامبون على الكارط";
/** the four questions, in the order the wizard asks them later */
const GOAL = 1;
const GIFT = 2;
const WAIT = 3;
const LOOK = 4;
/** the card's gift while the wheel is on (the card holds a turn, not a gift of its own) */
const SPIN_GIFT = "الروليت";
/**
 * The card above the questions. Its height follows its width (about 9rem +
 * 0.4 × its width); everything else on a question takes about 26rem + 14dvh
 * (the headline is the «Morph» one, bigger), so the card may be as wide as
 * 2.5 × (86dvh − 35rem) and all of it still fits on a short phone. Never
 * under 16rem.
 */
const SHRINK = "mx-auto w-full max-w-[min(100%,max(16rem,calc(2.5*(86dvh_-_35rem))))]";
/** the questions that hold more under the card (the look, the wheel): a smaller card, and none at all on the smallest phones */
const SHRINK_LOOK = "mx-auto w-full max-w-[min(100%,max(15rem,calc(2.5*(84dvh_-_36rem))))] [@media(max-height:520px)]:hidden";

type Shop = { name: string; kind: string; color?: string | null; logo?: string | null; stamp_logo?: boolean };

const box = (on: boolean) => `press font-bold ${on ? "bg-brand text-white shadow-[0_8px_18px_-10px_rgb(108_71_255/0.8)]" : "bg-surface text-ink shadow-card"}`;
const numBox = (bad: boolean, lit: boolean) =>
  `num h-10 w-[4.25rem] text-center text-[16px] font-bold outline-none placeholder:font-normal placeholder:text-faint ${boxLook} ${bad ? "shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-coral)]" : lit ? "shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-brand)]" : "focus:shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-brand)]"}`;

/**
 * A new owner's first card: every question a card has, one at a time, and
 * nothing hidden — how many tampons, what the customer wins (one gift, or the
 * roulette and what it holds), how long between two tampons, and the card's
 * own colour and logo.
 *
 * It was cut down to two questions on 18 Oct 2026, with the rest behind a
 * quiet line, because opening a shop took a median of 92 seconds and the
 * colour and the wait were where owners got angriest. The founder asked for
 * all of it back on 19 Oct — «i want to see everything as first card, not
 * only the recompense and the number of tampons, everything, even the
 * roulette + the roulette explanation» — so the questions are back, but as
 * the wizard's: one to a screen, each already answered for what the shop
 * sells, so «كمّل» alone walks the whole card.
 *
 * It wears the «Morph» reel's look (components/Morph.tsx): the card bumps and
 * drops its new dots, colours flow into it, and «حلّ الكارط» makes it shine
 * before the next screen.
 */
export function CardFirst({ shop, help, wheel = false }: { shop: Shop; help?: HelpSettings; wheel?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveCard, null);
  const ideas = t.ideas[shop.kind] ?? t.ideas.other!;
  const start = cardDefaults(shop.kind);
  const [step, setStep] = useState<number>(GOAL);
  const [goal, setGoal] = useState(start.goal);
  const [other, setOther] = useState("");
  const otherBad = other !== "" && !(Number(other) >= 3 && Number(other) <= 30);
  const [gift, setGift] = useState(ideas[0] ?? "");
  // «حاجة أخرى»: the gift typed by hand, in place of the ideas
  const [typing, setTyping] = useState(false);
  // the roulette instead of one gift, and what it holds — the trade's own ideas to begin with
  const [spin, setSpin] = useState(false);
  const [prizes, setPrizes] = useState<string[]>(() => ideas.slice(0, 3));
  // how the wheel works: it opens itself the first time the roulette is chosen, and from the line under it after that
  const [how, setHow] = useState(false);
  const toldHow = useRef(false);
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
  // «حلّ الكارط» tapped: the card shines while it is saved, then «الكارط تحلّت»
  const [made, setMade] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);
  useScreen(step === GOAL ? "first-card" : step === GIFT ? "first-card-gift" : step === WAIT ? "first-card-wait" : "first-card-look");
  useEffect(() => {
    if (state?.error) signal("form_error", `first-card · ${state.error}`);
  }, [state]);
  useEffect(() => {
    if (typing) input.current?.focus();
  }, [typing]);
  // the clip of the next screen, into the phone's cache while the last questions are answered
  useEffect(() => {
    if (step >= WAIT) prefetchClip();
  }, [step]);
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
    setMade(true);
    if (logo !== (shop.logo ?? "")) {
      const ok = await setShopLogo(logo).catch(() => false);
      if (!ok) {
        setMade(false);
        return setSaveErr(true);
      }
    }
    if (stampLogo !== (!!shop.stamp_logo && !!shop.logo)) {
      const r = await setStampLogo(stampLogo && !!logo).catch(() => ({ ok: false }));
      if (!r.ok) {
        setMade(false);
        return setSaveErr(true);
      }
    }
    form.current?.requestSubmit();
  };

  const onCard = tap && tap.goal === goal ? tap.n : Math.max(1, Math.round(goal * 0.4));
  // the card the owner is looking at: on the roulette it holds a turn, not a gift
  const cardGift = spin ? SPIN_GIFT : gift.trim() || "…";
  const preview = { name: shop.name, kind: shop.kind, logo: logo || null, goal, gift: cardGift, color, stamp_logo: stampLogo && !!logo, wheel: spin };
  /** the two groups of the last question, each named: the head above asks only «اللون واللوغو متاعك» */
  const label = "mb-1.5 mt-[1.6dvh] px-1 text-[0.8125rem] font-semibold text-muted";
  const canGo = step === GOAL ? !otherBad : step === GIFT ? (spin ? prizes.length >= 2 : gift.trim().length >= 2) : step === WAIT ? !hoursBad : !logoBusy;
  const last = step === LOOK;
  // the card shines and says it is made while it is saved — and stops at once on any word of trouble
  const making = made && !state?.error && !saveErr && !lost;
  const big = !making && (step === LOOK || (step === GIFT && spin));

  const head = making
    ? { title: t.morphMade, sub: shop.name }
    : step === GOAL
      ? { title: t.morphGoalTitle, sub: t.morphGoalSub }
      : step === GIFT
        ? { title: t.firstCardGift, sub: spin ? t.wizSpinEx : fill(t.wizGiftEx, { a: ideas[0] ?? "", b: ideas[1] ?? "" }) }
        : step === WAIT
          ? { title: t.firstCardWait, sub: waitSays(gap) }
          : { title: t.morphLookTitle, sub: t.firstCardLater };

  return (
    <form ref={form} action={action} className="safe-t safe-b mx-auto flex h-dvh w-full max-w-md flex-col overflow-x-clip overflow-y-auto px-[clamp(1rem,5vw,1.5rem)] [@media(max-height:547.98px)]:h-auto [@media(max-height:547.98px)]:min-h-dvh">
      <MorphGround />
      <header className="flex shrink-0 items-center gap-3 pt-2">
        {step > GOAL && !making ? (
          <button type="button" onClick={() => setStep(step - 1)} className="press grid size-10 shrink-0 place-items-center rounded-full bg-surface shadow-card" aria-label={t.back}>
            <ChevronRight className="size-5" />
          </button>
        ) : null}
        {/* where the owner is, twice over: the second of the three steps of opening a shop,
            and how far through the card's own four questions (components/Steps.tsx) */}
        <div className="min-w-0 flex-1">
          <Steps at={2} sub={making ? 1 : step / LOOK} />
        </div>
        {help ? <HelpButton help={help} compact /> : null}
      </header>

      {/* never shorter than what it holds: on the smallest phones the whole screen scrolls, the button never sits on a chip */}
      <div className="flex flex-1 flex-col justify-center-safe py-[1.6dvh]">
        <MorphHead k={making ? "making" : step} title={head.title} sub={head.sub} />

        {/* the card is a try: a tap lands one more tampon on it, up to the gift, then it starts over */}
        <button type="button" onClick={() => setTap({ goal, n: onCard >= goal ? 0 : onCard + 1 })} aria-label={TAP_LABEL} className={`press mt-[1.8dvh] block rounded-[1.75rem] text-start ${big ? SHRINK_LOOK : SHRINK}`}>
          <MorphCard shop={preview} stamps={making ? 0 : onCard} fresh={tap?.goal === goal && !making} made={making} />
        </button>

        {making ? (
          // the card is made: its word, and the confetti — the next screen follows by itself
          <div className="mt-[2.4dvh]">
            <MadePill>{t.morphMade}</MadePill>
            <Confetti count={46} delay={250} />
          </div>
        ) : step === GOAL ? (
          <>
            <SlideChoice
              className="mt-[2dvh]"
              options={GOALS}
              value={other ? null : goal}
              label={t.firstCardGoal}
              render={(g) => <span className="num text-[1.0625rem]">{g}</span>}
              onPick={(g) => {
                setGoal(g);
                setOther("");
              }}
            />
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
          </>
        ) : step === GIFT ? (
          <>
            {/* one gift, or the roulette: the two ways of giving, side by side. A shop that is being
                opened may choose either (19 Oct 2026); the roulette explains itself the first time it
                is chosen, and the line under it opens that again. */}
            {wheel && (
              <GiftWay
                className="mt-[1.6dvh]"
                spin={spin}
                onPick={(on) => {
                  if (on && (!spin || !toldHow.current)) {
                    toldHow.current = true;
                    setHow(true);
                  }
                  setSpin(on);
                }}
              />
            )}
            {spin ? (
              <>
                <WheelBuild className="mt-[1.4dvh]" face="[@media(max-height:640px)]:hidden" prizes={prizes} setPrizes={setPrizes} ideas={ideas} onEnter={() => prizes.length >= 2 && setStep(WAIT)} />
                <button type="button" onClick={() => setHow(true)} className="press mt-1.5 h-8 w-full text-[0.8125rem] font-semibold text-brand">
                  {t.wheelHowTitle}
                </button>
              </>
            ) : (
              <>
                {typing ? (
                  <input
                    ref={input}
                    value={gift}
                    onChange={(e) => setGift(e.target.value)}
                    placeholder={t.firstCardOtherPh}
                    maxLength={60}
                    aria-label={t.firstCardGift}
                    className={`mt-[2dvh] block h-[2.75rem] w-full px-4 text-[16px] outline-none placeholder:text-faint focus:shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-brand)] ${boxLook}`}
                  />
                ) : (
                  <div className="mt-[2dvh] flex flex-wrap gap-1.5" role="radiogroup" aria-label={t.firstCardGift}>
                    {ideas.map((idea) => (
                      <button key={idea} type="button" role="radio" aria-checked={gift === idea} onClick={() => setGift(idea)} className={`h-[2.375rem] rounded-full px-3.5 text-[0.9375rem] transition-[background-color,color,transform] duration-200 ${box(gift === idea)}`}>
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
            )}
          </>
        ) : step === WAIT ? (
          <>
            {/* how long a customer waits between two tampons */}
            <SlideChoice
              className="mt-[2dvh]"
              options={WAITS}
              value={hours ? null : gap}
              label={t.firstCardWait}
              render={(w) => <span className="text-[0.8125rem] leading-tight">{w === 60 ? t.waitHour : w === 1440 ? t.waitDay : t.waitNone}</span>}
              onPick={(w) => {
                setGap(w);
                setHours("");
              }}
            />
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
        ) : (
          <>
            {/* the colour: the chosen one ringed and a little bigger, the card fills with it */}
            <p className={label}>{t.firstCardColor}</p>
            <div className="flex justify-between gap-1 px-0.5" role="radiogroup" aria-label={t.firstCardColor}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  onClick={() => setColor(c)}
                  aria-label={c}
                  aria-checked={color === c}
                  className="press grid size-[1.875rem] shrink-0 place-items-center rounded-full text-white transition-[transform,box-shadow] duration-300 [transition-timing-function:cubic-bezier(0.3,1.4,0.4,1)]"
                  style={{ background: c, transform: color === c ? "scale(1.18)" : undefined, boxShadow: color === c ? `0 0 0 3px #fff, 0 0 0 5px ${c}` : undefined }}
                >
                  {color === c && <Check className="size-3.5" strokeWidth={3} />}
                </button>
              ))}
            </div>

            {/* the logo, and the tampon's shape: the tick, or the logo itself */}
            <p className={label}>{t.firstCardLogo}</p>
            <div className="flex items-center gap-2">
              <LogoPicker value={logo} onChange={(url) => { setLogo(url); if (url) setStampLogoOn(true); }} onError={setLogoErr} onBusy={setLogoBusy} />
              <SlideChoice
                className="flex-1"
                options={["tick", "logo"]}
                value={stampLogo && logo ? "logo" : "tick"}
                label={t.stampLook}
                render={(v) => <span className={`text-[0.8125rem] ${v === "logo" && !logo ? "opacity-45" : ""}`}>{v === "logo" ? t.stampLogo : t.stampTick}</span>}
                onPick={(v) => (v === "tick" || logo ? setStampLogoOn(v === "logo") : null)}
              />
            </div>
            {logoErr && <span className="mt-1 block px-1 text-[0.8125rem] font-medium text-coral">{logoErr}</span>}
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
        ) : (
          <Btn key="go" type="button" disabled={making || pending || logoBusy || !canGo} onClick={() => (last ? void send() : setStep(step + 1))}>
            {making || pending ? t.checking : logoBusy ? t.logoWait : last ? t.firstCardGo : t.next}
          </Btn>
        )}
      </div>

      <input type="hidden" name="goal" value={goal} />
      {/* on the roulette the card's own gift is the turn; what the wheel holds goes with it */}
      <input type="hidden" name="gift" value={spin ? SPIN_GIFT : gift.trim()} />
      <input type="hidden" name="color" value={color} />
      <input type="hidden" name="gap" value={gap} />
      {wheel && <input type="hidden" name="wheel" value={spin ? "1" : "0"} />}
      {wheel && spin && <input type="hidden" name="prizes" value={JSON.stringify(prizes)} />}
      <input type="hidden" name="next" value="/shop/start" />
      {how && <WheelHow goal={goal} prizes={prizes.map((name) => ({ name, chance: 0 }))} onClose={() => setHow(false)} />}
    </form>
  );
}
