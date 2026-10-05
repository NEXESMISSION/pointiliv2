"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Trash2 } from "lucide-react";
import { adminSweepRobots } from "@/app/actions";
import { CBtn, Num } from "@/components/console";
import { fill, t } from "@/lib/t";

/** The scripts' leftover accounts: how many are still there, and one button that removes them all. */
export function AdminRobots({ left }: { left: number }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState<string | null>(null);
  const router = useRouter();

  if (left === 0) {
    return (
      <p className="flex items-center gap-1.5 text-[0.875rem] font-semibold text-mint">
        <Check className="size-4" strokeWidth={3} /> {done ?? t.aRobotsNone}
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[0.875rem] border border-line px-4 py-3">
      <span className="text-[0.9375rem] font-bold text-ink">
        <Num>{fill(t.aRobotsLeft, { n: left })}</Num>
      </span>
      <CBtn
        kind="coral"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const n = await adminSweepRobots();
            setDone(n === null ? t.errNetwork : t.aRobotsDone);
            router.refresh();
          })
        }
      >
        <Trash2 className="size-4" /> {t.aRobotsSweep}
      </CBtn>
    </div>
  );
}
