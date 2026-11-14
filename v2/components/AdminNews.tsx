"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Send, Trash2, X } from "lucide-react";
import { Icon3D } from "@/components/ui";
import { adminNewsActive, adminNewsDelete, adminNewsSend } from "@/app/actions-bell";
import { B, BELL_ICONS, type SentNews } from "@/lib/bell";
import { fill } from "@/lib/t";

const field = "h-11 w-full rounded-[0.75rem] bg-surface px-3 text-[16px] text-ink outline-none ring-1 ring-line placeholder:text-faint focus:ring-2 focus:ring-brand";
const day = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis" }).format(new Date(iso));

/**
 * The console's «الإشعارات»: write to the owners — every shop, or the one whose page sent the founder
 * here — and see who read what. What is written lands in their 🔔 at once (and pops up once on the home).
 * The card under the fields is the note as the owner will see it.
 */
export function AdminNews({ list, to }: { list: SentNews[]; to: { id: string; shop: string } | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [who, setWho] = useState(to);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [icon, setIcon] = useState<string>("sparkles");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaHref, setCtaHref] = useState("");
  const [push, setPush] = useState(true);
  const [said, setSaid] = useState<{ ok: boolean; text: string } | null>(null);
  const can = title.trim().length >= 2 && title.trim().length <= 80 && body.trim().length <= 400;

  const send = () =>
    start(async () => {
      setSaid(null);
      const r = await adminNewsSend({ title, body, icon, ctaLabel, ctaHref, to: who?.id ?? null, push });
      if (!r.ok) return setSaid({ ok: false, text: B.aBad });
      setSaid({ ok: true, text: push ? fill(B.aSentPush, { n: r.pushed ?? 0 }) : B.aSent });
      setTitle("");
      setBody("");
      setCtaLabel("");
      setCtaHref("");
      router.refresh();
    });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-[1.5rem] font-bold text-ink">
          <Bell className="size-6 text-brand" /> {B.aTitle}
        </h1>
        <p className="mt-0.5 text-[0.875rem] text-muted">{B.aHint}</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (can && !pending) send();
        }}
        className="space-y-3 rounded-[1.125rem] bg-surface p-4 shadow-card ring-1 ring-line/70"
      >
        <b className="block text-[1rem] text-ink">{B.aNew}</b>
        {/* who it goes to: everybody, or the one owner (chosen from the shop's page) */}
        <div className="flex flex-wrap items-center gap-2 text-[0.875rem]">
          <span className="font-semibold text-muted">{B.aFor}</span>
          {who ? (
            <>
              <span className="rounded-full bg-brand-soft px-3 py-1 font-bold text-brand">
                <bdi>{fill(B.aOne, { shop: who.shop })}</bdi>
              </span>
              <button type="button" onClick={() => setWho(null)} className="press flex h-8 items-center gap-1 rounded-full px-2.5 font-semibold text-muted ring-1 ring-line">
                <X className="size-3.5" /> {B.aToAll}
              </button>
            </>
          ) : (
            <span className="rounded-full bg-ink px-3 py-1 font-bold text-white">{B.aAll}</span>
          )}
        </div>
        <label className="block">
          <span className="mb-1 block text-[0.8125rem] font-semibold text-muted">{B.aHead}</span>
          <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 80))} placeholder={B.aHeadPh} className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[0.8125rem] font-semibold text-muted">{B.aBody}</span>
          <textarea value={body} onChange={(e) => setBody(e.target.value.slice(0, 400))} placeholder={B.aBodyPh} rows={3} className={`${field} h-auto py-2.5 leading-relaxed`} />
        </label>
        <div>
          <span className="mb-1 block text-[0.8125rem] font-semibold text-muted">{B.aIcon}</span>
          <div className="flex flex-wrap gap-1.5">
            {BELL_ICONS.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setIcon(name)}
                aria-pressed={icon === name}
                className={`press grid size-11 place-items-center rounded-[0.75rem] ${icon === name ? "bg-brand-soft ring-2 ring-brand" : "bg-canvas ring-1 ring-line"}`}
              >
                <Icon3D name={name} size={26} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="mb-1 block text-[0.8125rem] font-semibold text-muted">{B.aCta}</span>
          <div className="grid grid-cols-[2fr_3fr] gap-2">
            <input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value.slice(0, 30))} placeholder={B.aCtaLabelPh} aria-label={B.aCtaLabel} className={field} />
            <input value={ctaHref} onChange={(e) => setCtaHref(e.target.value.slice(0, 300))} placeholder="/shop/stats" aria-label={B.aCtaHref} dir="ltr" className={field} />
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2.5 text-[0.875rem] font-semibold text-body">
          <input type="checkbox" checked={push} onChange={(e) => setPush(e.target.checked)} className="size-5 accent-[#6c47ff]" />
          {B.aPush}
        </label>

        {/* the note as the owner will see it in the bell */}
        {(title || body) && (
          <div className="rounded-[1rem] bg-canvas p-3">
            <div className="flex items-start gap-3 rounded-[1rem] bg-surface p-3 shadow-card">
              <span className="grid size-11 shrink-0 place-items-center rounded-[0.875rem] bg-brand-soft">
                <Icon3D name={icon} size={28} />
              </span>
              <div className="min-w-0 flex-1">
                <b className="block text-[0.9688rem] leading-snug text-ink">
                  <bdi>{title || "…"}</bdi>
                </b>
                {body && (
                  <p className="mt-0.5 whitespace-pre-line text-[0.875rem] leading-relaxed text-body">
                    <bdi>{body}</bdi>
                  </p>
                )}
                {ctaLabel && ctaHref && <span className="mt-2 inline-flex h-8 items-center rounded-full bg-brand-soft px-3 text-[0.8125rem] font-bold text-brand">{ctaLabel} ←</span>}
              </div>
            </div>
          </div>
        )}

        <button type="submit" disabled={!can || pending} className="press flex h-12 w-full items-center justify-center gap-2 rounded-[0.875rem] bg-brand text-[1rem] font-bold text-white disabled:opacity-50">
          <Send className="size-4" /> {pending ? B.aSending : B.aSend}
        </button>
        {said && <p className={`text-center text-[0.875rem] font-semibold ${said.ok ? "text-mint" : "text-coral"}`}>{said.text}</p>}
      </form>

      <section>
        <h2 className="mb-2 text-[1rem] font-bold text-ink">{B.aList}</h2>
        {list.length === 0 ? (
          <p className="rounded-[1rem] bg-surface p-4 text-[0.875rem] text-muted shadow-card">{B.aNone}</p>
        ) : (
          <ul className="space-y-2">
            {list.map((n) => (
              <Sent key={n.id} n={n} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** One piece sent: what it said, to how many, how many read it, how many tapped its button — stop it, or take it away. */
function Sent({ n }: { n: SentNews }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sure, setSure] = useState(false);
  return (
    <li className={`rounded-[1rem] bg-surface p-3 shadow-card ring-1 ring-line/70 ${n.active ? "" : "opacity-60"}`}>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-[0.75rem] bg-canvas">
          <Icon3D name={n.icon || "sparkles"} size={24} lazy />
        </span>
        <div className="min-w-0 flex-1">
          <b className="block truncate text-[0.9375rem] text-ink">
            <bdi>{n.title}</bdi>
          </b>
          {n.body && (
            <p className="line-clamp-2 text-[0.8125rem] text-muted">
              <bdi>{n.body}</bdi>
            </p>
          )}
          <p className="mt-1 text-[0.75rem] font-semibold text-body">
            {day(n.published_at)} · {fill(B.aStats, { a: n.audience, s: n.seen, c: n.clicked })}
            {n.only && <span className="ms-1.5 rounded-full bg-brand-soft px-1.5 py-px text-brand">{B.aOneShop}</span>}
            {!n.active && <span className="ms-1.5 rounded-full bg-coral-soft px-1.5 py-px text-coral">{B.aOff}</span>}
          </p>
        </div>
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await adminNewsActive(n.id, !n.active);
              router.refresh();
            })
          }
          className="press h-9 rounded-[0.625rem] px-3 text-[0.8125rem] font-bold text-body ring-1 ring-line disabled:opacity-50"
        >
          {n.active ? B.aStop : B.aResume}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!sure) return setSure(true);
            start(async () => {
              await adminNewsDelete(n.id);
              router.refresh();
            });
          }}
          onBlur={() => setSure(false)}
          className={`press flex h-9 items-center gap-1 rounded-[0.625rem] px-3 text-[0.8125rem] font-bold disabled:opacity-50 ${sure ? "bg-coral text-white" : "text-coral ring-1 ring-coral/30"}`}
        >
          <Trash2 className="size-3.5" /> {sure ? B.aSure : B.aDelete}
        </button>
      </div>
    </li>
  );
}
