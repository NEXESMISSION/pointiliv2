"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle, Phone } from "lucide-react";
import { payRequest } from "@/app/actions";
import { BankMark, CashMark, D17Mark, PostMark } from "@/components/PayLogos";
import { signal } from "@/lib/track";
import { fill, t } from "@/lib/t";

// the D17 mark carries its own name, so it is not written twice under it
const WAYS = [
  { key: "D17", title: "", mark: <D17Mark /> },
  { key: "Virement", title: "Virement", mark: <BankMark /> },
  { key: "Versement", title: "Versement", mark: <CashMark /> },
  { key: "Mandat", title: "Mandat", mark: <PostMark /> },
];

/**
 * The ways to pay, simply shown — D17, a transfer, a deposit at the bank, a
 * money order — and the two buttons that go on with it: a call, or a
 * WhatsApp already written. Either one tells the founder a payment is coming.
 * The ways are buttons too (owners kept tapping them, and nothing happened):
 * each opens the same WhatsApp, the way named in it.
 */
export function PayMethods({ support, shop, months, details }: { support: string | null; shop: string; months: number; details?: { d17: string | null; banks: { bank: string | null; rib: string }[] } }) {
  const said = (how: string) => {
    signal("pay", how);
    void payRequest("contact").catch(() => {});
  };
  const wa = support ? `https://wa.me/${support}?text=${encodeURIComponent(fill(t.payWhatsappMsg, { shop, months }))}` : null;
  const waWay = (way: string) => (support ? `https://wa.me/${support}?text=${encodeURIComponent(fill(t.payWhatsappWay, { shop, months, way }))}` : null);
  return (
    <>
      <h2 className="mb-2.5 mt-[2.4dvh] px-0.5 text-[0.9375rem] font-bold">{t.payWays}</h2>
      {/* the four ways' marks: the smallest phones keep the numbers to copy and the two buttons */}
      <ul className={`grid grid-cols-4 gap-2 ${details?.d17 || details?.banks.length ? "[@media(max-height:500px)]:hidden" : ""}`}>
        {WAYS.map((w) => {
          const href = waWay(w.key);
          const face = w.title ? (
              <>
                <span className="[&>svg]:size-9">{w.mark}</span>
                <span className="w-full truncate text-center text-[0.75rem] font-bold" dir="ltr">
                  {w.title}
                </span>
              </>
            ) : (
              <span className="[&>svg]:size-11">{w.mark}</span>
            );
          const look = "flex min-w-0 flex-col items-center justify-center gap-1 rounded-[1.125rem] bg-surface px-1 py-2 shadow-card";
          return (
            <li key={w.key} className="min-w-0">
              {href ? (
                <a href={href} target="_blank" rel="noreferrer" onClick={() => said(`way · ${w.key}`)} className={`press h-full ${look}`} aria-label={w.key}>
                  {face}
                </a>
              ) : (
                <span className={`h-full ${look}`}>{face}</span>
              )}
            </li>
          );
        })}
      </ul>
      {/* where the money goes, when the founder wrote it in the console: the D17 number, the account */}
      {(details?.d17 || !!details?.banks.length) && (
        <div className="mt-2 divide-y divide-line rounded-[1.125rem] bg-surface shadow-card">
          {details.d17 && <Detail label="D17" value={details.d17} />}
          {/* each account: its bank under the RIB (the holder's name is not shown) */}
          {details.banks.map((b) => (
            <Detail key={b.rib} label={t.payRib} value={b.rib} sub={b.bank} />
          ))}
        </div>
      )}
      {/* on a short phone the two buttons say it themselves: the sentence over them steps aside */}
      <p className="mt-[2.4dvh] text-balance text-center text-[0.9375rem] leading-relaxed text-body [@media(max-height:600px)]:hidden">{t.payHow}</p>
      {support && (
        <div className="mt-3 grid grid-cols-2 gap-2 [@media(max-height:600px)]:mt-[2.4dvh]">
          <a href={`tel:+${support}`} onClick={() => said("call")} className="press flex h-[3.5rem] items-center justify-center gap-2 rounded-[1.25rem] bg-brand text-[1.0625rem] font-bold text-white">
            <Phone className="size-5" /> {t.helpCall}
          </a>
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer" onClick={() => said("whatsapp")} className="press flex h-[3.5rem] items-center justify-center gap-2 rounded-[1.25rem] bg-[#25D366] text-[1.0625rem] font-bold text-white">
              <MessageCircle className="size-5" /> {t.helpWhatsapp}
            </a>
          )}
        </div>
      )}
    </>
  );
}

/** One way's detail — the D17 number, the RIB — and a copy button beside it. */
function Detail({ label, value, sub }: { label: string; value: string; sub?: string | null }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(value.replace(/\s+/g, "")).then(() => {
      setCopied(true);
      signal("pay", `copy · ${label}`);
      setTimeout(() => setCopied(false), 1600);
    }).catch(() => {});
  };
  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5">
      <span className="w-12 shrink-0 text-[0.8125rem] font-bold text-muted" dir="ltr">{label}</span>
      <span className="min-w-0 flex-1">
        <bdi dir="ltr" className="num block truncate text-[0.9375rem] font-bold">{value}</bdi>
        {/* a bank's name in Latin letters loses its end, never its start */}
        {sub && (
          <bdi dir="auto" className="block truncate text-[0.75rem] text-muted">
            {sub}
          </bdi>
        )}
      </span>
      <button type="button" onClick={copy} className="press flex h-9 shrink-0 items-center gap-1 rounded-full bg-brand-soft px-3 text-[0.8125rem] font-bold text-brand">
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? t.payCopied : t.payCopy}
      </button>
    </div>
  );
}
