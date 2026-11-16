"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { BankMark, CashMark, D17Mark, PostMark } from "@/components/PayLogos";
import { signal } from "@/lib/track";
import { t } from "@/lib/t";

/**
 * The ways to pay and how each is shown, for the pay page's steps (components/PaySteps): D17, a transfer, a deposit
 * at the bank, a money order. The D17 mark carries its own name, so it is not written twice beside it.
 */
export const WAYS = [
  { key: "D17", title: "", mark: <D17Mark /> },
  { key: "Virement", title: "Virement", mark: <BankMark /> },
  { key: "Versement", title: "Versement", mark: <CashMark /> },
  { key: "Mandat", title: "Mandat", mark: <PostMark /> },
];

/** «58 415 521», the account's number as the founder reads it back (any +216 left off). */
export const spaced = (phone: string) => {
  const d = phone.replace(/\D/g, "").replace(/^216(?=\d{8}$)/, "");
  return /^\d{8}$/.test(d) ? `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}` : phone;
};

/**
 * A RIB as a bank prints it — bank, branch, account, key: «24 031 1680052511101 32» — however it was typed in the
 * console (16 Nov 2026: the BTE one was typed in other groups). Anything that is not 20 digits stays as typed.
 */
export const ribSaid = (rib: string) => {
  const d = rib.replace(/\D/g, "");
  return /^\d{20}$/.test(d) ? `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 18)} ${d.slice(18)}` : rib;
};

/** One way's detail — the D17 number, the RIB — and a copy button beside it (the copy has no spaces). */
export function Detail({ label, value, sub }: { label: string; value: string; sub?: string | null }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(value.replace(/\s+/g, "")).then(() => {
      setCopied(true);
      signal("pay", `copy · ${label}`);
      setTimeout(() => setCopied(false), 1600);
    }).catch(() => {});
  };
  const shown = label === t.payRib ? ribSaid(value) : value;
  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5">
      <span className="min-w-0 flex-1">
        {/* the number whole, never cut (a RIB is 23 characters: a smaller size, and it wraps rather than hide its end on
            the narrowest phone); what it is — «RIB», the bank — under it, and that line may lose its end */}
        <bdi dir="ltr" className={`num block font-bold [overflow-wrap:anywhere] ${shown.length > 14 ? "text-[0.8125rem]" : "text-[0.9375rem]"}`}>
          {shown}
        </bdi>
        {/* in Latin letters, the whole line left to right: a long bank name loses its end, never its start */}
        <span dir="ltr" className="block truncate text-end text-[0.75rem] text-muted">
          <b className="font-bold">{label}</b>
          {sub && <> · {sub}</>}
        </span>
      </span>
      <button type="button" onClick={copy} className="press flex h-9 shrink-0 items-center gap-1 rounded-full bg-brand-soft px-3 text-[0.8125rem] font-bold text-brand">
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? t.payCopied : t.payCopy}
      </button>
    </div>
  );
}
