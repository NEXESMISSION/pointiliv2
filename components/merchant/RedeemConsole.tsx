"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Check, Gift, Ticket } from "lucide-react";
import { confirmRedemption, lookupRedemption } from "@/app/actions/merchant";
import type { FormState } from "@/app/actions/types";
import { Alert } from "@/components/ui/Alert";
import { Button, SubmitButton } from "@/components/ui/Button";
import { Card, SectionTitle } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import type { RedemptionView } from "@/lib/types";

export function RedeemConsole({ initialPending }: { initialPending: RedemptionView[] }) {
  const [state, action] = useActionState<FormState, FormData>(lookupRedemption, null);
  const [pending, setPending] = useState(initialPending);
  const [done, setDone] = useState<RedemptionView | null>(null);
  const [dismissedAt, setDismissedAt] = useState(0);
  const found = state?.ok && (state.at ?? 0) > dismissedAt ? (state.data as RedemptionView) : null;

  // Live list: a request appears here seconds after the customer taps "Use reward".
  useEffect(() => {
    const iv = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/merchant/pending", { cache: "no-store" });
        if (res.ok) setPending(await res.json());
      } catch {
        /* keep the last list */
      }
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  if (done) {
    return (
      <Card className="animate-rise p-6 text-center">
        <span className="mx-auto grid size-20 animate-pop place-items-center rounded-full bg-success-500 text-white">
          <Check className="size-10" strokeWidth={3} />
        </span>
        <p className="mt-4 text-2xl font-extrabold text-ink">Reward redeemed!</p>
        <p className="mt-1 text-lg font-semibold text-success-600">{done.reward_name}</p>
        <p className="text-muted">Customer #{done.customer.code}</p>
        <Button
          block
          className="mt-6"
          onClick={() => {
            setDone(null);
            setDismissedAt(Date.now());
          }}
        >
          Done
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {found ? (
        <Confirm r={found} onDone={setDone} onCancel={() => setDismissedAt(Date.now())} />
      ) : (
        <Card className="p-5">
          <form action={action} className="space-y-4">
            <label htmlFor="code" className="block text-sm font-medium text-body">
              Enter the 6-digit code
            </label>
            <input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="off"
              maxLength={7}
              placeholder="000 000"
              defaultValue={state?.values?.code ?? ""}
              key={state?.at}
              className="h-16 w-full rounded-2xl border border-line bg-white text-center font-mono text-3xl font-bold tracking-[0.3em] text-ink placeholder:text-line focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
            />
            {(state?.error || state?.fields?.code) && <Alert>{state.error ?? state.fields?.code}</Alert>}
            <SubmitButton pendingText="Checking…">Check code</SubmitButton>
          </form>
        </Card>
      )}

      <section>
        <SectionTitle>Waiting at the counter</SectionTitle>
        {pending.length === 0 ? (
          <Card className="flex items-center gap-3 p-4 text-sm text-muted">
            <Ticket className="size-5" /> No reward requests right now.
          </Card>
        ) : (
          <div className="space-y-3">
            {pending.map((r) => (
              <Confirm key={r.id} r={r} compact onDone={setDone} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Confirm({ r, compact, onDone, onCancel }: { r: RedemptionView; compact?: boolean; onDone: (r: RedemptionView) => void; onCancel?: () => void }) {
  const [busy, start] = useTransition();
  const toast = useToast();
  return (
    <Card className={compact ? "p-4" : "p-5"}>
      <div className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-warning-50 text-warning-700">
          <Gift className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold text-ink">{r.reward_name}</p>
          <p className="truncate text-sm text-muted">
            {r.customer.name || `Customer #${r.customer.code}`} · {r.customer.phone_masked}
          </p>
        </div>
        <p className="shrink-0 rounded-xl bg-canvas px-2.5 py-1 font-mono text-lg font-bold tracking-wider text-ink">
          {r.code.slice(0, 3)} {r.code.slice(3)}
        </p>
      </div>
      {!compact && <p className="mt-3 text-sm text-muted">Check the code matches the customer&apos;s screen. This uses {r.stamps_spent} of their {r.customer.balance} stamps.</p>}
      <div className="mt-4 flex gap-2">
        {onCancel && (
          <Button variant="outline" size="md" onClick={onCancel} className="flex-1">
            Back
          </Button>
        )}
        <Button
          variant="success"
          size="md"
          className="flex-1"
          loading={busy}
          icon={<Check className="size-5" />}
          onClick={() =>
            start(async () => {
              const res = await confirmRedemption(r.id);
              if (res.ok && res.redemption) onDone(res.redemption);
              else toast(res.message, "error");
            })
          }
        >
          Confirm redemption
        </Button>
      </div>
    </Card>
  );
}
