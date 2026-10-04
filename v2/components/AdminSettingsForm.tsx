"use client";

import { useActionState } from "react";
import { adminSaveSettings } from "@/app/actions";
import { Btn, boxLook, boxFocus } from "@/components/ui";
import { t } from "@/lib/t";
import type { FormState } from "@/lib/types";

/** One small labelled box: the settings page has five of them and fits a phone screen. */
function Box({ name, label, value, placeholder, ltr, error }: { name: string; label: string; value: string; placeholder?: string; ltr?: boolean; error?: string | null }) {
  return (
    <label className="block">
      <span className="mb-1 block px-1 text-[0.8125rem] font-semibold text-muted">{label}</span>
      <input name={name} defaultValue={value} placeholder={placeholder} dir={ltr ? "ltr" : undefined} className={`block h-12 w-full px-3.5 text-[16px] outline-none placeholder:text-faint ${ltr ? "text-left" : ""} ${boxLook} ${boxFocus}`} />
      {error && <span className="mt-1 block px-1 text-[0.8125rem] font-medium text-coral">{error}</span>}
    </label>
  );
}

/** The founder's settings: the number owners call with a question, and the two videos (a label and a YouTube link each). */
export function AdminSettingsForm({ raw }: { raw: Record<string, string> }) {
  const [state, action, pending] = useActionState<FormState, FormData>(adminSaveSettings, null);
  const err = (f: string) => (state?.field === f ? state.error : null);
  const saved = !!state && !state.error;
  return (
    <form action={action} className="mt-[2.5dvh] space-y-[1.6dvh]">
      <Box name="support_phone" label={t.aSupportPhone} value={raw.support_phone ?? ""} placeholder="+216 22 123 456" ltr error={err("support_phone")} />
      <fieldset className="space-y-2 rounded-[1.25rem] bg-surface/60 p-3 ring-1 ring-line">
        <legend className="px-1 text-[0.875rem] font-bold">{t.aVideo1}</legend>
        <Box name="video1_label" label={t.aVideoLabel} value={raw.video1_label ?? ""} placeholder="كيفاش تخدم Pointili؟" />
        <Box name="video1_url" label={t.aVideoUrl} value={raw.video1_url ?? ""} placeholder="https://youtu.be/…" ltr error={err("video1_url")} />
      </fieldset>
      <fieldset className="space-y-2 rounded-[1.25rem] bg-surface/60 p-3 ring-1 ring-line">
        <legend className="px-1 text-[0.875rem] font-bold">{t.aVideo2}</legend>
        <Box name="video2_label" label={t.aVideoLabel} value={raw.video2_label ?? ""} placeholder="فيديو ثاني" />
        <Box name="video2_url" label={t.aVideoUrl} value={raw.video2_url ?? ""} placeholder="https://youtu.be/…" ltr error={err("video2_url")} />
      </fieldset>
      <fieldset className="space-y-2 rounded-[1.25rem] bg-surface/60 p-3 ring-1 ring-line">
        <legend className="px-1 text-[0.875rem] font-bold">{t.aPaySettings}</legend>
        <Box name="pay_card_url" label={t.aPayCardUrl} value={raw.pay_card_url ?? ""} placeholder="https://checkout.dodopayments.com/…" ltr error={err("pay_card_url")} />
        <Box name="pay_d17" label={t.aPayD17} value={raw.pay_d17 ?? ""} placeholder="22 123 456" ltr />
        <Box name="pay_name" label={t.aPayName} value={raw.pay_name ?? ""} placeholder="Saif …" />
        <Box name="pay_bank" label={t.aPayBank} value={raw.pay_bank ?? ""} placeholder="BIAT, STB, La Poste…" />
        <Box name="pay_rib" label={t.aPayRib} value={raw.pay_rib ?? ""} placeholder="08 006 0001234567890 12" ltr error={err("pay_rib")} />
        <Box name="pay_mandat" label={t.aPayMandat} value={raw.pay_mandat ?? ""} placeholder="…" />
      </fieldset>
      {state?.error && !state.field && <p className="rounded-2xl bg-coral-soft px-4 py-3 text-[0.9062rem] font-medium text-coral">{state.error}</p>}
      <Btn type="submit" disabled={pending}>
        {pending ? t.checking : saved ? `${t.aSaved} ✓` : t.save}
      </Btn>
    </form>
  );
}
