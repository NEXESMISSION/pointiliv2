"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { cardChange, saveCard } from "@/app/actions";
import { HelpButton, type HelpSettings } from "@/components/Help";
import { Pass } from "@/components/Pass";
import { Confetti } from "@/components/StampLand";
import { useScreen } from "@/components/Tracker";
import { CardConfirm, type CardImpact } from "@/components/CardConfirm";
import { Btn, Icon3D, boxLook } from "@/components/ui";
import { seenBefore, shown } from "@/lib/once";
import { fill, sameGift, t } from "@/lib/t";
import { signal } from "@/lib/track";
import { waitSays } from "@/lib/when";
import type { FormState } from "@/lib/types";

const GOALS = [5, 6, 8, 10, 12];
/** the wait between two tampons, in minutes: an hour, once a day (the next day in Tunis), none — or hours typed */
const WAITS = [60, 1440, 0];
/** the steps: 0 is the hello, then the four questions, then the card made */
const GOAL = 1;
const GIFT = 2;
const WAIT = 3;
const COLOR = 4;
const READY = 5;
const COLORS = ["#D7141A", "#FF6B4A", "#B45309", "#12B76A", "#0891B2", "#1D5FA8", "#6C47FF", "#E0457B", "#1F1B2E"];
/** how long the hello stays before the first question slides in by itself */
const HELLO_MS = 3400;
/**
 * The card above the question: its height follows its width (a dot per
 * stamp: about 9rem + 0.4 × its width), so on a short screen it gets narrower.
 * Everything else on a question (the top, the question, the answers, the
 * button, the gaps) takes about 30.5rem + 14.5dvh: the card may be as wide as
 * 2.5 × (85.5dvh − 31rem) and the rest still fits under it. On the hello the
 * rest is 30.5rem + 8dvh. Never under 19rem, where its own lines would be
 * cut: on the smallest screens the page scrolls a little instead.
 */
const SHRINK = "mx-auto w-full max-w-[min(100%,max(19rem,calc(2.5*(85.5dvh_-_31rem))))]";
const SHRINK_HELLO = "mx-auto w-full max-w-[min(100%,max(19rem,calc(2.5*(92dvh_-_31rem))))]";

type Shop = { id: string; name: string; kind: string; goal: number | null; gift: string | null; color: string; logo?: string | null; stamp_gap?: number };

/**
 * The card, one question at a time. A new owner first gets a hello — «توّا
 * نعملو مع بعضنا أوّل كارط» — that slides on by itself; then four questions,
 * each alone on the screen with an example under it (how many stamps, which
 * gift, how long a customer waits between two tampons, which colour), the
 * card itself changing above them; then the card
 * is ready. Changing the card later walks the same four questions, starting
 * from the card as it is. A first card is saved from a sheet that says how it
 * works. A change is saved at once — unless it touches customers in the
 * middle of their card: then one question first (CardConfirm): they finish
 * the card they started, or they switch to the new one now.
 */
export function CardWizard({ shop, owner, next, editing, hello = false, help }: { shop: Shop; owner: string; next: string; editing: boolean; hello?: boolean; help?: HelpSettings }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveCard, null);
  const router = useRouter();
  const ideas = t.ideas[shop.kind] ?? t.ideas.other!;
  // the hello is once in a lifetime (`hello`: the person never had it)
  const [step, setStep] = useState(() => (editing || !hello || seenBefore("card_hello", shop.id) ? 1 : 0));
  const [back, setBack] = useState(false);
  const [goal, setGoal] = useState(shop.goal ?? 8);
  // a number typed by hand (3 to 30) instead of one of the five
  const [other, setOther] = useState(shop.goal && !GOALS.includes(shop.goal) ? String(shop.goal) : "");
  const otherBad = other !== "" && !(Number(other) >= 3 && Number(other) <= 30);
  const [gift, setGift] = useState(shop.gift ?? ideas[0] ?? "");
  const [color, setColor] = useState((shop.color || COLORS[0]!).toUpperCase());
  // the wait: one of the three, or a number of hours typed (1 to 72)
  const [gap, setGap] = useState(shop.stamp_gap ?? 60);
  const [hours, setHours] = useState(() => (shop.stamp_gap && !WAITS.includes(shop.stamp_gap) ? String(Math.round(shop.stamp_gap / 60)) : ""));
  const hoursBad = hours !== "" && !(Number(hours) >= 1 && Number(hours) <= 72);
  // the sheet before saving: a first card, how it works; a change, the one question (when there is one)
  const [confirm, setConfirm] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const anyChange = goal !== shop.goal || gift.trim() !== (shop.gift ?? "").trim() || gap !== (shop.stamp_gap ?? 60) || color !== (shop.color || "").toUpperCase();
  // the rule itself changed (how many tampons, which gift): the only change a customer's card can feel
  const ruleChanged = editing && (goal !== shop.goal || !sameGift(gift, shop.gift));
  // what that change does to the customers in the middle of their card: asked as
  // soon as the card is final (the last step), so «سجّل» has its answer at once
  const asked = useRef<{ key: string; answer: Promise<CardImpact | null> } | null>(null);
  const impactOf = (g: number, what: string) => {
    const key = `${g}|${what}`;
    if (asked.current?.key !== key) {
      asked.current = {
        key,
        answer: cardChange(g, what)
          .then((r) => (r.ok ? { ask: (r.way ?? 0) - (r.eased ?? 0), winKeep: r.win_eased ?? 0, winMove: r.win_now ?? 0 } : null))
          .catch(() => null),
      };
    }
    return asked.current.answer;
  };
  const [impact, setImpact] = useState<CardImpact | null>(null);
  const [looking, setLooking] = useState(false);
  // a save whose answer never came back, and the card is still the old one
  const [lost, setLost] = useState(false);

  useScreen(`${editing ? "edit-" : ""}${["hello", "goal", "gift", "wait", "color", "ready"][step] ?? "ready"}`);
  useEffect(() => {
    if (state?.error) signal("form_error", `card · ${state.error}`);
  }, [state]);

  const go = (to: number) => {
    setBack(to < step);
    setStep(to);
  };

  useEffect(() => {
    if (step === READY && ruleChanged) void impactOf(goal, gift.trim());
  }, [step, ruleChanged, goal, gift]);

  const send = async () => {
    // a first card: how it works, then the code
    if (!editing) return setConfirm(true);
    // nothing a customer's card feels (the colour, the wait, or nothing at all): saved at once
    if (!ruleChanged) return formRef.current?.requestSubmit();
    setLooking(true);
    const found = await Promise.race([impactOf(goal, gift.trim()), new Promise<null>((r) => setTimeout(() => r(null), 6000))]);
    setLooking(false);
    // someone to choose for, or a gift won at once: the sheet. Nobody (or no
    // answer): saved, and whoever started a card keeps it
    if (found && (found.ask > 0 || found.winKeep > 0)) {
      setImpact(found);
      setConfirm(true);
    } else formRef.current?.requestSubmit();
  };

  // A save's answer can die on the way back (a connection that drops in the
  // middle of it): «لحظة…» would stay for good, the card saved or not — nobody
  // knows. So after a while the screen asks the database itself, around the
  // answer that is not coming: the card changed → on to the next screen; still
  // the old one after half a minute → said plainly, with a way to try again.
  useEffect(() => {
    if (!pending) return;
    const started = Date.now();
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const saved = async () => {
      const stop = new AbortController();
      const id = setTimeout(() => stop.abort(), 5000);
      try {
        const res = await fetch("/api/card", { cache: "no-store", signal: stop.signal });
        const now = (res.ok ? await res.json() : null) as { ok?: boolean; goal: number | null; gift: string | null; gap: number; color: string } | null;
        if (!now?.ok) return false;
        return !anyChange || now.goal !== shop.goal || (now.gift ?? "") !== (shop.gift ?? "") || now.gap !== (shop.stamp_gap ?? 60) || now.color.toUpperCase() !== (shop.color || "").toUpperCase();
      } catch {
        return false;
      } finally {
        clearTimeout(id);
      }
    };
    const look = async () => {
      const yes = await saved();
      if (!alive) return;
      if (yes) window.location.assign(next);
      else if (Date.now() - started > 30_000) setLost(true);
      else timer = setTimeout(look, 3000);
    };
    timer = setTimeout(look, 8000);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  // the hello, written down the moment it shows: a reload or another phone goes straight to the first question
  const claimed = useRef(false);
  useEffect(() => {
    if (step !== 0 || claimed.current) return;
    claimed.current = true;
    shown("card_hello", shop.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // the hello goes on by itself
  useEffect(() => {
    if (step !== 0) return;
    const id = setTimeout(() => go(GOAL), HELLO_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const preview = { name: shop.name, kind: shop.kind, logo: shop.logo, goal, gift: gift.trim() || "…", color };

  if (step === 0) {
    return (
      <main className="safe-t safe-b relative mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-[clamp(1.25rem,6vw,1.75rem)] text-center">
        <style>{`@keyframes wz-bar { from { transform: scaleX(0); } to { transform: scaleX(1); } }`}</style>
        <Icon3D name="party" size={86} className="animate-pop" />
        <p className="mt-4 animate-rise text-[0.9375rem] font-semibold text-muted" style={{ animationDelay: "150ms" }}>
          {fill(t.wizOpened, { shop: shop.name })}
        </p>
        <h1 className="mt-2 animate-rise text-[1.75rem] font-bold leading-snug" style={{ animationDelay: "450ms" }}>
          {owner ? `${owner}، ` : ""}
          {t.wizTitle}
        </h1>
        <p className="mt-3 animate-rise text-[1rem] text-body" style={{ animationDelay: "800ms" }}>
          {t.wizBody}
        </p>
        <div className={`mt-[4dvh] animate-rise ${SHRINK_HELLO}`} style={{ animationDelay: "1100ms" }}>
          <Pass shop={{ ...preview, gift: ideas[0] ?? "" }} stamps={0} />
        </div>
        <div className="mt-[4dvh] h-1 w-40 overflow-hidden rounded-full bg-line" aria-hidden>
          <span className="block h-full origin-right rounded-full bg-brand" style={{ animation: `wz-bar ${HELLO_MS}ms linear both` }} />
        </div>
        <button type="button" onClick={() => go(GOAL)} className="press mt-4 px-6 py-2 text-[1rem] font-bold text-brand">
          {t.wizStart}
        </button>
      </main>
    );
  }

  const question = step === GOAL ? t.wizGoalQ : step === GIFT ? t.wizGiftQ : step === WAIT ? t.wizWaitQ : step === COLOR ? t.wizColorQ : editing ? t.wizReview : t.wizReady;
  const example =
    step === GOAL
      ? t.wizGoalEx
      : step === GIFT
        ? fill(t.wizGiftEx, { a: ideas[0] ?? "", b: ideas[1] ?? "" })
        : step === WAIT
          ? waitSays(gap)
          : step === COLOR
            ? t.wizColorEx
            : editing
              ? null
              : t.wizReadyBody;
  const canGo = step === GOAL ? !otherBad : step === GIFT ? gift.trim().length >= 2 : step === WAIT ? !hoursBad : true;

  return (
    <form ref={formRef} action={action} className="safe-t safe-b relative mx-auto flex min-h-dvh max-w-md flex-col px-[clamp(1rem,5vw,1.5rem)]">
      <style>{`
        @keyframes wz-in-next { from { opacity: 0; transform: translateX(-28px); } to { opacity: 1; transform: none; } }
        @keyframes wz-in-back { from { opacity: 0; transform: translateX(28px); } to { opacity: 1; transform: none; } }
      `}</style>
      {step === READY && !editing && <Confetti count={60} />}

      {/* the way back, and where we are: a dot per question */}
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 pt-2">
        {step > GOAL || editing ? (
          <button type="button" onClick={() => (step > GOAL ? go(step - 1) : router.push(next))} className="press grid size-11 place-items-center rounded-full bg-surface shadow-card" aria-label={t.back}>
            <ChevronRight className="size-5" />
          </button>
        ) : (
          <span className="size-11" />
        )}
        {step < READY ? (
          <span className="flex items-center gap-2" aria-label={fill(t.wizStep, { n: step })}>
            {[GOAL, GIFT, WAIT, COLOR].map((n) => (
              <span key={n} className={`h-2 rounded-full transition-all duration-300 ${n === step ? "w-6 bg-brand" : n < step ? "w-2 bg-brand/50" : "w-2 bg-line"}`} />
            ))}
          </span>
        ) : (
          <span className="text-[0.875rem] font-semibold text-muted">{editing ? t.wizEdit : ""}</span>
        )}
        <span className="flex justify-end">{help ? <HelpButton help={help} compact /> : <span className="size-11" />}</span>
      </header>

      {/* the card, the question, the answers and the button: one block, in the middle */}
      <div className="flex flex-1 flex-col justify-center py-[2dvh]">
      <div className={SHRINK}>
        <Pass shop={preview} stamps={step === READY ? 1 : Math.max(1, Math.round(goal * 0.6))} fresh={step === READY} key={step === READY ? "ready" : "live"} />
      </div>

      {/* the question slides in from the side: clipped sideways only, at the screen's edge, so the page never widens */}
      <div className="-mx-[clamp(1rem,5vw,1.5rem)] mt-[3dvh] overflow-x-clip px-[clamp(1rem,5vw,1.5rem)]">
      <section key={step} style={{ animation: `${back ? "wz-in-back" : "wz-in-next"} 380ms cubic-bezier(0.2,0.8,0.2,1) both` }}>
        <h1 className="text-[1.55rem] font-bold leading-snug">{question}</h1>
        {/* the gift's example names the first two gifts already on the buttons under it: on a short screen, where those buttons may take two rows, it gives them its room */}
        {example && <p className={`mt-1.5 text-[0.9375rem] text-muted ${step === GIFT ? "[@media(max-height:700px)]:hidden" : ""}`}>{example}</p>}

        {step === GOAL && (
          <>
            <div className="mt-[2.4dvh] grid grid-cols-5 gap-2">
              {GOALS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    setGoal(g);
                    setOther("");
                  }}
                  aria-pressed={goal === g}
                  className={`press num h-[3.6rem] rounded-[1.125rem] text-[1.3125rem] font-bold ${goal === g ? "bg-brand text-white shadow-[0_10px_22px_-10px_rgb(108_71_255/0.8)]" : "bg-surface text-ink shadow-card"}`}
                >
                  {g}
                </button>
              ))}
            </div>
            <label className="mt-[1.6dvh] flex items-center justify-center gap-2.5">
              <span className="text-[0.9062rem] font-semibold text-muted">{t.wizGoalOther}</span>
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
                // Enter goes to the next question, it does not send the card half made
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  if (!otherBad) go(GIFT);
                }}
                placeholder="15"
                aria-label={t.wizGoalOther}
                aria-invalid={otherBad}
                className={`num h-11 w-[4.75rem] text-center text-[16px] font-bold outline-none placeholder:font-normal placeholder:text-faint ${boxLook} ${otherBad ? "shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-coral)]" : !GOALS.includes(goal) && other ? "shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-brand)]" : "focus:shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-brand)]"}`}
              />
              <span className={`text-[0.8125rem] ${otherBad ? "font-semibold text-coral" : "text-faint"}`}>{t.wizGoalRange}</span>
            </label>
          </>
        )}

        {step === GIFT && (
          <div className="mt-[2dvh]">
            <div className="flex flex-wrap gap-1.5">
              {ideas.map((idea) => (
                <button key={idea} type="button" onClick={() => setGift(idea)} aria-pressed={gift === idea} className={`press rounded-full px-3.5 py-2 text-[0.875rem] font-semibold ${gift === idea ? "bg-brand text-white" : "bg-surface text-body shadow-card"}`}>
                  {idea}
                </button>
              ))}
            </div>
            <input
              value={ideas.includes(gift) ? "" : gift}
              onChange={(e) => setGift(e.target.value)}
              // Enter goes to the next question, it does not send the card half made
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                if (gift.trim().length >= 2) go(WAIT);
              }}
              placeholder={t.wizGiftPh}
              maxLength={60}
              aria-label={t.wizGiftPh}
              className={`mt-2.5 block h-[3.25rem] w-full px-4 text-[16px] outline-none placeholder:text-faint focus:shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-brand)] ${boxLook}`}
            />
          </div>
        )}

        {step === WAIT && (
          <>
            <div className="mt-[2.4dvh] grid grid-cols-3 gap-2">
              {WAITS.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => {
                    setGap(w);
                    setHours("");
                  }}
                  aria-pressed={gap === w && !hours}
                  className={`press min-h-[3.6rem] rounded-[1.125rem] px-1.5 py-2 text-[0.9688rem] font-bold leading-tight ${gap === w && !hours ? "bg-brand text-white shadow-[0_10px_22px_-10px_rgb(108_71_255/0.8)]" : "bg-surface text-ink shadow-card"}`}
                >
                  {w === 60 ? t.waitHour : w === 1440 ? t.waitDay : t.waitNone}
                </button>
              ))}
            </div>
            <label className="mt-[1.6dvh] flex items-center justify-center gap-2.5">
              <span className="text-[0.9062rem] font-semibold text-muted">{t.wizWaitOther}</span>
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
                  else if (v === "") setGap(shop.stamp_gap !== undefined && WAITS.includes(shop.stamp_gap) ? shop.stamp_gap : 60);
                }}
                // Enter goes to the next question, it does not send the card half made
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  if (!hoursBad) go(COLOR);
                }}
                placeholder="3"
                aria-label={t.wizWaitOther}
                aria-invalid={hoursBad}
                className={`num h-11 w-[4.75rem] text-center text-[16px] font-bold outline-none placeholder:font-normal placeholder:text-faint ${boxLook} ${hoursBad ? "shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-coral)]" : hours ? "shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-brand)]" : "focus:shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-brand)]"}`}
              />
              <span className={`text-[0.8125rem] ${hoursBad ? "font-semibold text-coral" : "text-faint"}`}>{t.wizWaitRange}</span>
            </label>
          </>
        )}

        {step === COLOR && (
          <div className="mt-[2.4dvh] grid grid-cols-5 justify-items-center gap-3">
            {COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} aria-label={c} aria-pressed={color === c} className="press grid size-12 place-items-center rounded-full text-white" style={{ background: c, boxShadow: color === c ? `0 0 0 3px var(--color-canvas), 0 0 0 5px ${c}` : undefined }}>
                {color === c && <Check className="size-5" strokeWidth={3} />}
              </button>
            ))}
          </div>
        )}

        {state?.error && <p className="mt-3 rounded-2xl bg-coral-soft px-4 py-3 text-[0.9062rem] font-medium text-coral">{state.error}</p>}
      </section>
      </div>

      <div className="mt-[3.5dvh] shrink-0">
        {/* two different buttons (keys): one patched from "button" to "submit" inside its own click would send the form */}
        {step < READY ? (
          <Btn key="next" type="button" disabled={!canGo} onClick={() => go(step + 1)}>
            {t.next}
          </Btn>
        ) : lost ? (
          <>
            <p className="mb-2 rounded-2xl bg-coral-soft px-4 py-3 text-[0.9062rem] font-medium text-coral">{t.cardLost}</p>
            <Btn key="again" type="button" onClick={() => window.location.reload()}>
              {t.cardLostAgain}
            </Btn>
          </>
        ) : (
          // a "button", never a "submit": the form is sent by the sheet, or from here once nothing is left to ask
          <Btn key="send" type="button" disabled={pending || looking} onClick={() => void send()} className={editing ? "" : "animate-breathe"}>
            {pending || looking ? t.checking : editing ? t.save : t.cardDone}
          </Btn>
        )}
      </div>
      </div>

      <input type="hidden" name="goal" value={goal} />
      <input type="hidden" name="gift" value={gift.trim()} />
      <input type="hidden" name="color" value={color} />
      <input type="hidden" name="gap" value={gap} />
      <input type="hidden" name="next" value={next} />
      {confirm && !lost && step === READY && <CardConfirm editing={editing} after={{ goal, gift, gap }} impact={editing ? impact : null} pending={pending} onBack={() => setConfirm(false)} />}
    </form>
  );
}
