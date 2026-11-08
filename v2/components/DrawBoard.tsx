"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { Check, MessageCircle, Minus, Plus, Trophy, X } from "lucide-react";
import { drawCancel, drawGive, drawNew } from "@/app/actions-draw";
import { AtZero, Countdown, GOLD, useAtZero } from "@/components/CardDraw";
import { Top } from "@/components/Top";
import { useScreen } from "@/components/Tracker";
import { Btn, Icon3D } from "@/components/ui";
import { D, giftsLine, peopleN, ticketsN, tunisDate, whenSaid, winnersOf, type DrawRule, type OwnerDraw } from "@/lib/draw";
import { fill } from "@/lib/t";

const INK = "#5a3700";
const box = "rounded-[1.25rem] bg-surface p-3.5 shadow-card";
const useTick = (): number | null =>
  useSyncExternalStore(
    (beat) => {
      const id = setInterval(beat, 1000);
      return () => clearInterval(id);
    },
    () => Math.floor(Date.now() / 1000) * 1000,
    () => null,
  );

const ERR: Record<string, string> = {
  bad_time: D.errBadTime,
  bad_gifts: D.errBadGifts,
  one_open: D.errOneOpen,
  paused: D.errPaused,
  no_card: D.errNoCard,
  not_allowed: D.errNotAllowed,
  too_many: D.errTooMany,
};

/**
 * The owner's golden ticket: the draw waiting — its countdown, how many are in it so far, the
 * message to send the customers, the way to call it off — or a new one to make; then the winners
 * of the last one, each handed their prize here («سلّم»: the customer shows their card, its number
 * is the one on this list), the prizes of older draws still to hand over, and the draws before.
 */
export function DrawBoard({ draw, shop }: { draw: OwnerDraw; shop: { name: string } }) {
  useScreen("draw");
  const lastWins = draw.last ? draw.wins.filter((w) => w.draw === draw.last!.id) : [];
  const olderWaiting = draw.wins.filter((w) => !w.given_at && w.draw !== draw.last?.id);
  // the draws before: the last one has its own card above, so not twice
  const past = draw.past.filter((p) => p.id !== draw.last?.id);
  return (
    <>
      <Top back="/shop" title={D.name} hint={D.ownerHint} />
      <div data-list className="-mx-1 mt-[1.5dvh] min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-1 pb-4">
        {draw.open ? <Open open={draw.open} shop={shop.name} /> : draw.allowed && draw.card ? <NewDraw /> : null}
        {draw.last && <Results last={draw.last} wins={lastWins} shop={shop.name} />}
        {olderWaiting.length > 0 && (
          <section className={box}>
            <h2 className="text-[0.9375rem] font-bold">{D.toGive}</h2>
            <ul className="mt-1 divide-y divide-line">
              {olderWaiting.map((w) => (
                <WinRow key={w.id} w={w} />
              ))}
            </ul>
          </section>
        )}
        {past.length > 0 && (
          <section className={box}>
            <h2 className="text-[0.9375rem] font-bold">{D.past}</h2>
            <ul className="mt-1 divide-y divide-line">
              {past.map((p) => (
                <li key={p.id} className="flex items-center gap-2 py-2 text-[0.8125rem]">
                  <span className="min-w-0 flex-1 truncate font-semibold text-ink">{p.title ?? whenSaid(p.draw_at)}</span>
                  {p.status === "cancelled" ? (
                    <span className="shrink-0 rounded-full bg-canvas px-2 py-0.5 font-bold text-muted">{D.pastCancelled}</span>
                  ) : (
                    <span className="flex shrink-0 items-center gap-1 font-bold text-brand">
                      <Trophy className="size-3.5" /> <span className="num">{p.winners}</span>
                      {p.people !== null && <span className="font-semibold text-muted">/ {peopleN(p.people)}</span>}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}

/** the draw waiting: the countdown, the gifts, who is in it so far, the message to send, the way to call it off */
function Open({ open, shop }: { open: NonNullable<OwnerDraw["open"]>; shop: string }) {
  const router = useRouter();
  const now = useTick();
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const due = now !== null && Date.parse(open.draw_at) <= now;
  // at zero: the page asked again — this look draws it
  const zero = useAtZero(due);

  const msg = fill(D.shareMsg, { shop, when: whenSaid(open.draw_at), gifts: giftsLine(open.gifts), how: open.rule === "cards" ? D.shareHowCards : D.shareHowStamps });
  return (
    <section className="relative overflow-hidden rounded-[1.5rem] p-4 shadow-card" style={{ background: GOLD, color: INK }}>
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_0%_0%,rgb(255_255_255/0.55),transparent_55%)]" aria-hidden />
      <div className="relative">
        <p className="flex items-center gap-2 text-[0.8125rem] font-bold">
          <span className="size-2 animate-breathe rounded-full bg-[#c0392b]" aria-hidden /> {D.live}
        </p>
        <div className="mt-1 flex items-center gap-2.5">
          <Icon3D name="ticket" size={44} className="shrink-0 animate-float" />
          <span className="min-w-0 flex-1">
            <b className="block truncate text-[1.125rem] font-bold leading-tight">{open.title ?? D.name}</b>
            <span className="block truncate text-[0.8125rem] font-semibold opacity-80">{fill(D.liveAt, { when: whenSaid(open.draw_at) })}</span>
          </span>
        </div>
        <p className="mt-2 text-[0.875rem] font-semibold">
          🎁 <bdi>{giftsLine(open.gifts)}</bdi>
        </p>
        <div className="mt-2.5">{due ? <AtZero text={D.drawing} big {...zero} /> : <Countdown at={open.draw_at} now={now} />}</div>
        <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-center">
          <span className="rounded-[0.875rem] bg-white/55 py-1.5">
            <b className="num block text-[1.375rem] font-bold leading-tight">{open.people}</b>
            <span className="text-[0.75rem] font-semibold opacity-80">{D.livePeople}</span>
          </span>
          <span className="rounded-[0.875rem] bg-white/55 py-1.5">
            <b className="num block text-[1.375rem] font-bold leading-tight">{open.tickets}</b>
            <span className="text-[0.75rem] font-semibold opacity-80">{D.liveTickets}</span>
          </span>
        </div>
        <p className="mt-2 text-center text-[0.75rem] font-semibold opacity-80">{open.rule === "cards" ? D.ruleCards : D.ruleStamps}</p>
        {/* who is in it so far, the most tickets first: opened on a tap (the owner checks his draw is real) */}
        <details className="mt-2 rounded-[0.875rem] bg-white/55 px-3 py-2 [&_summary::-webkit-details-marker]:hidden">
          <summary className="cursor-pointer list-none text-center text-[0.8125rem] font-bold">{fill(D.poolTitle, { n: open.people })} ▾</summary>
          {open.pool && open.pool.length > 0 ? (
            <ul className="mt-1.5 max-h-48 space-y-1 overflow-y-auto">
              {open.pool.map((p, i) => (
                <li key={i} className="flex items-center gap-2 text-[0.8125rem]">
                  <bdi className="min-w-0 flex-1 truncate font-semibold">{p.name ?? D.someone}</bdi>
                  {p.phone && (
                    <bdi dir="ltr" className="shrink-0 opacity-70">
                      {p.phone}
                    </bdi>
                  )}
                  <span className="shrink-0 rounded-full bg-white/80 px-2 font-bold">{ticketsN(p.tickets)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-center text-[0.75rem] font-semibold opacity-75">{D.poolNone}</p>
          )}
        </details>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(msg)}`}
          target="_blank"
          rel="noreferrer"
          className="press mt-3 flex h-12 items-center justify-center gap-2 rounded-[1rem] bg-[#25D366] text-[0.9375rem] font-bold text-white"
        >
          <MessageCircle className="size-5" /> {D.share}
        </a>
        {asking ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-[0.875rem] bg-white/70 p-2.5">
            <span className="min-w-0 flex-1 text-[0.8125rem] font-semibold">{D.cancelAsk}</span>
            <button type="button" onClick={() => setAsking(false)} className="h-8 rounded-[0.5rem] bg-surface px-3 text-[0.8125rem] font-semibold text-body ring-1 ring-line">
              {D.no}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const ok = await drawCancel(open.id);
                  setError(ok ? null : D.err);
                  setAsking(false);
                  if (ok) router.refresh();
                })
              }
              className="h-8 rounded-[0.5rem] bg-coral px-3 text-[0.8125rem] font-bold text-white disabled:opacity-60"
            >
              {pending ? "…" : D.yes}
            </button>
          </div>
        ) : (
          !due && (
            <button type="button" onClick={() => setAsking(true)} className="mt-1.5 w-full py-1.5 text-center text-[0.8125rem] font-bold opacity-75">
              {D.cancel}
            </button>
          )
        )}
        {error && <p className="mt-1 text-center text-[0.8125rem] font-bold text-coral">{error}</p>}
      </div>
    </section>
  );
}

type GiftRow = { key: string; name: string; n: number };

/** a new draw: its gifts (and how many winners each), the day and the hour, who is in it */
function NewDraw() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [gifts, setGifts] = useState<GiftRow[]>([{ key: "g0", name: "", n: 1 }]);
  const [date, setDate] = useState(() => tunisDate(7));
  const [time, setTime] = useState("20:00");
  const [rule, setRule] = useState<DrawRule>("stamps");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const named = gifts.filter((g) => g.name.trim());
  const set = (key: string, patch: Partial<GiftRow>) => setGifts(gifts.map((g) => (g.key === key ? { ...g, ...patch } : g)));
  const submit = () =>
    start(async () => {
      const res = await drawNew({ title, date, time, rule, gifts: named.map((g) => ({ name: g.name, n: g.n })) });
      if (!res.ok) {
        setError(ERR[res.error] ?? D.err);
        return;
      }
      setError(null);
      router.refresh();
    });
  const chips = [
    { label: "غدوة", d: 1 },
    { label: "بعد 3 أيّام", d: 3 },
    { label: "بعد جمعة", d: 7 },
  ];
  const label = "mb-1.5 block px-0.5 text-[0.8125rem] font-bold text-muted";
  const input = "h-11 w-full rounded-[0.875rem] bg-canvas px-3 text-[0.9375rem] font-semibold outline-none focus:ring-2 focus:ring-brand/40";

  return (
    <section className={`${box} space-y-3.5`}>
      <h2 className="flex items-center gap-2 text-[1.0625rem] font-bold">
        <Icon3D name="ticket" size={28} /> {D.newTitle}
      </h2>

      <div>
        <span className={label}>{D.giftsLabel}</span>
        <ul className="space-y-1.5">
          {gifts.map((g, i) => (
            <li key={g.key} className="flex items-center gap-1.5">
              <input value={g.name} onChange={(e) => set(g.key, { name: e.target.value.slice(0, 40) })} placeholder={i === 0 ? "مثلا: قهوة بلاش لمدّة جمعة" : D.giftPh} aria-label={D.giftPh} className={`${input} min-w-0 flex-1`} />
              <span className="flex shrink-0 items-center gap-0.5" dir="ltr" aria-label={D.giftHow}>
                <button type="button" onClick={() => set(g.key, { n: Math.max(1, g.n - 1) })} className="press grid size-9 place-items-center rounded-full bg-canvas" aria-label="-1">
                  <Minus className="size-4" />
                </button>
                <span className="num w-8 text-center text-[1rem] font-bold text-brand">{g.n}</span>
                <button type="button" onClick={() => set(g.key, { n: Math.min(50, g.n + 1) })} className="press grid size-9 place-items-center rounded-full bg-canvas" aria-label="+1">
                  <Plus className="size-4" />
                </button>
              </span>
              {gifts.length > 1 && (
                <button type="button" onClick={() => setGifts(gifts.filter((x) => x.key !== g.key))} className="press grid size-8 shrink-0 place-items-center rounded-full text-muted" aria-label="X">
                  <X className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
        {gifts.length < 10 && (
          <button type="button" onClick={() => setGifts([...gifts, { key: `g${Date.now()}`, name: "", n: 1 }])} className="press mt-1.5 flex h-10 w-full items-center justify-center gap-1 rounded-[0.875rem] border-2 border-dashed border-line text-[0.875rem] font-bold text-brand">
            <Plus className="size-4" /> {D.giftAdd}
          </button>
        )}
        {named.length > 0 && <p className="mt-1 px-0.5 text-[0.75rem] font-semibold text-muted">{fill("{n} في الكل", { n: winnersOf(named) === 1 ? "رابح واحد" : `${winnersOf(named)} رابحين` })}</p>}
      </div>

      <div>
        <span className={label}>{D.whenLabel}</span>
        <div className="mb-1.5 flex gap-1.5">
          {chips.map((c) => {
            const d = tunisDate(c.d);
            return (
              <button key={c.d} type="button" onClick={() => setDate(d)} className={`press h-8 rounded-full px-3 text-[0.8125rem] font-bold ${date === d ? "bg-brand text-white" : "bg-brand-soft text-brand"}`}>
                {c.label}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-1.5">
          <input type="date" value={date} min={tunisDate(0)} max={tunisDate(89)} onChange={(e) => setDate(e.target.value)} aria-label={D.dateLabel} className={input} />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label={D.timeLabel} className={`${input} w-[7.5rem]`} />
        </div>
      </div>

      <div>
        <span className={label}>{D.ruleLabel}</span>
        <div className="space-y-1.5">
          {(
            [
              ["stamps", D.ruleStamps, D.ruleStampsSub],
              ["cards", D.ruleCards, D.ruleCardsSub],
            ] as const
          ).map(([id, title, sub]) => (
            <button
              key={id}
              type="button"
              onClick={() => setRule(id)}
              aria-pressed={rule === id}
              aria-label={title}
              className={`press flex w-full items-center gap-3 rounded-[0.875rem] p-3 text-start ${rule === id ? "bg-brand-soft ring-2 ring-brand" : "bg-canvas"}`}
            >
              <span className={`grid size-5 shrink-0 place-items-center rounded-full ${rule === id ? "bg-brand text-white" : "bg-surface ring-1 ring-line"}`}>{rule === id && <Check className="size-3.5" strokeWidth={3} />}</span>
              <span className="min-w-0 flex-1">
                <b className="block text-[0.9062rem]">{title}</b>
                <span className="block text-[0.75rem] leading-snug text-muted">{sub}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className={label}>{D.titleLabel}</span>
        <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 40))} placeholder={D.titlePh} className={input} />
      </label>

      {error && <p className="text-center text-[0.8125rem] font-semibold text-coral">{error}</p>}
      <Btn type="button" onClick={submit} disabled={pending || named.length === 0 || !date || !time}>
        {pending ? D.starting : D.start}
      </Btn>
    </section>
  );
}

/** the last draw: when, how many were in, and its winners — each one's prize handed over here — and the
 *  winners said to everyone on WhatsApp (first names only: the numbers stay the shop's) */
function Results({ last, wins, shop }: { last: NonNullable<OwnerDraw["last"]>; wins: OwnerDraw["wins"]; shop: string }) {
  const lines = wins.map((w) => fill(D.winnersLine, { gift: w.gift, name: (w.name ?? "").split(" ")[0] || D.someone }));
  const msg = fill(D.winnersMsg, { shop, title: last.title ?? D.name, lines: lines.join("\n") });
  return (
    <section className={box}>
      <h2 className="flex items-center gap-2 text-[1rem] font-bold">
        <Icon3D name="trophy" size={26} /> {D.results}
      </h2>
      <p className="mt-0.5 text-[0.8125rem] text-muted">
        {last.title ? `${last.title} · ` : ""}
        {fill(D.resultsOf, { when: whenSaid(last.draw_at) })} · {last.people === 1 ? fill(D.resultsPoolOne, { tickets: ticketsN(last.tickets ?? 0) }) : fill(D.resultsPool, { people: peopleN(last.people ?? 0), tickets: ticketsN(last.tickets ?? 0) })}
      </p>
      {wins.length === 0 ? (
        <p className="mt-2 rounded-[0.875rem] bg-canvas px-3 py-2.5 text-center text-[0.875rem] text-muted">{D.nobody}</p>
      ) : (
        <>
          <ul className="mt-1 divide-y divide-line">
            {wins.map((w) => (
              <WinRow key={w.id} w={w} />
            ))}
          </ul>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(msg)}`}
            target="_blank"
            rel="noreferrer"
            className="press mt-2 flex h-11 items-center justify-center gap-2 rounded-[0.875rem] bg-[#25D366] text-[0.875rem] font-bold text-white"
          >
            <MessageCircle className="size-4" /> {D.winnersShare}
          </a>
        </>
      )}
    </section>
  );
}

/** one winner: the gift, who (their name and the end of their number), the number their card shows, and «سلّم» */
function WinRow({ w }: { w: OwnerDraw["wins"][number] }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);
  const who = w.name ?? w.phone ?? "؟";
  return (
    <li className="py-2.5">
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-full" style={{ background: GOLD }}>
          <Trophy className="size-4" style={{ color: INK }} />
        </span>
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[0.9375rem] text-ink">
            <bdi>{w.gift}</bdi>
          </b>
          <span className="block truncate text-[0.75rem] text-muted">
            <bdi>{w.name ?? ""}</bdi> {w.phone && <bdi dir="ltr">{w.phone}</bdi>} · <span className="num">#{w.id}</span> · {ticketsN(w.tickets)}
          </span>
        </span>
        {w.given_at ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-mint-soft px-2.5 py-1 text-[0.75rem] font-bold text-mint">
            <Check className="size-3.5" strokeWidth={3} /> {D.given}
          </span>
        ) : (
          <button type="button" onClick={() => setAsking(!asking)} className="press h-9 shrink-0 rounded-[0.75rem] bg-brand px-3.5 text-[0.8125rem] font-bold text-white">
            {D.give}
          </button>
        )}
      </div>
      {asking && !w.given_at && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-[0.75rem] bg-canvas p-2.5">
          <span className="min-w-0 flex-1 text-[0.8125rem] font-semibold text-ink">{fill(D.giveAsk, { gift: w.gift, name: who })}</span>
          <button type="button" onClick={() => setAsking(false)} className="h-8 rounded-[0.5rem] bg-surface px-3 text-[0.8125rem] font-semibold text-body ring-1 ring-line">
            {D.no}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const ok = await drawGive(w.id);
                setError(!ok);
                setAsking(false);
                if (ok) router.refresh();
              })
            }
            className="h-8 rounded-[0.5rem] bg-brand px-3 text-[0.8125rem] font-bold text-white disabled:opacity-60"
          >
            {pending ? "…" : D.yes}
          </button>
        </div>
      )}
      {error && <p className="mt-1 text-[0.75rem] font-semibold text-coral">{D.err}</p>}
    </li>
  );
}
