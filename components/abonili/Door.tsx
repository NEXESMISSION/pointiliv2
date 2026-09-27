"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Check, ChevronLeft, DoorOpen, RefreshCw, ScanLine, UserRound } from "lucide-react";
import { abCheckin, abDoorLookup } from "@/app/actions/abonili";
import { time } from "@/lib/abonili/format";
import type { AbMember } from "@/lib/abonili/types";
import { useAb } from "./AbProvider";
import { Scanner } from "./Scanner";
import { StatusPill, Verdict } from "./Verdict";

type Notice = { kind: "in" | "already" | "error"; text: string; at?: string } | null;

/**
 * THE DOOR. One box, for whatever the person at the desk has in front of them:
 * the member says their number, or their name, or holds up their card.
 *
 *   type   → results appear as you type; Enter lets the one match in
 *   scan   → a valid card lets its member in on its own, no extra tap
 *
 * A second entry the same day always asks, because on a séance formule it
 * spends a séance, and a double scan must never take one from the member.
 */
export function Door({ suspended }: { suspended: boolean }) {
  const { a, err, fill, intl } = useAb();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const debounce = useRef<number | undefined>(undefined);
  const seq = useRef(0);

  const [q, setQ] = useState("");
  const [matches, setMatches] = useState<AbMember[] | null>(null);
  const [picked, setPicked] = useState<AbMember | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [scanning, setScanning] = useState(false);
  const [flash, setFlash] = useState(0);
  const [busy, start] = useTransition();

  async function run(text: string, my: number, fromScan: boolean) {
    const r = await abDoorLookup(text);
    if (my !== seq.current) return; // a newer keystroke already asked
    if (!r.ok) {
      setNotice({ kind: "error", text: r.error });
      return;
    }
    setMatches(r.matches);
    const one = r.matches.length === 1 ? r.matches[0]! : null;
    setPicked(one);
    setNotice(null);
    if (fromScan && one && (one.status === "active" || one.status === "soon") && !one.visited_today && !suspended) {
      letIn(one, false);
    }
  }

  function onType(v: string) {
    setQ(v);
    setNotice(null);
    window.clearTimeout(debounce.current);
    const text = v.trim();
    const my = ++seq.current;
    if (!text) {
      setMatches(null);
      setPicked(null);
      return;
    }
    debounce.current = window.setTimeout(() => void run(text, my, false), 200);
  }

  function onScan(text: string) {
    setScanning(false);
    setQ("");
    void run(text, ++seq.current, true);
  }

  function letIn(m: AbMember, force: boolean) {
    start(async () => {
      const r = await abCheckin(m.id, force);
      if (r.ok) {
        setPicked(r.member);
        setMatches([r.member]);
        setNotice({ kind: "in", text: a.door.in, at: new Date().toISOString() });
        setFlash((f) => f + 1);
        setQ("");
        navigator.vibrate?.(30);
        router.refresh();
        input.current?.focus();
        return;
      }
      if (r.member) setPicked(r.member);
      if (r.error === "already_in") setNotice({ kind: "already", text: fill(a.door.alreadyIn, { time: time(r.at ?? r.member?.last_visit, intl) }) });
      else setNotice({ kind: "error", text: err(r.error) });
    });
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") onType("");
    if (e.key === "Enter" && picked && notice?.kind !== "in") {
      const inside = picked.status === "active" || picked.status === "soon";
      if (inside && !picked.visited_today) letIn(picked, false);
    }
  }

  const inside = picked && (picked.status === "active" || picked.status === "soon");
  const already = picked && notice?.kind !== "in" && (notice?.kind === "already" || picked.visited_today);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          ref={input}
          className="ab-input ab-input-xl min-w-0 flex-1"
          value={q}
          onChange={(e) => onType(e.target.value)}
          onKeyDown={onKey}
          placeholder={a.door.placeholder}
          aria-label={a.door.placeholder}
          inputMode="search"
          enterKeyHint="go"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <button type="button" className="ab-btn ab-btn-xl shrink-0 px-5" onClick={() => setScanning(true)} aria-label={a.door.scan}>
          <ScanLine aria-hidden />
          <span className="hidden sm:inline">{a.door.scan}</span>
        </button>
      </div>

      {notice?.kind === "error" && !picked && <p className="ab-alert">{notice.text}</p>}

      {picked ? (
        <Verdict m={picked} flash={flash > 0 && notice?.kind === "in"} key={`${picked.id}-${flash}`}>
          {notice?.kind === "in" ? (
            <div className="ab-btn ab-btn-xl ab-btn-block" role="status" style={{ pointerEvents: "none" }}>
              <Check aria-hidden />
              {a.door.in} · <span className="ab-ltr">{time(notice.at, intl)}</span>
            </div>
          ) : inside ? (
            already ? (
              <div className="space-y-3">
                <p className="text-[16px] font-bold" style={{ color: "var(--ab-amber)" }}>
                  {notice?.kind === "already" ? notice.text : fill(a.door.alreadyIn, { time: time(picked.last_visit, intl) })}
                </p>
                <button type="button" className="ab-btn ab-btn-ghost ab-btn-block" disabled={busy || suspended} onClick={() => letIn(picked, true)}>
                  {a.door.letInAgain}
                </button>
              </div>
            ) : (
              <button type="button" className="ab-btn ab-btn-xl ab-btn-block" disabled={busy || suspended} onClick={() => letIn(picked, false)}>
                <DoorOpen aria-hidden />
                {a.door.letIn}
              </button>
            )
          ) : (
            <Link className="ab-btn ab-btn-xl ab-btn-block" href={`/abonili/members/${picked.id}?renew=1`}>
              <RefreshCw aria-hidden />
              {a.door.renew}
            </Link>
          )}

          {notice?.kind === "error" && <p className="ab-alert mt-3">{notice.text}</p>}

          <div className="mt-3 flex gap-2">
            {matches && matches.length > 1 && notice?.kind !== "in" && (
              <button type="button" className="ab-btn ab-btn-quiet ab-btn-sm" onClick={() => setPicked(null)}>
                <ChevronLeft aria-hidden className="rtl:rotate-180" />
                {a.door.pick}
              </button>
            )}
            <Link href={`/abonili/members/${picked.id}`} className="ab-btn ab-btn-quiet ab-btn-sm flex-1">
              <UserRound aria-hidden />
              {a.door.open}
            </Link>
          </div>
        </Verdict>
      ) : matches && matches.length === 0 ? (
        <p className="ab-panel p-5 text-[16px] ab-dim">{fill(a.door.nothing, { q: q.trim() })}</p>
      ) : matches && matches.length > 1 ? (
        <div className="ab-panel ab-divide overflow-hidden">
          <p className="px-4 pt-3 pb-2 text-[13px] font-semibold ab-faint">{a.door.pick}</p>
          {matches.map((m) => (
            <button key={m.id} type="button" className="ab-row w-full text-start hover:bg-[var(--ab-surface-2)]" onClick={() => setPicked(m)}>
              <span className="ab-code">{m.code}</span>
              <span className="ab-grow">
                <span className="ab-trunc block text-[16px] font-bold" dir="auto">{m.name}</span>
                <span className="ab-trunc block text-[13px] ab-faint" dir="auto">{m.plan_name ?? "—"}</span>
              </span>
              <StatusPill status={m.status} />
            </button>
          ))}
        </div>
      ) : null}

      {scanning && <Scanner onRead={onScan} onClose={() => setScanning(false)} />}
    </div>
  );
}
