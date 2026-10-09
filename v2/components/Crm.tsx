"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, Trash2, X } from "lucide-react";
import { crmLog, crmSet, crmUnlog } from "@/app/admin/crm/actions";
import { Ago } from "@/components/Ago";
import { Reach } from "@/components/Presence";
import { ShopMark } from "@/components/ShopMark";
import { CBtn, Num, Pill } from "@/components/console";
import { KINDS, OUTCOMES, PAID, STAGES, dayFromToday, daySaid, daysFromToday, said, stageOf, type Kind, type Outcome, type Stage } from "@/lib/crm";
import { pretty } from "@/lib/phone";
import { t } from "@/lib/t";

export type Line = { id: number; kind: string; outcome: string | null; text: string; at: string };
export type CrmShop = { id: string; name: string; kind: string; color: string; logo: string | null; paid: boolean; owner: { name: string; phone: string | null } };
export type CrmOf = { stage: Stage; next_at: string | null; note: string; log: Line[] };

const chip = (on: boolean, tone = "bg-ink text-white") => `inline-flex h-8 items-center rounded-full px-3 text-[0.8125rem] font-semibold transition-colors ${on ? tone : "border border-line bg-surface text-body hover:border-brand hover:text-brand"}`;
const head = "mb-1.5 text-[0.8125rem] font-bold text-muted";
const field = "h-10 w-full rounded-[0.625rem] border border-line bg-surface px-3 text-[16px] text-ink outline-none placeholder:text-faint focus:border-brand";

/**
 * One shop's follow-up, opened from the list (the address keeps it open, so a
 * refresh brings it back and «back» closes it): where it stands, the day to
 * come back, the note, a word written down in two taps, and every word so far.
 * What is chosen shows at once; the page follows with the answer.
 */
export function CrmSheet({ shop, data, closeHref }: { shop: CrmShop; data: CrmOf; closeHref: string }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>(data.stage);
  const [next, setNext] = useState(data.next_at ?? "");
  const [note, setNote] = useState(data.note);
  const [kind, setKind] = useState<Kind | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [ask, setAsk] = useState<number | null>(null);

  const close = () => router.push(closeHref);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && router.push(closeHref);
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [closeHref, router]);

  const run = async (what: string, fn: () => Promise<boolean>) => {
    setBusy(what);
    setError(false);
    try {
      if (await fn()) router.refresh();
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setBusy(null);
    }
  };
  const pickStage = (s: Stage) => {
    const before = stage;
    setStage(s);
    void run("stage", async () => {
      const r = await crmSet(shop.id, { stage: s });
      if (!r.ok) setStage(before);
      return r.ok;
    });
  };
  const pickNext = (d: string | null) => {
    setNext(d ?? "");
    void run("next", async () => (await crmSet(shop.id, { next: d })).ok);
  };
  const saveNote = () => void run("note", async () => (await crmSet(shop.id, { note: note.trim() })).ok);
  const writeLine = () => {
    if (!kind) return;
    const k = kind;
    const o = outcome;
    const x = text;
    void run("log", async () => {
      const r = await crmLog(shop.id, k, o, x);
      if (r.ok) {
        setKind(null);
        setOutcome(null);
        setText("");
        if (r.stage) setStage(r.stage);
      }
      return r.ok;
    });
  };
  const takeBack = (id: number) =>
    void run(`del-${id}`, async () => {
      const ok = await crmUnlog(shop.id, id);
      if (ok) setAsk(null);
      return ok;
    });
  const needsOutcome = !!kind && OUTCOMES[kind].length > 0;
  const canWrite = !!kind && (!needsOutcome || !!outcome) && (kind !== "note" || text.trim().length > 0) && busy !== "log";
  const overdue = !!next && daysFromToday(next) < 0;

  return (
    <div className="fixed inset-0 z-50 flex animate-fade items-end justify-center bg-ink/40 md:items-stretch md:justify-start" role="dialog" aria-modal="true" aria-label={shop.name} onClick={close}>
      <div
        className="flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-[1.5rem] bg-canvas text-ink shadow-[0_-20px_50px_-20px_rgb(0_0_0/0.5)] md:h-full md:max-h-none md:rounded-none md:rounded-e-[1.5rem] md:shadow-[20px_0_50px_-20px_rgb(0_0_0/0.4)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* the shop: who it is, a call and a WhatsApp, its own page, and out */}
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-[0.75rem]" style={{ background: shop.color }}>
            <ShopMark shop={shop} size={26} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <b className="truncate text-[1rem] font-bold">
                <bdi>{shop.name}</bdi>
              </b>
              {shop.paid && <Pill tone={PAID.tone}>{PAID.label}</Pill>}
            </span>
            {/* the owner on one line, the number whole on the next: a phone's width cuts a long name, never the number */}
            <span className="block truncate text-[0.8125rem] text-muted">
              <bdi>{shop.owner.name || t.aOwner}</bdi>
            </span>
            {shop.owner.phone && (
              <span className="block text-[0.75rem] text-muted">
                <Num>{pretty(shop.owner.phone)}</Num>
              </span>
            )}
          </span>
          <Reach phone={shop.owner.phone} size="md" />
          <Link href={closeHref} aria-label={t.back} className="press grid size-10 shrink-0 place-items-center rounded-full bg-surface shadow-card">
            <X className="size-5" />
          </Link>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 pb-6 pt-4">
          {/* where it stands */}
          <section>
            <h3 className={head}>وين وصل</h3>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="وين وصل">
              {STAGES.map((s) => (
                <button key={s.id} type="button" role="radio" aria-checked={stage === s.id} title={s.hint} disabled={busy === "stage"} onClick={() => pickStage(s.id)} className={chip(stage === s.id)}>
                  {s.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[0.75rem] text-faint">{stageOf(stage).hint} · «ما جاوبش» و«كلّمناه» يتحطّو وحدهم كي تسجّل تليفون ولا واتساب</p>
          </section>

          {/* the day to come back */}
          <section>
            <h3 className={head}>نعاودو</h3>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { label: "غدوة", day: dayFromToday(1) },
                { label: "بعد 3 أيّام", day: dayFromToday(3) },
                { label: "الأسبوع الجاي", day: dayFromToday(7) },
              ].map((x) => (
                <button key={x.day} type="button" disabled={busy === "next"} onClick={() => pickNext(x.day)} className={chip(next === x.day, "bg-brand text-white")}>
                  {x.label}
                </button>
              ))}
              <input type="date" value={next} min={dayFromToday(-365)} onChange={(e) => e.target.value && pickNext(e.target.value)} dir="ltr" aria-label="نهار" className="h-8 rounded-full border border-line bg-surface px-3 text-[0.8125rem] text-ink outline-none focus:border-brand" />
              {next && (
                <button type="button" disabled={busy === "next"} onClick={() => pickNext(null)} className="inline-flex h-8 items-center rounded-full px-2.5 text-[0.8125rem] font-semibold text-muted hover:text-coral">
                  امسح
                </button>
              )}
            </div>
            {next && <p className={`mt-1.5 text-[0.8125rem] font-semibold ${overdue ? "text-coral" : "text-brand"}`}>{daySaid(next)}</p>}
          </section>

          {/* a word written down */}
          <section>
            <h3 className={head}>سجّل كلمة</h3>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="شنوّة">
              {KINDS.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  role="radio"
                  aria-checked={kind === k.id}
                  onClick={() => {
                    setKind(kind === k.id ? null : k.id);
                    setOutcome(null);
                  }}
                  className={chip(kind === k.id, "bg-brand text-white")}
                >
                  {k.label}
                </button>
              ))}
            </div>
            {needsOutcome && (
              <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="شنوّة صار">
                {OUTCOMES[kind!].map((o) => (
                  <button key={o.id} type="button" role="radio" aria-checked={outcome === o.id} onClick={() => setOutcome(o.id)} className={chip(outcome === o.id)}>
                    {o.label}
                  </button>
                ))}
              </div>
            )}
            {kind && (
              <div className="mt-2 flex gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, 2000))}
                  placeholder={kind === "note" ? "اكتب النوت" : "شنوّة قال؟ (اختياري)"}
                  className={field}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canWrite) {
                      e.preventDefault();
                      writeLine();
                    }
                  }}
                />
                <CBtn kind="main" type="button" disabled={!canWrite} onClick={writeLine} className="h-10 shrink-0">
                  {busy === "log" ? t.checking : "سجّل"}
                </CBtn>
              </div>
            )}
          </section>

          {/* the note that stays on top */}
          <section>
            <h3 className={head}>نوت</h3>
            <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 2000))} rows={3} placeholder="شكون يقرّر، شنوّة يحب، شنوّة اتفقنا…" className="w-full rounded-[0.625rem] border border-line bg-surface px-3 py-2 text-[16px] leading-snug text-ink outline-none placeholder:text-faint focus:border-brand" />
            <div className="mt-1.5 flex justify-end">
              <CBtn type="button" disabled={note.trim() === data.note.trim() || busy === "note"} onClick={saveNote}>
                {busy === "note" ? t.checking : "سجّل النوت"}
              </CBtn>
            </div>
          </section>

          {/* every word so far */}
          <section>
            <h3 className={head}>الحركات</h3>
            {data.log.length === 0 ? (
              <p className="rounded-[0.75rem] bg-surface px-3 py-4 text-center text-[0.8438rem] text-muted">مازال حتى كلمة</p>
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-[0.75rem] border border-line bg-surface">
                {data.log.map((l) => (
                  <li key={l.id} className="flex items-start gap-2.5 px-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.875rem] font-semibold">{l.kind === "stage" ? `تبدّل: ${stageOf(l.text).label}` : said(l.kind, l.outcome)}</span>
                      {l.kind !== "stage" && l.text && <span className="block whitespace-pre-wrap text-[0.8438rem] text-body">{l.text}</span>}
                      <span className="block text-[0.75rem] text-muted">
                        <Ago at={l.at} />
                      </span>
                    </span>
                    {ask === l.id ? (
                      <span className="flex shrink-0 items-center gap-1">
                        <CBtn kind="coral" type="button" disabled={busy === `del-${l.id}`} onClick={() => takeBack(l.id)} className="h-8 px-2.5">
                          افسخ
                        </CBtn>
                        <CBtn type="button" onClick={() => setAsk(null)} className="h-8 px-2.5">
                          {t.back}
                        </CBtn>
                      </span>
                    ) : (
                      <button type="button" onClick={() => setAsk(l.id)} aria-label="افسخ السطر هذا" title="افسخ السطر هذا" className="grid size-8 shrink-0 place-items-center rounded-[0.5rem] text-faint transition-colors hover:bg-coral-soft hover:text-coral">
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {error && <p className="text-[0.8438rem] font-semibold text-coral">{t.errNetwork}</p>}

          <Link href={`/admin/shops/${shop.id}`} className="flex items-center justify-center gap-1 text-[0.875rem] font-bold text-brand">
            صفحة المحل والأرقام <ChevronLeft className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
