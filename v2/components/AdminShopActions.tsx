"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pause, Play, Trash2 } from "lucide-react";
import { adminDelete, adminPause } from "@/app/actions";
import { t } from "@/lib/t";

/** The founder's two switches on a shop: pause it (no stamps until resumed), or delete it for good. */
export function AdminShopActions({ id, paused }: { id: string; paused: boolean }) {
  const [pending, start] = useTransition();
  const [ask, setAsk] = useState(false);
  const router = useRouter();
  return (
    <div className="mt-6 space-y-2.5">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await adminPause(id, !paused);
            router.refresh();
          })
        }
        className={`press flex h-[54px] w-full items-center justify-center gap-2 rounded-[20px] text-[16.5px] font-semibold disabled:opacity-60 ${paused ? "bg-mint text-white" : "bg-surface text-ink shadow-card"}`}
      >
        {paused ? <Play className="size-5" /> : <Pause className="size-5" />} {paused ? t.aResume : t.aPause}
      </button>
      {ask ? (
        <div className="rounded-[20px] bg-coral-soft p-4 text-center">
          <p className="text-[15px] font-semibold text-coral">{t.aDeleteConfirm}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setAsk(false)} className="press h-12 rounded-[16px] bg-surface font-semibold">
              {t.back}
            </button>
            <button type="button" disabled={pending} onClick={() => start(() => adminDelete(id))} className="press h-12 rounded-[16px] bg-coral font-bold text-white disabled:opacity-60">
              {t.aDelete}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAsk(true)} className="press flex h-[50px] w-full items-center justify-center gap-2 text-[15.5px] font-semibold text-coral">
          <Trash2 className="size-5" /> {t.aDelete}
        </button>
      )}
    </div>
  );
}
