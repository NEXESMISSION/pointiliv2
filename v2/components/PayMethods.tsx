"use client";

import { MessageCircle, Phone } from "lucide-react";
import { payRequest } from "@/app/actions";
import { BankMark, CashMark, D17Mark, PostMark } from "@/components/PayLogos";
import { signal } from "@/lib/track";
import { fill, t } from "@/lib/t";

// the D17 mark carries its own name, so it is not written twice under it
const WAYS = [
  { title: "", mark: <D17Mark /> },
  { title: "Virement", mark: <BankMark /> },
  { title: "Versement", mark: <CashMark /> },
  { title: "Mandat", mark: <PostMark /> },
];

/**
 * The ways to pay, simply shown — D17, a transfer, a deposit at the bank, a
 * money order — and the two buttons that go on with it: a call, or a
 * WhatsApp already written. Either one tells the founder a payment is coming.
 */
export function PayMethods({ support, shop, months }: { support: string | null; shop: string; months: number }) {
  const said = (how: string) => {
    signal("pay", how);
    void payRequest("contact").catch(() => {});
  };
  const wa = support ? `https://wa.me/${support}?text=${encodeURIComponent(fill(t.payWhatsappMsg, { shop, months }))}` : null;
  return (
    <>
      <h2 className="mb-2.5 mt-[2.4dvh] px-0.5 text-[0.9375rem] font-bold">{t.payWays}</h2>
      <ul className="grid grid-cols-4 gap-2">
        {WAYS.map((w, i) => (
          <li key={i} className="flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-[1.125rem] bg-surface px-1 py-3 shadow-card [@media(max-height:540px)]:py-2">
            {w.title ? (
              <>
                <span className="[&>svg]:size-10">{w.mark}</span>
                <span className="w-full truncate text-center text-[0.75rem] font-bold" dir="ltr">
                  {w.title}
                </span>
              </>
            ) : (
              <span className="[&>svg]:size-12">{w.mark}</span>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-[2.4dvh] text-balance text-center text-[0.9375rem] leading-relaxed text-body">{t.payHow}</p>
      {support && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a href={`tel:+${support}`} onClick={() => said("call")} className="press flex h-[3.5rem] items-center justify-center gap-2 rounded-[1.25rem] bg-brand text-[1.0312rem] font-bold text-white">
            <Phone className="size-5" /> {t.helpCall}
          </a>
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer" onClick={() => said("whatsapp")} className="press flex h-[3.5rem] items-center justify-center gap-2 rounded-[1.25rem] bg-[#25D366] text-[1.0312rem] font-bold text-white">
              <MessageCircle className="size-5" /> {t.helpWhatsapp}
            </a>
          )}
        </div>
      )}
    </>
  );
}
