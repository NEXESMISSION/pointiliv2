"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pause, Play, Trash2 } from "lucide-react";
import { adminNewsActive, adminNewsDelete } from "@/app/actions";
import { t } from "@/lib/t";

/** A piece of news, from the console: stop it (nobody new sees it) or let it go on — or delete it, after a second tap. */
export function AdminNewsActions({ id, active }: { id: string; active: boolean }) {
  const [pending, start] = useTransition();
  const [ask, setAsk] = useState(false);
  const router = useRouter();

  if (ask) {
    return (
      <div className="mt-3 rounded-[1.25rem] bg-coral-soft p-3.5 text-center">
        <p className="text-[0.9062rem] font-semibold text-coral">{t.aNewsDeleteConfirm}</p>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setAsk(false)} className="press h-11 rounded-[0.875rem] bg-surface font-semibold">
            {t.back}
          </button>
          <button type="button" disabled={pending} onClick={() => start(() => adminNewsDelete(id))} className="press h-11 rounded-[0.875rem] bg-coral font-bold text-white disabled:opacity-60">
            {t.aNewsDelete}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 flex gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await adminNewsActive(id, !active);
            router.refresh();
          })
        }
        className={`press flex h-12 flex-1 items-center justify-center gap-2 rounded-[1.125rem] text-[0.9375rem] font-semibold disabled:opacity-60 ${active ? "bg-surface text-ink shadow-card" : "bg-mint text-white"}`}
      >
        {active ? <Pause className="size-5" /> : <Play className="size-5" />} {active ? t.aNewsStop : t.aNewsResume}
      </button>
      <button type="button" onClick={() => setAsk(true)} className="press flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-[1.125rem] bg-coral-soft px-4 text-[0.9375rem] font-semibold text-coral">
        <Trash2 className="size-5" /> {t.aNewsDelete}
      </button>
    </div>
  );
}
