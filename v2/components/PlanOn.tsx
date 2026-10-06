"use client";

import { useEffect, useRef, useState } from "react";
import { planSeen } from "@/app/actions";
import { Btn, Icon3D } from "@/components/ui";
import { pixel } from "@/lib/pixel";
import { signal } from "@/lib/track";
import { fill, monthsSaid, t } from "@/lib/t";

export type Grant = { id: number; kind: "paid" | "until" | "end"; months: number | null; until: string; note: string | null; method?: string | null; amount?: number | null };

const day = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Tunis" }).format(new Date(iso));

/**
 * The owner paid by hand and the founder turned the access on: said once on
 * the owner's home, plainly — «الأبونمان متاعك تفعّل», «مخلّص عامين، حتى 5
 * أكتوبر 2028», the founder's own word if he wrote one, and «Merci pour votre
 * confiance.» No party: the owner paid, nothing was given. Written as seen
 * the moment it shows, so it never comes back, on this phone or another.
 */
export function PlanOn({ grant }: { grant: Grant }) {
  const [open, setOpen] = useState(true);
  const said = useRef(false);
  useEffect(() => {
    if (said.current) return;
    said.current = true;
    signal("plan_on", grant.months ? `${grant.months}` : grant.kind);
    // what came in, for the ad that brought this owner (months added with no money are not a sale)
    if (grant.amount) pixel("Purchase", { value: grant.amount, currency: "TND", content_name: "abonnement" });
    void planSeen(grant.id).catch(() => {});
  }, [grant]);
  if (!open) return null;

  const until = day(grant.until);
  return (
    <div className="fixed inset-0 z-50 flex animate-fade items-center justify-center bg-[rgb(20_16_40/0.5)] px-6 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label={t.grantTitle} onClick={() => setOpen(false)}>
      <style>{`@keyframes plan-in { from { opacity: 0; transform: translateY(18px) scale(0.96); } to { opacity: 1; transform: none; } }`}</style>
      <div className="w-full max-w-sm rounded-[1.75rem] bg-surface px-6 pb-5 pt-[clamp(1.25rem,4dvh,1.75rem)] text-center text-ink" style={{ animation: "plan-in 420ms cubic-bezier(0.2,0.8,0.2,1) both" }} onClick={(e) => e.stopPropagation()}>
        <Icon3D name="crown" size={72} className="mx-auto" />
        <h2 className="mt-2 text-balance text-[1.5rem] font-bold leading-tight">{t.grantTitle}</h2>
        <p className="mt-3 rounded-[1rem] bg-mint-soft px-3 py-2.5 text-[1rem] font-bold text-mint">
          {grant.months ? fill(t.grantPaidFor, { d: monthsSaid(grant.months), date: until }) : fill(t.grantUntil, { date: until })}
        </p>
        {grant.note && <p className="mt-3 text-balance text-[1rem] leading-relaxed text-body">«{grant.note}»</p>}
        <p dir="ltr" lang="fr" className="mt-3 text-[1rem] font-semibold text-body">
          {t.grantThanks}
        </p>
        <Btn type="button" className="mt-4" onClick={() => setOpen(false)}>
          {t.grantOk}
        </Btn>
      </div>
    </div>
  );
}
