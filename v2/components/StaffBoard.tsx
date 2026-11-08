"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, Lock, MessageCircle, Plus, Smartphone, X } from "lucide-react";
import { staffInvite, staffInviteCancel, staffRemove } from "@/app/actions-packs";
import { Top } from "@/components/Top";
import { useScreen } from "@/components/Tracker";
import { Btn } from "@/components/ui";
import { P, type MyStaff, type StaffDid } from "@/lib/packs";
import { fill, giftsN, stampsN } from "@/lib/t";

const ERR: Record<string, string> = { full: P.staffFull, not_allowed: P.staffNotPro };

/** «3 بالنومرو · زوز كادوات · 1 رجّعهم», or null when the phone gave nothing by hand */
function didSaid(d: StaffDid | undefined): string | null {
  if (!d) return null;
  const parts = [d.stamps > 0 ? fill(P.staffByNumber, { n: stampsN(d.stamps) }) : null, d.gifts > 0 ? giftsN(d.gifts) : null, d.back > 0 ? fill(P.staffBack, { n: stampsN(d.back) }) : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/**
 * The owner's staff phones (Pro): who works the counter on their own phone, the room left, a link to
 * invite one more — sent on WhatsApp, one use, a day — and each one signed out with a tap. Each phone
 * gives tampons and hands gifts over for the shop, and sees nothing else.
 */
export function StaffBoard({ staff, shop }: { staff: MyStaff; shop: string }) {
  useScreen("staff");
  const router = useRouter();
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [asking, setAsking] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [gone, setGone] = useState(false);
  const full = staff.staff.length >= staff.max;
  const invite = () =>
    start(async () => {
      const res = await staffInvite();
      if (!res.ok) return setError(ERR[res.error] ?? P.err);
      setError(null);
      setUrl(res.url);
      setCopied(false);
    });
  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <>
      <Top back="/shop/system" title={P.staffTitle} hint={P.staffHint} />
      <div data-list className="-mx-1 mt-[1.5dvh] min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-1 pb-4">
        {staff.max === 0 ? (
          <p className="flex items-center gap-2 rounded-[1.125rem] bg-[#fff2c7] px-4 py-3 text-[0.875rem] font-bold text-[#8a5a00]">
            <Lock className="size-4 shrink-0" /> {P.staffNotPro}
          </p>
        ) : (
          <>
            <section className="rounded-[1.25rem] bg-surface shadow-card">
              <p className="flex items-center justify-between px-4 pt-3 text-[0.8125rem] font-bold text-muted">
                <span>{P.staffTitle}</span>
                <span>{fill(P.staffOf, { n: staff.staff.length, max: staff.max })}</span>
              </p>
              {staff.staff.length === 0 ? (
                <p className="px-4 pb-4 pt-2 text-[0.875rem] text-muted">{P.staffNone}</p>
              ) : (
                <ul className="divide-y divide-line px-1 pb-1">
                  {staff.staff.map((s) => (
                    <li key={s.id} className="px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                          <Smartphone className="size-[1.125rem]" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <b className="block truncate text-[0.9375rem]">{s.name ?? "—"}</b>
                          {s.phone && (
                            <span className="block text-[0.75rem] text-muted">
                              <bdi dir="ltr">{s.phone}</bdi>
                            </span>
                          )}
                          {/* what this phone gave by hand: today, and these 7 days */}
                          <span className="mt-0.5 block text-[0.75rem] font-semibold text-body">{fill(P.staffToday, { what: didSaid(s.today) ?? P.staffNothing })}</span>
                          {didSaid(s.week) && didSaid(s.week) !== didSaid(s.today) && <span className="block text-[0.75rem] text-muted">{fill(P.staffWeek, { what: didSaid(s.week)! })}</span>}
                        </span>
                        <button type="button" onClick={() => setAsking(asking === s.id ? null : s.id)} className="press flex h-8 items-center gap-1 rounded-full px-3 text-[0.8125rem] font-semibold text-coral ring-1 ring-coral/30">
                          <X className="size-3.5" /> {P.staffRemove}
                        </button>
                      </div>
                      {asking === s.id && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-[0.75rem] bg-canvas p-2.5">
                          <span className="min-w-0 flex-1 text-[0.8125rem] font-semibold">{fill(P.staffRemoveAsk, { name: s.name ?? "—" })}</span>
                          <button type="button" onClick={() => setAsking(null)} className="h-8 rounded-[0.5rem] bg-surface px-3 text-[0.8125rem] font-semibold text-body ring-1 ring-line">
                            {P.cancel}
                          </button>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() =>
                              start(async () => {
                                const ok = await staffRemove(s.id);
                                setAsking(null);
                                if (!ok) return setError(P.err);
                                router.refresh();
                              })
                            }
                            className="h-8 rounded-[0.5rem] bg-coral px-3 text-[0.8125rem] font-bold text-white disabled:opacity-60"
                          >
                            {pending ? "…" : "إيه"}
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {staff.staff.length > 0 && <p className="border-t border-line px-4 py-2.5 text-[0.75rem] leading-snug text-muted">{P.staffDidHint}</p>}
            </section>

            {/* the links sent and not used yet: still open for 24 hours — called off with a tap (sent to the wrong person, or not needed) */}
            {!url && (staff.invites ?? 0) > 0 && (
              <p className="flex items-center gap-2 rounded-[1.125rem] bg-surface px-4 py-2.5 text-[0.8125rem] font-semibold text-body shadow-card">
                <span className="min-w-0 flex-1">{staff.invites === 1 ? P.staffInvitesOne : fill(P.staffInvitesMany, { n: staff.invites ?? 0 })}</span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const n = await staffInviteCancel();
                      if (n === null) return setError(P.err);
                      setError(null);
                      setGone(true);
                      router.refresh();
                    })
                  }
                  className="press h-8 shrink-0 rounded-full px-3 text-[0.8125rem] font-bold text-coral ring-1 ring-coral/30 disabled:opacity-60"
                >
                  {P.staffInvitesCancel}
                </button>
              </p>
            )}
            {gone && (staff.invites ?? 0) === 0 && <p className="text-center text-[0.8125rem] font-semibold text-mint">{P.staffInvitesGone}</p>}

            {url ? (
              <section className="space-y-2 rounded-[1.25rem] bg-surface p-4 shadow-card">
                <p className="text-[0.8125rem] leading-relaxed text-body">{P.staffLink}</p>
                <p className="num break-all rounded-[0.75rem] bg-canvas px-3 py-2 text-[0.75rem]" dir="ltr">
                  {url}
                </p>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(fill(P.staffMsg, { shop, url }))}`}
                    target="_blank"
                    rel="noreferrer"
                    className="press flex h-11 items-center justify-center gap-2 rounded-[0.875rem] bg-[#25D366] text-[0.9375rem] font-bold text-white"
                  >
                    <MessageCircle className="size-5" /> {P.staffShare}
                  </a>
                  <button type="button" onClick={() => void copy()} className="press flex h-11 items-center gap-1.5 rounded-[0.875rem] bg-brand-soft px-3.5 text-[0.875rem] font-bold text-brand">
                    <Copy className="size-4" /> {copied ? P.staffCopied : P.staffCopy}
                  </button>
                </div>
              </section>
            ) : (
              <Btn type="button" onClick={invite} disabled={pending || full}>
                <Plus className="size-5" /> {full ? P.staffFull : P.staffAdd}
              </Btn>
            )}
          </>
        )}
        {error && <p className="text-center text-[0.8125rem] font-semibold text-coral">{error}</p>}
      </div>
    </>
  );
}
