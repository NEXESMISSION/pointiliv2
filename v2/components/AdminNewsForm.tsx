"use client";

import { useActionState, useState } from "react";
import { adminNewsSave } from "@/app/actions";
import { NewsCard } from "@/components/NewsCard";
import { Btn, Icon3D, boxFocus, boxLook } from "@/components/ui";
import { NEWS_ICONS, NEWS_TARGETS } from "@/lib/news";
import { t } from "@/lib/t";
import type { FormState } from "@/lib/types";

const label = "mb-1 block px-1 text-[0.8125rem] font-semibold text-muted";
const field = `block w-full px-3.5 text-[16px] outline-none placeholder:text-faint ${boxLook} ${boxFocus}`;

/**
 * A new piece of news for the owners: the title, a few words, a picture, and
 * where its button leads (one of the owner's places, a web address, or no
 * button) — with the card itself under the form, exactly as the owners will
 * see it, changing as it is written.
 */
export function AdminNewsForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(adminNewsSave, null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [icon, setIcon] = useState<string>("sparkles");
  const [target, setTarget] = useState("");
  const [cta, setCta] = useState("");
  const [link, setLink] = useState("");
  const err = (f: string) => (state?.field === f ? state.error : null);
  const href = target === "link" ? link : target;

  return (
    <form action={action} className="space-y-3.5 pb-2">
      <p className="rounded-2xl bg-brand-soft px-3.5 py-2.5 text-[0.8438rem] leading-relaxed text-brand-deep">{t.aNewsRule}</p>

      <label className="block">
        <span className={label}>{t.aNewsTitle}</span>
        <input name="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder={t.aNewsTitlePh} className={`h-12 ${field}`} />
        {err("title") && <span className="mt-1 block px-1 text-[0.8125rem] font-medium text-coral">{err("title")}</span>}
      </label>

      <label className="block">
        <span className={label}>{t.aNewsBody}</span>
        <textarea name="body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={400} rows={3} placeholder={t.aNewsBodyPh} className={`resize-none py-3 leading-relaxed ${field}`} />
        {err("body") && <span className="mt-1 block px-1 text-[0.8125rem] font-medium text-coral">{err("body")}</span>}
      </label>

      <div>
        <span className={label}>{t.aNewsIcon}</span>
        <div className="grid grid-cols-6 gap-1.5">
          {NEWS_ICONS.map((i) => (
            <button key={i} type="button" onClick={() => setIcon(i)} aria-pressed={icon === i} aria-label={i} className={`press grid h-12 place-items-center rounded-[0.875rem] ${icon === i ? "bg-brand-soft ring-2 ring-brand" : "bg-surface shadow-card"}`}>
              <Icon3D name={i} size={28} />
            </button>
          ))}
        </div>
        <input type="hidden" name="icon" value={icon} />
      </div>

      <div>
        <span className={label}>{t.aNewsCta}</span>
        <div className="flex flex-wrap gap-1.5">
          {[{ href: "", label: t.aNewsCtaNone }, ...NEWS_TARGETS, { href: "link", label: t.aNewsToLink }].map((x) => (
            <button key={x.href || "none"} type="button" onClick={() => setTarget(x.href)} aria-pressed={target === x.href} className={`press rounded-full px-3 py-1.5 text-[0.8125rem] font-semibold ${target === x.href ? "bg-brand text-white" : "bg-surface text-body shadow-card"}`}>
              {x.label}
            </button>
          ))}
        </div>
        <input type="hidden" name="cta_target" value={target} />
        {target && (
          <div className="mt-2.5 space-y-2.5">
            <label className="block">
              <span className={label}>{t.aNewsCtaLabel}</span>
              <input name="cta_label" value={cta} onChange={(e) => setCta(e.target.value)} maxLength={30} placeholder={t.aNewsCtaLabelPh} className={`h-12 ${field}`} />
              {err("cta_label") && <span className="mt-1 block px-1 text-[0.8125rem] font-medium text-coral">{err("cta_label")}</span>}
            </label>
            {target === "link" && (
              <label className="block">
                <span className={label}>{t.aNewsCtaLink}</span>
                <input name="cta_link" value={link} onChange={(e) => setLink(e.target.value)} maxLength={300} dir="ltr" placeholder="https://…" className={`h-12 text-left ${field}`} />
                {err("cta_link") && <span className="mt-1 block px-1 text-[0.8125rem] font-medium text-coral">{err("cta_link")}</span>}
              </label>
            )}
          </div>
        )}
      </div>

      {/* the card, as the owners will see it */}
      <div>
        <span className={label}>{t.aNewsPreview}</span>
        <div className="rounded-[1.5rem] bg-[rgb(20_16_40/0.45)] px-5 pb-5 pt-14">
          <NewsCard news={{ title: title.trim(), body: body.trim(), icon, cta_label: target ? cta.trim() || "…" : null, cta_href: target ? href || "/" : null }} />
        </div>
      </div>

      {state?.error && !state.field && <p className="rounded-2xl bg-coral-soft px-4 py-3 text-[0.9062rem] font-medium text-coral">{state.error}</p>}
      <Btn type="submit" disabled={pending}>
        {pending ? t.checking : t.aNewsPublish}
      </Btn>
    </form>
  );
}
