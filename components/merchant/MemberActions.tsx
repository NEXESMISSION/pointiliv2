"use client";

import { useState, useTransition } from "react";
import { CalendarPlus, RefreshCw, X } from "lucide-react";
import { addDays, cancelMember, renewMember } from "@/app/actions/abonili";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { ToastOnResult } from "@/components/ui/Toast";
import { useT } from "@/components/i18n/Provider";
import type { MembershipRow } from "@/lib/types";

type Result = { ok: boolean; message: string; at: number } | null;

/**
 * The three things an owner ever does to an abonnement, in the order he does
 * them: renew it, push the end out a week, or end it. Renewing keeps whatever
 * is left — the database starts the new period where the old one ended — so
 * the button is safe to press on someone who still has days.
 */
export function MemberActions({ member }: { member: MembershipRow }) {
  const { t } = useT();
  const w = t.merchant.abonili;
  const [result, setResult] = useState<Result>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; message: string; at: number }>) =>
    start(async () => setResult(await fn()));

  return (
    <>
      <ToastOnResult result={result} />
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => run(() => renewMember(member.id, member.plan_id))} disabled={pending} icon={<RefreshCw className="size-4" />}>
          {w.renew}
        </Button>
        <Button
          variant="outline"
          onClick={() => run(() => addDays(member.id, 7))}
          disabled={pending || member.ends_at === null}
          icon={<CalendarPlus className="size-4" />}
        >
          {w.addSevenDays}
        </Button>
      </div>

      {member.status !== "cancelled" && (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={pending}
          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium text-danger-600 transition-colors hover:bg-danger-50"
        >
          <X className="size-4" />
          {w.cancel}
        </button>
      )}

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          run(() => cancelMember(member.id));
        }}
        title={w.cancel}
        confirmLabel={w.cancel}
        tone="danger"
        loading={pending}
      >
        {w.cancelConfirm}
      </ConfirmDialog>
    </>
  );
}
