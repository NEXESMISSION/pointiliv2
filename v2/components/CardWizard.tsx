"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { Check, ChevronRight, Info } from "lucide-react";
import { saveCard } from "@/app/actions";
import { HelpButton, type HelpSettings } from "@/components/Help";
import { Pass } from "@/components/Pass";
import { Confetti } from "@/components/StampLand";
import { useScreen } from "@/components/Tracker";
import { Btn, Icon3D, boxLook } from "@/components/ui";
import { customersN, fill, sameGift, t } from "@/lib/t";
import { signal } from "@/lib/track";
import type { FormState } from "@/lib/types";

const GOALS = [5, 6, 8, 10, 12];
const COLORS = ["#D7141A", "#FF6B4A", "#B45309", "#12B76A", "#0891B2", "#1D5FA8", "#6C47FF", "#E0457B", "#1F1B2E"];
/** how long the hello stays before the first question slides in by itself */
const HELLO_MS = 3400;
/** the card above the question gets smaller on a shorter phone, so nothing ever scrolls */
const SHRINK = "[@media(max-height:720px)]:[zoom:0.88] [@media(max-height:650px)]:[zoom:0.8]";

type Shop = { name: string; kind: string; goal: number | null; gift: string | null; color: string; logo?: string | null };

/**
 * The card, one question at a time. A new owner first gets a hello — «توّا
 * نعملو مع بعضنا أوّل كارط» — that slides on by itself; then three questions,
 * each alone on the screen with an example under it (how many stamps, which
 * gift, which colour), the card itself changing above them; then the card
 * is ready. Changing the card later walks the same three questions, starting
 * from the card as it is, and the last step says what happens to the
 * customers already on their way (`onTheWay` of them).
 */
export function CardWizard({ shop, owner, next, editing, onTheWay, help }: { shop: Shop; owner: string; next: string; editing: boolean; onTheWay?: number; help?: HelpSettings }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveCard, null);
  const router = useRouter();
  const ideas = t.ideas[shop.kind] ?? t.ideas.other!;
  const [step, setStep] = useState(editing ? 1 : 0);
  const [back, setBack] = useState(false);
  const [goal, setGoal] = useState(shop.goal ?? 8);
  // a number typed by hand (3 to 30) instead of one of the five
  const [other, setOther] = useState(shop.goal && !GOALS.includes(shop.goal) ? String(shop.goal) : "");
  const otherBad = other !== "" && !(Number(other) >= 3 && Number(other) <= 30);
  const [gift, setGift] = useState(shop.gift ?? ideas[0] ?? "");
  const [color, setColor] = useState((shop.color || COLORS[0]!).toUpperCase());

  useScreen(`${editing ? "edit-" : ""}${["hello", "goal", "gift", "color", "ready"][step] ?? "ready"}`);
  useEffect(() => {
    if (state?.error) signal("form_error", `card · ${state.error}`);
  }, [state]);

  const go = (to: number) => {
    setBack(to < step);
    setStep(to);
  };

  // the hello goes on by itself
  useEffect(() => {
    if (step !== 0) return;
    const id = setTimeout(() => go(1), HELLO_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const changed = editing && (goal !== shop.goal || !sameGift(gift, shop.gift));
  const easier = changed && goal < (shop.goal ?? 0) && sameGift(gift, shop.gift);
  const note = !changed || onTheWay === undefined ? null : onTheWay === 0 ? t.cardNoteNone : fill(easier ? t.cardNoteEase : t.cardNoteKeep, { who: customersN(onTheWay) });
  const preview = { name: shop.name, kind: shop.kind, logo: shop.logo, goal, gift: gift.trim() || "…", color };

  if (step === 0) {
    return (
      <main className="safe-t safe-b relative mx-auto flex h-dvh max-w-md flex-col items-center justify-center overflow-hidden px-[clamp(1.25rem,6vw,1.75rem)] text-center">
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
        <div className={`mt-[4dvh] w-full animate-rise ${SHRINK}`} style={{ animationDelay: "1100ms" }}>
          <Pass shop={{ ...preview, gift: ideas[0] ?? "" }} stamps={0} />
        </div>
        <div className="mt-[4dvh] h-1 w-40 overflow-hidden rounded-full bg-line" aria-hidden>
          <span className="block h-full origin-right rounded-full bg-brand" style={{ animation: `wz-bar ${HELLO_MS}ms linear both` }} />
        </div>
        <button type="button" onClick={() => go(1)} className="press mt-4 px-6 py-2 text-[1rem] font-bold text-brand">
          {t.wizStart}
        </button>
      </main>
    );
  }

  const question = step === 1 ? t.wizGoalQ : step === 2 ? t.wizGiftQ : step === 3 ? t.wizColorQ : editing ? t.wizReview : t.wizReady;
  const example = step === 1 ? t.wizGoalEx : step === 2 ? fill(t.wizGiftEx, { a: ideas[0] ?? "", b: ideas[1] ?? "" }) : step === 3 ? t.wizColorEx : editing ? null : t.wizReadyBody;
  const canGo = step === 1 ? !otherBad : step !== 2 || gift.trim().length >= 2;

  return (
    <form action={action} className="safe-t safe-b relative mx-auto flex h-dvh max-w-md flex-col overflow-hidden px-[clamp(1rem,5vw,1.5rem)]">
      <style>{`
        @keyframes wz-in-next { from { opacity: 0; transform: translateX(-28px); } to { opacity: 1; transform: none; } }
        @keyframes wz-in-back { from { opacity: 0; transform: translateX(28px); } to { opacity: 1; transform: none; } }
      `}</style>
      {step === 4 && !editing && <Confetti count={60} />}

      {/* the way back, and where we are: three dots */}
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 pt-2">
        {step > 1 || editing ? (
          <button type="button" onClick={() => (step > 1 ? go(step - 1) : router.push(next))} className="press grid size-11 place-items-center rounded-full bg-surface shadow-card" aria-label={t.back}>
            <ChevronRight className="size-5" />
          </button>
        ) : (
          <span className="size-11" />
        )}
        {step <= 3 ? (
          <span className="flex items-center gap-2" aria-label={fill(t.wizStep, { n: step })}>
            {[1, 2, 3].map((n) => (
              <span key={n} className={`h-2 rounded-full transition-all duration-300 ${n === step ? "w-6 bg-brand" : n < step ? "w-2 bg-brand/50" : "w-2 bg-line"}`} />
            ))}
          </span>
        ) : (
          <span className="text-[0.875rem] font-semibold text-muted">{editing ? t.wizEdit : ""}</span>
        )}
        <span className="flex justify-end">{help ? <HelpButton help={help} compact /> : <span className="size-11" />}</span>
      </header>

      {/* the card, the question, the answers and the button: one block, in the middle */}
      <div className="flex min-h-0 flex-1 flex-col justify-center py-[2dvh]">
      <div className={SHRINK}>
        <Pass shop={preview} stamps={step === 4 ? 1 : Math.max(1, Math.round(goal * 0.6))} fresh={step === 4} key={step === 4 ? "ready" : "live"} />
      </div>

      {/* on the smallest phones the answers may need a little more room: they scroll inside, never under the button */}
      <section key={step} className="mt-[3dvh] min-h-0 shrink overflow-y-auto overscroll-contain" style={{ animation: `${back ? "wz-in-back" : "wz-in-next"} 380ms cubic-bezier(0.2,0.8,0.2,1) both` }}>
        <h1 className="text-[1.55rem] font-bold leading-snug">{question}</h1>
        {example && <p className="mt-1.5 text-[0.9375rem] text-muted">{example}</p>}

        {step === 1 && (
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
                  if (!otherBad) go(2);
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

        {step === 2 && (
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
                if (gift.trim().length >= 2) go(3);
              }}
              placeholder={t.wizGiftPh}
              maxLength={60}
              aria-label={t.wizGiftPh}
              className={`mt-2.5 block h-[3.25rem] w-full px-4 text-[16px] outline-none placeholder:text-faint focus:shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-brand)] ${boxLook}`}
            />
          </div>
        )}

        {step === 3 && (
          <div className="mt-[2.4dvh] grid grid-cols-5 justify-items-center gap-3">
            {COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} aria-label={c} aria-pressed={color === c} className="press grid size-12 place-items-center rounded-full text-white" style={{ background: c, boxShadow: color === c ? `0 0 0 3px var(--color-canvas), 0 0 0 5px ${c}` : undefined }}>
                {color === c && <Check className="size-5" strokeWidth={3} />}
              </button>
            ))}
          </div>
        )}

        {step === 4 && note && (
          <p className="mt-[2dvh] flex gap-2.5 rounded-2xl bg-brand-soft px-4 py-3 text-[0.9062rem] font-medium leading-relaxed text-brand-deep" role="status">
            <Info className="mt-0.5 size-[1.125rem] shrink-0" /> {note}
          </p>
        )}
        {state?.error && <p className="mt-3 rounded-2xl bg-coral-soft px-4 py-3 text-[0.9062rem] font-medium text-coral">{state.error}</p>}
      </section>

      <div className="mt-[3.5dvh] shrink-0">
        {/* two different buttons (keys): one patched from "button" to "submit" inside its own click would send the form */}
        {step < 4 ? (
          <Btn key="next" type="button" disabled={!canGo} onClick={() => go(step + 1)}>
            {t.next}
          </Btn>
        ) : (
          <Btn key="send" type="submit" disabled={pending} className={editing ? "" : "animate-breathe"}>
            {pending ? t.checking : editing ? t.save : t.cardDone}
          </Btn>
        )}
      </div>
      </div>

      <input type="hidden" name="goal" value={goal} />
      <input type="hidden" name="gift" value={gift.trim()} />
      <input type="hidden" name="color" value={color} />
      <input type="hidden" name="next" value={next} />
    </form>
  );
}
