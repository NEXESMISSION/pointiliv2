"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, LogOut } from "lucide-react";
import { staffJoin, staffLeave } from "@/app/actions-packs";
import { ShopMark } from "@/components/ShopMark";
import { useScreen } from "@/components/Tracker";
import { Btn } from "@/components/ui";
import { P } from "@/lib/packs";
import { fill } from "@/lib/t";

/** A staff phone leaves the shop itself: asked once, then gone (the owner can send a new link). */
export function StaffLeave({ shop }: { shop: string }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();
  if (!asking)
    return (
      <button type="button" onClick={() => setAsking(true)} className="mx-auto flex items-center gap-1.5 py-2 text-[0.8125rem] font-semibold text-muted">
        <LogOut className="size-4" /> {P.staffLeave}
      </button>
    );
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[1rem] bg-surface p-3 shadow-card">
      <span className="min-w-0 flex-1 text-[0.8125rem] font-semibold">{fill(P.staffLeaveAsk, { shop })}</span>
      <button type="button" onClick={() => setAsking(false)} className="h-8 rounded-[0.5rem] bg-canvas px-3 text-[0.8125rem] font-semibold text-body">
        {P.cancel}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await staffLeave();
            router.push("/");
          })
        }
        className="h-8 rounded-[0.5rem] bg-coral px-3 text-[0.8125rem] font-bold text-white disabled:opacity-60"
      >
        {pending ? "…" : "إيه"}
      </button>
    </div>
  );
}

type Peek = { ok: boolean; error?: string; shop?: string; kind?: string; color?: string; logo?: string | null; state?: "open" | "used" | "expired" | "mine" } | null;

/**
 * An invite opened on the staff phone, signed in: the shop it is for, and one button to join — or, when
 * it will not do, why (used, expired; an owner of a shop cannot be staff with the same account).
 */
export function StaffJoin({ token, peek, owner }: { token: string; peek: Peek; owner: boolean }) {
  useScreen("staff-join");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const bad = !peek?.ok ? (P.joinErr[peek?.error ?? "invalid"] ?? P.joinErr.invalid) : peek.state === "used" ? P.joinErr.used : peek.state === "expired" ? P.joinErr.expired : owner ? P.joinErr.owner : null;
  const join = () =>
    start(async () => {
      const res = await staffJoin(token);
      if (!res.ok) return setError(P.joinErr[res.error] ?? P.err);
      setDone(res.shop);
      setTimeout(() => router.push("/staff"), 900);
    });
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      {peek?.ok && (
        <span className="grid size-20 place-items-center overflow-hidden rounded-full shadow-card" style={{ background: peek.color ?? "#6c47ff" }}>
          <ShopMark shop={{ kind: peek.kind ?? "other", logo: peek.logo ?? null }} size={48} />
        </span>
      )}
      <h1 className="mt-4 text-balance text-[1.375rem] font-bold leading-tight">{fill(P.joinTitle, { shop: peek?.shop ?? "…" })}</h1>
      <p className="mt-1.5 max-w-xs text-[0.9375rem] text-muted">{P.staffHint}</p>
      {done ? (
        <p className="mt-6 flex items-center gap-2 rounded-[1.125rem] bg-mint-soft px-4 py-3 text-[0.9375rem] font-bold text-mint">
          <Check className="size-5" strokeWidth={3} /> {fill(P.joinOk, { shop: done })}
        </p>
      ) : bad ? (
        <p className="mt-6 rounded-[1.125rem] bg-coral-soft px-4 py-3 text-[0.9375rem] font-semibold text-coral">{bad}</p>
      ) : (
        <div className="mt-6 w-full max-w-xs">
          <Btn type="button" onClick={peek?.state === "mine" ? () => router.push("/staff") : join} disabled={pending}>
            {pending ? "…" : peek?.state === "mine" ? P.walletStaffGo : "إيه، نولّي خدّام"}
          </Btn>
          {error && <p className="mt-2 text-[0.8125rem] font-semibold text-coral">{error}</p>}
        </div>
      )}
    </div>
  );
}
