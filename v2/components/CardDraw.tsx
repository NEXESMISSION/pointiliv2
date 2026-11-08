"use client";

import { useRouter } from "next/navigation";
import { myCardDraw } from "@/app/actions-draw";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Icon3D } from "@/components/ui";
import { D, giftsLine, leftOf, leftSaid, peopleN, ticketsN, whenSaid, winnersN, type CardDraw as Draw } from "@/lib/draw";
import { fill } from "@/lib/t";

/** the phone's clock, a second at a time — null while the server draws the page */
const useTick = (): number | null =>
  useSyncExternalStore(
    (beat) => {
      const id = setInterval(beat, 1000);
      return () => clearInterval(id);
    },
    () => Math.floor(Date.now() / 1000) * 1000,
    () => null,
  );

export const GOLD = "linear-gradient(135deg,#fff6d3 0%,#ffe08a 38%,#f7c041 72%,#e9a21c 100%)";
const INK = "#5a3700";

/** the four boxes of a countdown: days, hours, minutes, seconds */
export function Countdown({ at, now, dark = false }: { at: string; now: number | null; dark?: boolean }) {
  const l = now === null ? null : leftOf(at, now);
  const cells: [number | null, string][] = [
    [l?.d ?? null, D.units.d],
    [l?.h ?? null, D.units.h],
    [l?.m ?? null, D.units.m],
    [l?.s ?? null, D.units.s],
  ];
  return (
    <div className="grid grid-cols-4 gap-1.5" dir="rtl" role="timer" aria-label={whenSaid(at)}>
      {cells.map(([n, label]) => (
        <span key={label} className={`rounded-[0.75rem] py-1 text-center ${dark ? "bg-white/15" : "bg-white/55"}`}>
          <b className="num block text-[1.25rem] font-bold leading-tight tabular-nums">{n === null ? "–" : String(n).padStart(2, "0")}</b>
          <span className="block text-[0.6875rem] font-semibold opacity-75">{label}</span>
        </span>
      ))}
    </div>
  );
}

/**
 * A card's golden ticket, under the card: a prize won and waiting (show this screen at the counter,
 * its number the same as on the owner's list); else the draw waiting, its countdown and this
 * customer's tickets; else how the last one ended. The first look after a draw this customer was in
 * opens on the result itself — a moment of «السيستام يختار…», then won or not — once (kept on the
 * phone). At the end of the countdown the page asks the server again: the first look draws.
 */
export function CardDraw({ draw }: { draw: NonNullable<Draw> }) {
  const router = useRouter();
  const now = useTick();
  const { open, last, waiting } = draw;

  // the countdown at zero: the draw is made by the next look — asked a moment after, then twice more
  const tries = useRef(0);
  const due = !!open && now !== null && Date.parse(open.draw_at) <= now;
  useEffect(() => {
    if (!due || tries.current >= 3) return;
    const id = setTimeout(() => {
      tries.current += 1;
      router.refresh();
    }, 1500 + tries.current * 3000);
    return () => clearTimeout(id);
  }, [due, now, router]);

  // a shop whose draws are all long past, with nothing of this customer's waiting: nothing to say
  if (!open && !last && !waiting.length) return null;
  return (
    <div className="mx-auto mt-2.5 w-full max-w-[min(100%,52dvh)] shrink-0 space-y-2">
      {waiting.length > 0 && <Won wins={waiting} />}
      {open ? (
        <section className="relative overflow-hidden rounded-[1.25rem] px-3.5 pb-3 pt-2.5 shadow-card" style={{ background: GOLD, color: INK }}>
          <Shine />
          <div className="relative flex items-center gap-2.5">
            <Icon3D name="ticket" size={34} className="shrink-0 animate-float" />
            <span className="min-w-0 flex-1">
              <b className="block truncate text-[0.9375rem] font-bold">{open.title ?? D.cardTitle}</b>
              <span className="block truncate text-[0.75rem] font-semibold opacity-80">{fill(D.cardDrawAt, { when: whenSaid(open.draw_at) })}</span>
              {/* a short screen: the countdown in one line here, in place of its four boxes below */}
              {!due && now !== null && <span className="num hidden truncate text-[0.8125rem] font-bold [@media(max-height:720px)]:block">{leftSaid(open.draw_at, now)}</span>}
            </span>
          </div>
          <p className="relative mt-1.5 truncate text-[0.8125rem] font-semibold">
            🎁 <bdi>{giftsLine(open.gifts)}</bdi>
          </p>
          <div className={`relative mt-2 ${due ? "" : "[@media(max-height:720px)]:hidden"}`}>{due ? <p className="py-2 text-center text-[0.9375rem] font-bold">{D.cardDrawing}</p> : <Countdown at={open.draw_at} now={now} />}</div>
          <p className="relative mt-2 text-center text-[0.8125rem] font-bold">
            {open.rule === "cards" ? D.cardIn : open.mine > 0 ? fill(D.cardMine, { n: ticketsN(open.mine) }) : D.cardNone}
            {open.people > 1 && <span className="font-semibold opacity-75"> · {fill(D.cardPeople, { n: peopleN(open.people) })}</span>}
          </p>
        </section>
      ) : (
        last && !last.won.length && <Lost people={last.people} winners={last.winners} mine={last.mine} />
      )}
      {last && <Reveal last={last} />}
    </div>
  );
}

/**
 * Right after a tampon (the scan's screen): the shop has a draw waiting — this tampon is one more ticket
 * in it, and how many this customer has now. Asked once the screen is up; a shop that never made a draw
 * (nearly every one) answers null and nothing at all is shown.
 */
export function DrawAfterStamp({ cardId, style }: { cardId: string; style?: React.CSSProperties }) {
  const [open, setOpen] = useState<NonNullable<Draw>["open"] | null>(null);
  useEffect(() => {
    let live = true;
    void myCardDraw(cardId)
      .then((d) => live && setOpen(d?.open ?? null))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [cardId]);
  if (!open) return null;
  return (
    <p className="relative mt-2.5 flex w-full max-w-xs animate-pop items-center gap-2.5 overflow-hidden rounded-[1.125rem] px-3.5 py-2.5 text-start shadow-card" style={{ ...style, background: GOLD, color: INK }}>
      <Icon3D name="ticket" size={34} className="shrink-0 animate-float" />
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[0.9375rem] font-bold">{open.rule === "cards" ? D.afterStampIn : D.afterStamp}</b>
        <span className="block truncate text-[0.75rem] font-semibold opacity-80">
          {open.rule === "cards" ? fill(D.afterStampWhen, { when: whenSaid(open.draw_at) }) : fill(D.afterStampSub, { n: ticketsN(open.mine), when: whenSaid(open.draw_at) })}
        </span>
      </span>
    </p>
  );
}

/** a prize won and not taken yet: the gift, how to take it, and its number (the owner's list says the same) */
function Won({ wins }: { wins: { id: number; gift: string }[] }) {
  const one = wins.length === 1 ? wins[0] : null;
  return (
    <section className="relative animate-pop overflow-hidden rounded-[1.25rem] px-3.5 py-3 text-center shadow-card" style={{ background: GOLD, color: INK }}>
      <Shine />
      <p className="relative flex items-center justify-center gap-1.5 text-[0.875rem] font-bold">
        <Icon3D name="trophy" size={26} className="animate-float" /> {D.wonTitle}
      </p>
      {one ? (
        <>
          <p className="relative mt-0.5 truncate text-[1.375rem] font-bold leading-tight">
            <bdi>{one.gift}</bdi>
          </p>
          <p className="relative mt-1 text-[0.8125rem] font-semibold opacity-85">{D.wonShow}</p>
          <p className="num relative mt-1.5 inline-block rounded-full bg-white/60 px-3 py-0.5 text-[0.8125rem] font-bold" dir="ltr">
            {D.wonNo} #{one.id}
          </p>
        </>
      ) : (
        // several prizes (several draws won): one box, each prize on its line with its number
        <>
          <ul className="relative mt-1.5 space-y-1">
            {wins.map((w) => (
              <li key={w.id} className="flex items-center gap-2 rounded-[0.75rem] bg-white/55 px-3 py-1.5 text-start">
                <bdi className="min-w-0 flex-1 truncate text-[1rem] font-bold">{w.gift}</bdi>
                <span className="num shrink-0 text-[0.8125rem] font-bold" dir="ltr">
                  #{w.id}
                </span>
              </li>
            ))}
          </ul>
          <p className="relative mt-1.5 text-[0.8125rem] font-semibold opacity-85">{D.wonShow}</p>
        </>
      )}
    </section>
  );
}

/** the last draw, not won: quietly, who won it and how many were in (to a customer who was not in it: that it happened) */
function Lost({ people, winners, mine }: { people: number; winners: number; mine: number }) {
  const said = fill(D.lostBody, { winners: winnersN(winners), people: peopleN(people) });
  return (
    <p className="rounded-[1rem] bg-surface px-3.5 py-2.5 text-center text-[0.8125rem] font-semibold text-muted shadow-card">
      🎟️ {mine > 0 ? `${D.lostTitle} — ${said}` : fill(D.lastDone, { winners: winnersN(winners), people: peopleN(people) })}
      {mine > 0 && <span className="text-faint"> ({fill(D.lostWasIn, { n: ticketsN(mine) })})</span>}
    </p>
  );
}

/** the gold's light running across it */
function Shine() {
  return <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_0%_0%,rgb(255_255_255/0.55),transparent_55%)]" aria-hidden />;
}

const SEEN = (id: string) => `pl-draw-seen:${id}`;
const seenAlready = (id: string) => {
  try {
    return localStorage.getItem(SEEN(id)) === "1";
  } catch {
    return true;
  }
};

/**
 * The result, the first time it is looked at: over the screen, a moment of the system choosing, then
 * the result — won (the gift) or not. Only for a customer who was in the draw; once per draw, kept on
 * this phone (a phone that keeps nothing: never shown, the card says it anyway).
 */
function Reveal({ last }: { last: NonNullable<NonNullable<Draw>["last"]> }) {
  const won = last.won[0]?.gift ?? null;
  const inIt = last.mine > 0 || !!won;
  // decided after the page is on the phone (the server knows nothing of what this phone saw)
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState<"wait" | "done">("wait");
  useEffect(() => {
    if (!inIt || seenAlready(last.id)) return;
    const a = setTimeout(() => setShow(true), 0);
    const b = setTimeout(() => setPhase("done"), 2200);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [inIt, last.id]);
  if (!show) return null;
  const close = () => {
    try {
      localStorage.setItem(SEEN(last.id), "1");
    } catch {}
    setShow(false);
  };
  return (
    <div className="fixed inset-0 z-50 grid animate-fade place-items-center bg-ink/55 px-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={D.cardTitle}>
      <div className="relative w-full max-w-[20rem] animate-pop overflow-hidden rounded-[1.75rem] px-5 pb-5 pt-6 text-center shadow-[0_30px_60px_-20px_rgb(0_0_0/0.5)]" style={{ background: phase === "done" && !won ? "#ffffff" : GOLD, color: phase === "done" && !won ? undefined : INK }}>
        {phase === "wait" ? (
          <>
            <Icon3D name="ticket" size={96} className="mx-auto animate-breathe" />
            <p className="mt-3 text-[1.0625rem] font-bold">{D.revealWait}</p>
            <p className="mt-1 text-[0.8125rem] font-semibold opacity-75">{fill(D.cardPeople, { n: peopleN(last.people) })}</p>
          </>
        ) : won ? (
          <>
            <Icon3D name="party" size={96} className="mx-auto animate-float" />
            <p className="mt-3 text-[1rem] font-bold">{D.wonTitle}</p>
            <p className="mt-0.5 text-[1.625rem] font-bold leading-tight">
              <bdi>{won}</bdi>
            </p>
            <p className="mt-2 text-[0.8125rem] font-semibold opacity-85">{D.wonShow}</p>
          </>
        ) : (
          <>
            <Icon3D name="sparkles" size={80} className="mx-auto" />
            <p className="mt-3 text-[1.125rem] font-bold text-ink">{D.lostTitle}</p>
            <p className="mt-1 text-[0.875rem] text-muted">{fill(D.lostBody, { winners: winnersN(last.winners), people: peopleN(last.people) })}</p>
          </>
        )}
        {phase === "done" && (
          <button type="button" onClick={close} className="press mt-5 h-12 w-full rounded-[1rem] bg-ink text-[1rem] font-bold text-white">
            {D.revealOk}
          </button>
        )}
      </div>
    </div>
  );
}
