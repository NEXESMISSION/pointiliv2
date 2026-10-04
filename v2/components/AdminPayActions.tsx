"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Check, X } from "lucide-react";
import { adminPaymentDecide } from "@/app/actions";
import { CBtn } from "@/components/console";
import { t } from "@/lib/t";

/** The founder's word on one payment: the money came (the year starts) or it did not. */
export function AdminPayActions({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const decide = (paid: boolean) =>
    start(async () => {
      await adminPaymentDecide(id, paid);
      router.refresh();
    });
  return (
    <span className="relative z-[2] inline-flex gap-1.5">
      <CBtn kind="main" disabled={pending} onClick={() => decide(true)}>
        <Check className="size-4" /> {t.aPayConfirm}
      </CBtn>
      <CBtn kind="coral" disabled={pending} onClick={() => decide(false)}>
        <X className="size-4" /> {t.aPayRefuse}
      </CBtn>
    </span>
  );
}
