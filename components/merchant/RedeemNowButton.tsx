"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { redeemDirect } from "@/app/actions/merchant";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/components/i18n/Provider";

export function RedeemNowButton({ customerId, rewardId, rewardName, customerLabel, stamps }: { customerId: string; rewardId: string; rewardName: string; customerLabel: string; stamps: number }) {
  const { t, count } = useT();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const w = t.ops.customer;
  return (
    <>
      <Button size="md" onClick={() => setOpen(true)}>
        {w.give}
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title={w.giveTitle}
        confirmLabel={t.ops.redeem.confirmGive}
        loading={pending}
        onConfirm={() =>
          start(async () => {
            const res = await redeemDirect(customerId, rewardId);
            toast(res.message, res.ok ? "success" : "error");
            setOpen(false);
            router.refresh();
          })
        }
      >
        <b>{rewardName}</b> — {count(w.giveBody, stamps, { customer: customerLabel })}
      </ConfirmDialog>
    </>
  );
}
