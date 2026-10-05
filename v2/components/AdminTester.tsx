"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { RotateCcw, Store, Trash2, UserPlus } from "lucide-react";
import { adminTester } from "@/app/actions";
import { CBtn } from "@/components/console";
import { t } from "@/lib/t";

/** The test account's three starting points, one button each; the line under them says it worked. */
export function AdminTester() {
  const [pending, start] = useTransition();
  const [done, setDone] = useState<string | null>(null);
  const router = useRouter();
  const go = (mode: "fresh" | "new" | "owner") =>
    start(async () => {
      setDone(null);
      const res = await adminTester(mode).catch(() => "error" as const);
      setDone(res === "ok" ? t.aTesterDone : res === "no_account" ? t.aTesterNoAccount : t.errNetwork);
      router.refresh();
    });
  const modes = [
    { id: "fresh" as const, label: t.aTesterFresh, hint: t.aTesterFreshHint, icon: Trash2, kind: "coral" as const },
    { id: "new" as const, label: t.aTesterNew, hint: t.aTesterNewHint, icon: UserPlus, kind: "soft" as const },
    { id: "owner" as const, label: t.aTesterOwner, hint: t.aTesterOwnerHint, icon: Store, kind: "main" as const },
  ];
  return (
    <div className="space-y-2.5">
      {modes.map((m) => (
        <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[0.875rem] border border-line px-4 py-3">
          <span className="min-w-0">
            <span className="block text-[0.9375rem] font-bold text-ink">{m.label}</span>
            <span className="block text-[0.8125rem] text-muted">{m.hint}</span>
          </span>
          <CBtn kind={m.kind} disabled={pending} onClick={() => go(m.id)}>
            <m.icon className="size-4" /> {m.label}
          </CBtn>
        </div>
      ))}
      {done && (
        <p className="flex items-center gap-1.5 text-[0.875rem] font-semibold text-mint">
          <RotateCcw className="size-4" /> {done}
        </p>
      )}
    </div>
  );
}
