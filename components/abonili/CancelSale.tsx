"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { abCancelPeriod } from "@/app/actions/abonili";
import { useAb } from "./AbProvider";

/** For a sale entered by mistake. Asks first: it takes money out of the till. */
export function CancelSale({ periodId }: { periodId: string }) {
  const { a } = useAb();
  const router = useRouter();
  const [busy, start] = useTransition();
  return (
    <button
      type="button"
      className="text-[12.5px] font-semibold underline-offset-2 hover:underline"
      style={{ color: "var(--ab-red)" }}
      disabled={busy}
      onClick={() => {
        if (!window.confirm(a.member.cancelConfirm)) return;
        start(async () => {
          await abCancelPeriod(periodId);
          router.refresh();
        });
      }}
    >
      {a.member.cancelSale}
    </button>
  );
}
