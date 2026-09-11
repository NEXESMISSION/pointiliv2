"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { redeemDirect } from "@/app/actions/merchant";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

export function RedeemNowButton({ customerId, rewardId, rewardName, customerLabel, stamps }: { customerId: string; rewardId: string; rewardName: string; customerLabel: string; stamps: number }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <>
      <Button size="md" onClick={() => setOpen(true)}>
        Redeem
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Redeem this reward?"
        confirmLabel="Confirm redemption"
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
        Give <b>{rewardName}</b> to {customerLabel}. This uses {stamps} stamps and can&apos;t be undone.
      </ConfirmDialog>
    </>
  );
}
