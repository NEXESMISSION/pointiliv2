"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Copy, KeyRound, MessageCircle, Plus, Search, Store, Trash2, UserPlus, X } from "lucide-react";
import { adminBookAdd, adminBookDelete, adminResetPassword, adminSweepRobots, adminTester } from "@/app/actions";
import { adminFind, type Found } from "@/app/admin/actions";
import { digits, spaced } from "@/lib/phone";
import { fill, t } from "@/lib/t";

const NOT_DONE = "ما تعدّاتش، عاود.";
const field = "h-11 w-full rounded-[0.75rem] bg-surface px-3 text-[16px] text-ink outline-none ring-1 ring-line placeholder:text-faint focus:ring-2 focus:ring-brand";
const quiet = "press inline-flex h-10 items-center justify-center gap-1.5 rounded-[0.75rem] bg-surface px-3.5 text-[0.875rem] font-semibold text-body ring-1 ring-line disabled:opacity-60";

/**
 * Someone forgot their password: found by a name or a number, and given a new
 * one — eight digits, shown once, sent on WhatsApp in one tap (every phone
 * signed in with the old one is signed out).
 */
export function AdminFind({ initial = "" }: { initial?: string }) {
  const [q, setQ] = useState(initial);
  const [found, setFound] = useState<Found[] | null>(null);
  const [pending, start] = useTransition();
  const [reset, setReset] = useState<{ who: Found; password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const look = () =>
    start(async () => {
      setReset(null);
      setFound(await adminFind(q).catch(() => []));
    });
  const give = (who: Found) =>
    start(async () => {
      const res = await adminResetPassword(who.id).catch(() => ({ ok: false, password: undefined }));
      setError(res.ok ? null : NOT_DONE);
      if (res.ok && res.password) setReset({ who, password: res.password });
    });
  // opened with a number (/admin/tools?q=<number>): that account, found at once
  const asked = useRef(false);
  useEffect(() => {
    if (!initial || asked.current) return;
    asked.current = true;
    adminFind(initial)
      .then(setFound)
      .catch(() => setFound([]));
  }, [initial]);

  if (reset) {
    const d = digits(reset.who.phone ?? "");
    const wa = /^\d{8}$/.test(d) ? `https://wa.me/216${d}?text=${encodeURIComponent(fill(t.aResetMsg, { name: reset.who.name || "", password: reset.password }))}` : null;
    return (
      <div className="rounded-[0.875rem] bg-canvas/70 p-4 text-center">
        <p className="text-[0.8125rem] font-semibold text-muted">
          {t.aResetDone} · <bdi>{reset.who.name || "—"}</bdi>
        </p>
        <p className="num mt-1 text-[2rem] font-bold tracking-[0.14em] text-ink" dir="ltr">
          {reset.password}
        </p>
        <p className="mt-0.5 text-[0.75rem] text-muted">{t.aResetHint}</p>
        <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-2">
          {wa ? (
            <a href={wa} target="_blank" rel="noreferrer" className="press flex h-10 items-center justify-center gap-1.5 rounded-[0.75rem] bg-[#25D366] text-[0.875rem] font-bold text-white">
              <MessageCircle className="size-4" /> {t.aResetSend}
            </a>
          ) : (
            <span />
          )}
          <button type="button" onClick={() => void navigator.clipboard?.writeText(reset.password)} className="grid size-10 place-items-center rounded-[0.75rem] bg-brand-soft text-brand" aria-label="انسخ">
            <Copy className="size-4" />
          </button>
          <button type="button" onClick={() => setReset(null)} className="grid size-10 place-items-center rounded-[0.75rem] bg-surface text-muted ring-1 ring-line" aria-label="سكّر">
            <X className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          look();
        }}
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="اسم ولا نومرو" aria-label="اسم ولا نومرو" className={field} />
        <button type="submit" disabled={pending || q.trim().length < 2} className="press grid size-11 shrink-0 place-items-center rounded-[0.75rem] bg-brand text-white disabled:opacity-50" aria-label="لوّج">
          <Search className="size-5" />
        </button>
      </form>
      {found && found.length === 0 && <p className="px-1 text-[0.875rem] text-muted">ما لقينا حتى كونت</p>}
      {found?.map((p) => (
        <div key={p.id} className="flex items-center gap-3 rounded-[0.875rem] bg-canvas/70 px-3 py-2.5">
          <span className="min-w-0 flex-1">
            <b className="block truncate text-[0.9062rem] text-ink">
              <bdi>{p.name || "بلا اسم"}</bdi>
            </b>
            <span className="block truncate text-[0.75rem] text-muted">
              {p.phone && (
                <bdi dir="ltr" className="num">
                  {spaced(p.phone)}
                </bdi>
              )}
              {" · "}
              {p.shop ? (
                <>
                  مولى <bdi>{p.shop}</bdi>
                </>
              ) : p.cards ? (
                `حريف · ${p.cards === 1 ? "كارط وحدة" : `${p.cards} كارطات`}`
              ) : (
                "حتى كارط"
              )}
            </span>
          </span>
          {!p.admin && (
            <button type="button" disabled={pending} onClick={() => give(p)} className={quiet}>
              <KeyRound className="size-4" /> كلمة سر
            </button>
          )}
        </div>
      ))}
      {error && <p className="text-[0.8125rem] font-semibold text-coral">{error}</p>}
    </div>
  );
}

type Side = "in" | "out";
/** what a line is about, each side its own kinds (the books' labels) */
const KINDS: Record<Side, string[]> = { in: ["service", "sub", "other"], out: ["ads", "tools", "print", "move", "people", "other"] };

/**
 * A line in the books by the founder's hand: mostly what the business spent
 * (an ad, a tool, printing), or what came in that no subscription wrote by
 * itself — on what, how much (millimes allowed), which day, its kind.
 */
export function AdminBookAdd({ today }: { today: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [side, setSide] = useState<Side>("out");
  const [what, setWhat] = useState("");
  const [amount, setAmount] = useState("");
  const [on, setOn] = useState(today);
  const [kind, setKind] = useState("ads");
  const [error, setError] = useState<string | null>(null);
  const sum = Number(amount.replace(",", "."));
  const can = what.trim().length >= 2 && sum > 0 && sum <= 1_000_000 && /^\d{4}-\d{2}-\d{2}$/.test(on) && on <= today;

  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${quiet} w-full`}>
        <Plus className="size-4" /> اكتب خط في الحسابات
      </button>
    );
  return (
    <form
      className="space-y-2.5 rounded-[0.875rem] bg-canvas/70 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!can) return;
        start(async () => {
          const res = await adminBookAdd(side, what, sum, on, kind).catch(() => ({ ok: false }));
          if (!res.ok) return setError(NOT_DONE);
          setError(null);
          setWhat("");
          setAmount("");
        });
      }}
    >
      <div className="grid grid-cols-2 gap-1 rounded-[0.75rem] bg-ink/[0.05] p-1">
        {(["out", "in"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setSide(s);
              setKind(KINDS[s][0]);
            }}
            className={`h-9 rounded-[0.5rem] text-[0.8438rem] font-bold ${side === s ? "bg-surface text-ink shadow-sm" : "text-muted"}`}
          >
            {s === "out" ? "مصروف" : "دخل"}
          </button>
        ))}
      </div>
      <input value={what} onChange={(e) => setWhat(e.target.value.slice(0, 120))} placeholder={side === "out" ? "على شنوّة؟ (مثلا: إشهار فيسبوك)" : "منين؟ (مثلا: خدمة)"} aria-label="على شنوّة" className={field} />
      <div className="grid grid-cols-2 gap-2">
        <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, "").slice(0, 10))} inputMode="decimal" placeholder={`قدّاش (${t.payCurrency})`} aria-label="قدّاش" className={field} />
        <input type="date" value={on} max={today} onChange={(e) => setOn(e.target.value)} aria-label="النهار" dir="ltr" className={field} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {KINDS[side].map((k) => (
          <button key={k} type="button" onClick={() => setKind(k)} className={`h-8 rounded-full px-3 text-[0.8125rem] font-bold ${kind === k ? "bg-ink text-white" : "bg-surface text-body ring-1 ring-line"}`}>
            {t.aBookKinds[k]}
          </button>
        ))}
      </div>
      {error && <p className="text-[0.8125rem] font-semibold text-coral">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending || !can} className="press flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[0.75rem] bg-brand text-[0.875rem] font-bold text-white disabled:opacity-50">
          {pending ? "…" : "سجّل"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={quiet}>
          {t.back}
        </button>
      </div>
    </form>
  );
}

/** A line of the books taken back: asked once, in place. */
export function AdminBookDelete({ id }: { id: number }) {
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();
  if (!asking)
    return (
      <button type="button" onClick={() => setAsking(true)} className="grid size-8 shrink-0 place-items-center rounded-full text-faint hover:bg-coral-soft hover:text-coral" aria-label="امسح الخط">
        <Trash2 className="size-4" />
      </button>
    );
  return (
    <span className="flex shrink-0 items-center gap-1">
      <button type="button" onClick={() => setAsking(false)} className="h-8 rounded-[0.5rem] px-2 text-[0.75rem] font-semibold text-muted">
        لا
      </button>
      <button type="button" disabled={pending} onClick={() => start(async () => void (await adminBookDelete(id)))} className="h-8 rounded-[0.5rem] bg-coral px-2.5 text-[0.75rem] font-bold text-white disabled:opacity-60">
        امسح
      </button>
    </span>
  );
}

/** The test account's three starting points, one button each; the line under them says it worked. */
export function AdminTester() {
  const [pending, start] = useTransition();
  const [done, setDone] = useState<string | null>(null);
  const go = (mode: "fresh" | "new" | "owner") =>
    start(async () => {
      setDone(null);
      const res = await adminTester(mode).catch(() => "error" as const);
      setDone(res === "ok" ? t.aTesterDone : res === "no_account" ? t.aTesterNoAccount : t.errNetwork);
    });
  const modes = [
    { id: "fresh" as const, label: t.aTesterFresh, hint: t.aTesterFreshHint, icon: Trash2 },
    { id: "new" as const, label: t.aTesterNew, hint: t.aTesterNewHint, icon: UserPlus },
    { id: "owner" as const, label: t.aTesterOwner, hint: t.aTesterOwnerHint, icon: Store },
  ];
  return (
    <div className="space-y-2">
      {modes.map((m) => (
        <button key={m.id} type="button" disabled={pending} onClick={() => go(m.id)} className="press flex w-full items-center gap-3 rounded-[0.875rem] bg-canvas/70 px-3 py-2.5 text-start disabled:opacity-60">
          <m.icon className="size-5 shrink-0 text-brand" />
          <span className="min-w-0 flex-1">
            <b className="block text-[0.9062rem] text-ink">{m.label}</b>
            <span className="block text-[0.75rem] text-muted">{m.hint}</span>
          </span>
        </button>
      ))}
      {done && <p className="px-1 text-[0.8438rem] font-semibold text-mint">{done}</p>}
    </div>
  );
}

/** The scripts' leftover accounts: how many are still there, and one button that removes them all. */
export function AdminRobots({ left }: { left: number }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState<string | null>(null);
  if (left === 0)
    return (
      <p className="flex items-center gap-1.5 text-[0.8438rem] font-semibold text-mint">
        <Check className="size-4" strokeWidth={3} /> {done ?? t.aRobotsNone}
      </p>
    );
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[0.875rem] font-semibold text-ink">{fill(t.aRobotsLeft, { n: left })}</span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const n = await adminSweepRobots();
            setDone(n === null ? t.errNetwork : t.aRobotsDone);
          })
        }
        className={`${quiet} text-coral`}
      >
        <Trash2 className="size-4" /> {t.aRobotsSweep}
      </button>
    </div>
  );
}
