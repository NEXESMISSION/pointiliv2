"use client";

import { useActionState, useState } from "react";
import { ExternalLink, MessageCircle, Phone, Play } from "lucide-react";
import { adminSaveSettings } from "@/app/actions";
import { Btn, boxLook, boxFocus } from "@/components/ui";
import { t } from "@/lib/t";
import type { FormState } from "@/lib/types";

/** youtu.be/ID, watch?v=ID, /shorts/ID… → ID (the same reading as lib/settings, for the preview here). */
const ytId = (url: string) => url.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/|v\/))([A-Za-z0-9_-]{11})/)?.[1] ?? null;

/** One small labelled box. */
function Box({
  name,
  label,
  value,
  placeholder,
  ltr,
  error,
  onChange,
}: {
  name: string;
  label: string;
  value: string;
  placeholder?: string;
  ltr?: boolean;
  error?: string | null;
  onChange?: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block px-1 text-[0.8125rem] font-semibold text-muted">{label}</span>
      <input
        name={name}
        defaultValue={value}
        placeholder={placeholder}
        dir={ltr ? "ltr" : undefined}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className={`block h-12 w-full px-3.5 text-[16px] outline-none placeholder:text-faint ${ltr ? "text-left" : ""} ${boxLook} ${boxFocus}`}
      />
      {error && <span className="mt-1 block px-1 text-[0.8125rem] font-medium text-coral">{error}</span>}
    </label>
  );
}

/** A part of the page: its title, where it shows, and its boxes. */
function Part({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-2.5 rounded-[1.25rem] bg-surface/60 p-4 ring-1 ring-line">
      <legend className="px-1 text-[0.9375rem] font-bold">{title}</legend>
      <p className="-mt-1 text-[0.8125rem] leading-relaxed text-muted">{hint}</p>
      {children}
    </fieldset>
  );
}

/** A video's label and link, with its picture once the link is a YouTube one. */
function VideoBox({ n, raw, err }: { n: 1 | 2; raw: Record<string, string>; err: (f: string) => string | null | undefined }) {
  const [url, setUrl] = useState(raw[`video${n}_url`] ?? "");
  const id = ytId(url);
  return (
    <div className="grid gap-2.5 sm:grid-cols-[1fr_8.5rem] sm:items-end">
      <div className="space-y-2">
        <Box name={`video${n}_label`} label={`${n === 1 ? t.aVideo1 : t.aVideo2} · ${t.aVideoLabel}`} value={raw[`video${n}_label`] ?? ""} placeholder={n === 1 ? "كيفاش تخدم Pointili؟" : "شوف كيفاش يسكاني الحريف"} />
        <Box name={`video${n}_url`} label={t.aVideoUrl} value={url} placeholder="https://youtube.com/shorts/…" ltr error={err(`video${n}_url`)} onChange={setUrl} />
      </div>
      {id ? (
        <a href={`https://youtu.be/${id}`} target="_blank" rel="noreferrer" className="relative block aspect-video overflow-hidden rounded-[0.875rem] bg-ink ring-1 ring-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://i.ytimg.com/vi/${id}/mqdefault.jpg`} alt="" className="size-full object-cover" />
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid size-9 place-items-center rounded-full bg-white/90 text-ink">
              <Play className="size-4 fill-current" />
            </span>
          </span>
        </a>
      ) : (
        <span className="hidden aspect-video rounded-[0.875rem] bg-canvas ring-1 ring-line sm:block" aria-hidden />
      )}
    </div>
  );
}

/**
 * The founder's settings, each with where it shows: the number owners call
 * (and write to on WhatsApp), the two videos with their pictures, and
 * Pointili's own pages (in the reading pages' footer, and told to search
 * engines and AI assistants), and Facebook's pixel for the ads (its number,
 * and the code that proves the domain is ours). Nothing about cards or bank
 * details: owners pay by a call or a WhatsApp.
 */
export function AdminSettingsForm({ raw }: { raw: Record<string, string> }) {
  const [state, action, pending] = useActionState<FormState, FormData>(adminSaveSettings, null);
  const [phone, setPhone] = useState(raw.support_phone ?? "");
  const err = (f: string) => (state?.field === f ? state.error : null);
  const saved = !!state && !state.error;
  const digits = phone.replace(/\D/g, "");
  const full = digits.length === 8 ? `216${digits}` : digits;
  return (
    <form action={action} className="space-y-4">
      <Part title={t.aHelpCard} hint={t.aHelpCardHint}>
        <Box name="support_phone" label={t.aSupportPhone} value={phone} placeholder="+216 58 415 520" ltr error={err("support_phone")} onChange={setPhone} />
        {full.length >= 11 && (
          <span className="flex flex-wrap gap-2">
            <a href={`tel:+${full}`} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-soft px-3.5 text-[0.8438rem] font-bold text-brand">
              <Phone className="size-4" /> {t.aTry}
            </a>
            <a href={`https://wa.me/${full}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#25D366]/15 px-3.5 text-[0.8438rem] font-bold text-[#128C4B]">
              <MessageCircle className="size-4" /> {t.helpWhatsapp}
            </a>
          </span>
        )}
      </Part>

      <Part title={t.aVideosCard} hint={t.aVideosCardHint}>
        <VideoBox n={1} raw={raw} err={err} />
        <VideoBox n={2} raw={raw} err={err} />
      </Part>

      <Part title={t.aSocialCard} hint={t.aSocialCardHint}>
        <Box name="facebook_url" label="Facebook" value={raw.facebook_url ?? ""} placeholder="https://www.facebook.com/…" ltr error={err("facebook_url")} />
        <Box name="instagram_url" label="Instagram" value={raw.instagram_url ?? ""} placeholder="https://www.instagram.com/…" ltr error={err("instagram_url")} />
        <Box name="tiktok_url" label="TikTok" value={raw.tiktok_url ?? ""} placeholder="https://www.tiktok.com/@…" ltr error={err("tiktok_url")} />
      </Part>

      <Part title={t.aPixelCard} hint={t.aPixelCardHint}>
        <Box name="meta_pixel" label={t.aPixelId} value={raw.meta_pixel ?? ""} placeholder="123456789012345" ltr error={err("meta_pixel")} />
        <Box name="fb_domain_verify" label={t.aFbVerify} value={raw.fb_domain_verify ?? ""} placeholder="abc123def456ghi789jkl0mnopqrs" ltr error={err("fb_domain_verify")} />
        <a href="https://business.facebook.com/events_manager2" target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-soft px-3.5 text-[0.8438rem] font-bold text-brand">
          <ExternalLink className="size-4" /> {t.aPixelWhere}
        </a>
      </Part>

      {state?.error && !state.field && <p className="rounded-2xl bg-coral-soft px-4 py-3 text-[0.9062rem] font-medium text-coral">{state.error}</p>}
      <Btn type="submit" disabled={pending}>
        {pending ? t.checking : saved ? `${t.aSaved} ✓` : t.save}
      </Btn>
    </form>
  );
}
