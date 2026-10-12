"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { MessageCircle, Phone, ShieldAlert } from "lucide-react";
import { adminPhoneAsk } from "@/app/actions";
import { pretty } from "@/lib/phone";

const when = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Africa/Tunis" }).format(new Date(iso));

/**
 * The owner's number looks made up: the founder asks for the real one. The
 * owner's screens are covered by the question until they give it; then it is
 * here, to call, and to say it is right (or ask again).
 */
export function AdminPhoneCheck({ id, state, given, givenAt, okAt }: { id: string; state: "ask" | "sent" | null; given: string | null; givenAt: string | null; okAt: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const set = (on: boolean) =>
    start(async () => {
      await adminPhoneAsk(id, on);
      router.refresh();
    });

  if (state === "ask") {
    return (
      <div className="mt-3 rounded-[0.75rem] bg-coral-soft p-2.5 text-[0.8125rem]">
        <p className="flex items-center gap-1.5 font-semibold text-coral">
          <ShieldAlert className="size-4" /> طلبنا منو النومرو الصحيح · يستنّى
        </p>
        <button type="button" disabled={pending} onClick={() => set(false)} className="mt-1.5 text-[0.8125rem] font-semibold text-muted underline-offset-4 hover:underline">
          رجّع الطلب
        </button>
      </div>
    );
  }
  if (state === "sent" && given) {
    return (
      <div className="mt-3 rounded-[0.75rem] bg-brand-soft p-2.5 text-[0.8125rem]">
        <p className="font-semibold text-brand">بعث النومرو الصحيح{givenAt ? ` · ${when(givenAt)}` : ""}:</p>
        <p className="num mt-0.5 text-[1rem] font-bold text-ink" dir="ltr">
          {pretty(given)}
        </p>
        <span className="mt-2 flex flex-wrap gap-1.5">
          <a href={`tel:+216${given}`} className="inline-flex h-8 items-center gap-1 rounded-[0.5rem] bg-brand px-2.5 font-bold text-white">
            <Phone className="size-3.5" /> كلّمو
          </a>
          <a href={`https://wa.me/216${given}`} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1 rounded-[0.5rem] bg-[#25D366] px-2.5 font-bold text-white">
            <MessageCircle className="size-3.5" /> واتساب
          </a>
          <button type="button" disabled={pending} onClick={() => set(false)} className="h-8 rounded-[0.5rem] bg-mint px-2.5 font-bold text-white disabled:opacity-60">
            صحيح ✓
          </button>
          <button type="button" disabled={pending} onClick={() => set(true)} className="h-8 rounded-[0.5rem] border border-line bg-surface px-2.5 font-semibold text-body disabled:opacity-60">
            موش صحيح، اطلب مرّة أخرى
          </button>
        </span>
      </div>
    );
  }
  return (
    <div className="mt-3">
      {given && okAt && (
        <p className="mb-1.5 text-[0.8125rem] text-muted">
          النومرو الصحيح: <span className="num font-semibold text-body" dir="ltr">{pretty(given)}</span> ✓
        </p>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => set(true)}
        className="flex h-8 w-full items-center justify-center gap-1.5 rounded-[0.625rem] border border-line bg-surface text-[0.8125rem] font-semibold text-body hover:border-coral hover:text-coral disabled:opacity-60"
      >
        <ShieldAlert className="size-4" /> نومرو مزيّف؟ اطلب النومرو الصحيح
      </button>
    </div>
  );
}
