"use client";

import { useState, useTransition } from "react";
import { Copy, KeyRound, MessageCircle, Trash2 } from "lucide-react";
import { adminDeletePerson, adminResetPassword } from "@/app/actions";
import { digits } from "@/lib/phone";
import { fill, t } from "@/lib/t";

/**
 * The founder's two tools on an account: a new password for someone who
 * forgot theirs (eight digits, shown once, sent on WhatsApp in one tap), and
 * deleting the account.
 */
export function AdminPersonActions({ id, name, phone }: { id: string; name: string; phone: string | null }) {
  const [pending, start] = useTransition();
  const [password, setPassword] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [ask, setAsk] = useState(false);
  const wa = phone && password ? `https://wa.me/216${digits(phone)}?text=${encodeURIComponent(fill(t.aResetMsg, { name: name || "", password }))}` : null;

  return (
    <div className="mb-[2dvh] mt-[1.8dvh] shrink-0 space-y-2">
      {password ? (
        <div className="animate-pop rounded-[1.375rem] bg-surface p-4 text-center shadow-card">
          <p className="text-[0.8438rem] font-semibold text-muted">{t.aResetDone}</p>
          <p className="num mt-1 text-[2.125rem] font-bold tracking-[0.14em]" dir="ltr">
            {password}
          </p>
          <p className="mt-1 text-[0.8438rem] text-muted">{t.aResetHint}</p>
          <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className="press flex h-12 items-center justify-center gap-2 rounded-[1rem] bg-[#25D366] text-[0.9688rem] font-bold text-white">
                <MessageCircle className="size-5" /> {t.aResetSend}
              </a>
            )}
            <button type="button" onClick={() => void navigator.clipboard?.writeText(password)} className="press grid h-12 w-12 place-items-center rounded-[1rem] bg-brand-soft text-brand" aria-label="copy">
              <Copy className="size-5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await adminResetPassword(id);
              setFailed(!res.ok);
              if (res.ok && res.password) setPassword(res.password);
            })
          }
          className="press flex h-[3.375rem] w-full items-center justify-center gap-2 rounded-[1.25rem] bg-surface text-[1.0312rem] font-semibold text-ink shadow-card disabled:opacity-60"
        >
          <KeyRound className="size-5" /> {t.aReset}
        </button>
      )}
      {failed && <p className="rounded-2xl bg-coral-soft px-4 py-3 text-center text-[0.9062rem] font-medium text-coral">{t.errNetwork}</p>}

      {ask ? (
        <div className="rounded-[1.25rem] bg-coral-soft p-4 text-center">
          <p className="text-[0.9375rem] font-semibold text-coral">{t.aDeletePersonConfirm}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setAsk(false)} className="press h-12 rounded-[1rem] bg-surface font-semibold">
              {t.back}
            </button>
            <button type="button" disabled={pending} onClick={() => start(() => adminDeletePerson(id))} className="press h-12 rounded-[1rem] bg-coral font-bold text-white disabled:opacity-60">
              {t.aDeletePerson}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAsk(true)} className="press flex h-[3.125rem] w-full items-center justify-center gap-2 text-[0.9688rem] font-semibold text-coral">
          <Trash2 className="size-5" /> {t.aDeletePerson}
        </button>
      )}
    </div>
  );
}
