"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pause, Play, Trash2 } from "lucide-react";
import { adminDelete, adminPause } from "@/app/actions";
import { t } from "@/lib/t";

/** The founder's two switches on a shop, side by side: pause it (no stamps until resumed), or delete it for good. */
export function AdminShopActions({ id, paused }: { id: string; paused: boolean }) {
  const [pending, start] = useTransition();
  const [ask, setAsk] = useState(false);
  const router = useRouter();

  if (ask) {
    return (
      <div className="rounded-[1rem] border border-coral/20 bg-coral-soft p-3.5 text-center">
        <p className="text-[0.9062rem] font-semibold text-coral">{t.aDeleteConfirm}</p>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setAsk(false)} className="h-9 rounded-[0.625rem] bg-surface text-[0.8438rem] font-semibold">
            {t.back}
          </button>
          <button type="button" disabled={pending} onClick={() => start(() => adminDelete(id))} className="h-9 rounded-[0.625rem] bg-coral text-[0.8438rem] font-bold text-white disabled:opacity-60">
            {t.aDelete}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await adminPause(id, !paused);
            router.refresh();
          })
        }
        className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[0.625rem] text-[0.8438rem] font-semibold transition-colors disabled:opacity-60 ${paused ? "bg-mint text-white" : "border border-line bg-surface text-body hover:border-brand hover:text-brand"}`}
      >
        {paused ? <Play className="size-4" /> : <Pause className="size-4" />} {paused ? t.aResume : t.aPause}
      </button>
      <button type="button" onClick={() => setAsk(true)} className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-[0.625rem] bg-coral-soft px-3 text-[0.8438rem] font-semibold text-coral hover:bg-coral hover:text-white" aria-label={t.aDelete}>
        <Trash2 className="size-4" /> {t.aDelete}
      </button>
    </div>
  );
}
