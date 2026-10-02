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
      <div className="mb-[2dvh] mt-[1.8dvh] shrink-0 rounded-[1.25rem] bg-coral-soft p-3.5 text-center">
        <p className="text-[0.9062rem] font-semibold text-coral">{t.aDeleteConfirm}</p>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setAsk(false)} className="press h-11 rounded-[0.875rem] bg-surface font-semibold">
            {t.back}
          </button>
          <button type="button" disabled={pending} onClick={() => start(() => adminDelete(id))} className="press h-11 rounded-[0.875rem] bg-coral font-bold text-white disabled:opacity-60">
            {t.aDelete}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-[2dvh] mt-[1.8dvh] flex shrink-0 gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await adminPause(id, !paused);
            router.refresh();
          })
        }
        className={`press flex h-[3.25rem] flex-1 items-center justify-center gap-2 rounded-[1.125rem] text-[0.9688rem] font-semibold disabled:opacity-60 ${paused ? "bg-mint text-white" : "bg-surface text-ink shadow-card"}`}
      >
        {paused ? <Play className="size-5" /> : <Pause className="size-5" />} {paused ? t.aResume : t.aPause}
      </button>
      <button type="button" onClick={() => setAsk(true)} className="press flex h-[3.25rem] shrink-0 items-center justify-center gap-1.5 rounded-[1.125rem] bg-coral-soft px-4 text-[0.9375rem] font-semibold text-coral" aria-label={t.aDelete}>
        <Trash2 className="size-5" /> {t.aDelete}
      </button>
    </div>
  );
}
