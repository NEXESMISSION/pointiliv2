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
      <div className="mt-3 rounded-[1rem] bg-coral-soft p-3.5 text-center">
        <p className="text-[0.9062rem] font-semibold text-coral">{t.aNewsDeleteConfirm}</p>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setAsk(false)} className="h-9 rounded-[0.625rem] bg-surface text-[0.8438rem] font-semibold">
            {t.back}
          </button>
          <button type="button" disabled={pending} onClick={() => start(() => adminNewsDelete(id))} className="h-9 rounded-[0.625rem] bg-coral text-[0.8438rem] font-bold text-white disabled:opacity-60">
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
        className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[0.625rem] text-[0.8438rem] font-semibold transition-colors disabled:opacity-60 ${active ? "border border-line bg-surface text-body hover:border-brand hover:text-brand" : "bg-mint text-white"}`}
      >
        {active ? <Pause className="size-4" /> : <Play className="size-4" />} {active ? t.aNewsStop : t.aNewsResume}
      </button>
      <button type="button" onClick={() => setAsk(true)} className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-[0.625rem] bg-coral-soft px-3 text-[0.8438rem] font-semibold text-coral hover:bg-coral hover:text-white">
        <Trash2 className="size-4" /> {t.aNewsDelete}
      </button>
    </div>
  );
}
