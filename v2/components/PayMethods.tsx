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
 * Paying, as three steps an owner follows (the founder, 17 Oct 2026: «help
 * them take an action»): ① how — D17, a transfer, a deposit at the bank, a
 * money order; none chosen at first — ② what to send, where: the amount and
 * the D17 number or the account, each with its copy button — ③ the receipt
 * on WhatsApp, already written with the shop and the way, and the year is
 * turned on the same day. Steps 2 and 3 wait, faded, until a way is chosen;
 * a call is always there for a question. Any tap tells the founder.
 */
export function PayMethods({ support, shop, months, details }: { support: string | null; shop: string; months: number; details?: { d17: string | null; banks: { bank: string | null; rib: string }[] } }) {
  const [way, setWay] = useState<string | null>(null);
  const said = (how: string) => {
    signal("pay", how);
    void payRequest("contact").catch(() => {});
  };
  const amount = t.payPrice;
  const receipt = support && way ? `https://wa.me/${support}?text=${encodeURIComponent(fill(t.payReceiptMsg, { shop, months, way }))}` : null;
  const how =
    way === "D17" ? fill(t.payD17How, { amount }) : way === "Virement" ? fill(t.payRibHow, { amount }) : way === "Versement" ? fill(t.payVersementHow, { amount }) : way === "Mandat" ? fill(t.payMandatHow, { amount }) : fill(t.paySendWhat, { amount });
  return (
    <>
      <ol className="mt-[2dvh] space-y-[1.8dvh] rounded-[1.375rem] bg-surface p-4 shadow-card">
        <Step n={1} on done={!!way}>
          <p className="text-[0.9375rem] font-bold">{t.payWays}</p>
          <ul className="mt-2 grid grid-cols-4 gap-1.5" role="radiogroup" aria-label={t.payWays}>
            {WAYS.map((w) => {
              const on = way === w.key;
              return (
                <li key={w.key} className="min-w-0">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={w.key}
                    onClick={() => {
                      setWay(w.key);
                      signal("pay", `way · ${w.key}`);
                    }}
                    className={`press flex h-[3.75rem] w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-[1rem] bg-canvas px-1 transition-shadow duration-200 ${on ? "shadow-[inset_0_0_0_2.5px_var(--color-brand)]" : ""}`}
                  >
                    {w.title ? (
                      <>
                        <span className="[&>svg]:size-7">{w.mark}</span>
                        <span className={`w-full truncate text-center text-[0.6875rem] font-bold ${on ? "text-brand" : ""}`} dir="ltr">
                          {w.title}
                        </span>
                      </>
                    ) : (
                      <span className="[&>svg]:size-9">{w.mark}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </Step>
        <Step n={2} on={!!way}>
          <p className="text-[0.9375rem] font-bold">{how}</p>
          {/* where the money goes, when the founder wrote it in the console: the D17 number, the account */}
          {way === "D17" && details?.d17 && (
            <div className="mt-2 rounded-[1rem] bg-canvas">
              <Detail label="D17" value={details.d17} />
            </div>
          )}
          {(way === "Virement" || way === "Versement") && !!details?.banks.length && (
            <div className="mt-2 divide-y divide-line rounded-[1rem] bg-canvas">
              {details.banks.map((b) => (
                <Detail key={b.rib} label={t.payRib} value={b.rib} sub={b.bank} />
              ))}
            </div>
          )}
        </Step>
        <Step n={3} on={!!way}>
          <p className="text-[0.9375rem] font-bold">{t.payReceipt}</p>
          <p className="text-[0.8125rem] text-muted">{t.payReceiptSub}</p>
        </Step>
      </ol>

      {support && (
        <div className="mt-[2dvh] space-y-2">
          {receipt ? (
            <a href={receipt} target="_blank" rel="noreferrer" onClick={() => said(`receipt · ${way}`)} className="press flex h-14 animate-pop items-center justify-center gap-2 rounded-[1.25rem] bg-[linear-gradient(150deg,#3ee07f,#25d366_50%,#1aa851)] text-[1.0625rem] font-bold text-white shadow-[0_14px_30px_-12px_rgb(37_211_102/0.6)]">
              <MessageCircle className="size-5" /> {t.payReceiptGo}
            </a>
          ) : (
            <span className="flex h-14 items-center justify-center rounded-[1.25rem] bg-ink/[0.06] text-[1rem] font-bold text-muted" aria-disabled>
              {t.payChoose}
            </span>
          )}
          <a href={`tel:+${support}`} onClick={() => said("call")} className="press flex h-12 items-center justify-center gap-2 rounded-[1.125rem] bg-surface text-[0.9375rem] font-bold text-brand shadow-card">
            <Phone className="size-4" /> {t.payAskCall}
          </a>
        </div>
      )}
    </>
  );
}

/** One of the three steps: its number (a tick once done), faded until its turn. */
function Step({ n, on, done, children }: { n: number; on: boolean; done?: boolean; children: React.ReactNode }) {
  return (
    <li className={`flex items-start gap-3 transition-opacity duration-300 ${on ? "" : "opacity-40"}`}>
      <span className={`num grid size-7 shrink-0 place-items-center rounded-full text-[0.8125rem] font-bold text-white ${done ? "bg-mint" : "bg-brand"}`}>{done ? <Check className="size-4" strokeWidth={3} /> : n}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
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
