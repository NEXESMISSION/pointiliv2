"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { BadgeCheck, ChevronLeft } from "lucide-react";
import { formFill, type FormField } from "@/app/actions-forms";
import { Confetti } from "@/components/StampLand";
import { useScreen } from "@/components/Tracker";
import { Btn } from "@/components/ui";
import { signal } from "@/lib/track";

const box =
  "h-[3.25rem] w-full rounded-[1rem] bg-surface px-4 text-[1rem] font-semibold shadow-[var(--shadow-card),inset_0_0_0_1px_var(--color-line)] outline-none focus:shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-brand)]";

/**
 * A form of identification, filled by the customer: the founder's fields,
 * each as it should be typed (a number, a phone, a date, one of a list),
 * the required ones said. Sent once — and filled again to change it. Then:
 * from now on, every tampon at this shop shows these answers to the owner.
 */
export function FormFill({ token, shop, name, fields, mine }: { token: string; shop: string; name: string; fields: FormField[]; mine: Record<string, string> | null }) {
  useScreen("form");
  const [data, setData] = useState<Record<string, string>>(() => ({ ...(mine ?? {}) }));
  const [error, setError] = useState<{ field?: string; text: string } | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  const send = () =>
    start(async () => {
      const res = await formFill(token, data);
      if (res.ok) {
        setDone(true);
        setError(null);
        signal("form_filled", name);
        return;
      }
      const label = fields.find((f) => f.key === res.field)?.label;
      setError({
        field: res.field,
        text: res.error === "required" ? `«${label}» لازم تعمّرها` : res.error === "invalid" ? `«${label}» موش صحيحة، ثبّت فيها` : res.error === "own_shop" ? "هذا المحل متاعك" : "ما تعدّاتش، عاود",
      });
    });

  if (done) {
    return (
      <div className="my-auto flex flex-col items-center text-center">
        <Confetti count={60} />
        <span className="grid size-20 animate-pop place-items-center rounded-full bg-mint text-white shadow-[0_16px_34px_-14px_rgb(18_183_106/0.8)]">
          <BadgeCheck className="size-11" strokeWidth={2.4} />
        </span>
        <h1 className="mt-4 text-[1.625rem] font-bold">تسجّلت!</h1>
        <p className="mt-1.5 max-w-xs text-balance text-[1rem] leading-relaxed text-body">
          كي تجي لـ<bdi className="font-bold">{shop}</bdi>، سكاني الكود اللي في الكاسة وخوذ التامبون متاعك.
        </p>
        <Link href="/wallet" className="press mt-6 flex h-[3.5rem] w-full items-center justify-center gap-1 rounded-[1.25rem] bg-surface text-[1.0625rem] font-bold text-brand shadow-card">
          الكارطات متاعي <ChevronLeft className="size-5" />
        </Link>
      </div>
    );
  }

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <div data-list className="-mx-1 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-1 py-1">
        {fields.map((f) => (
          <label key={f.key} className="block">
            <span className="mb-1.5 block px-1 text-[0.9062rem] font-semibold text-body">
              {f.label}
              {f.required && <span className="text-coral"> *</span>}
            </span>
            {f.kind === "choice" ? (
              <span className="flex flex-wrap gap-1.5">
                {(f.options ?? []).map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => {
                      setData((d) => ({ ...d, [f.key]: o }));
                      setError(null);
                    }}
                    className={`press h-11 rounded-full px-4 text-[0.9375rem] font-bold ${data[f.key] === o ? "bg-brand text-white" : "bg-surface text-ink shadow-card"}`}
                  >
                    {o}
                  </button>
                ))}
              </span>
            ) : (
              <input
                value={data[f.key] ?? ""}
                onChange={(e) => {
                  setData((d) => ({ ...d, [f.key]: e.target.value }));
                  setError(null);
                }}
                type={f.kind === "date" ? "date" : "text"}
                inputMode={f.kind === "number" ? "numeric" : f.kind === "phone" ? "tel" : undefined}
                dir={f.kind === "text" ? "auto" : "ltr"}
                placeholder={f.kind === "phone" ? "22 123 456" : undefined}
                className={`${box} ${error?.field === f.key ? "shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-coral)]" : ""}`}
              />
            )}
          </label>
        ))}
      </div>
      <div className="shrink-0 pb-3 pt-3">
        {error && <p className="mb-2 text-center text-[0.9062rem] font-semibold text-coral">{error.text}</p>}
        <Btn type="submit" disabled={pending}>
          {pending ? "…" : mine ? "بدّل" : "سجّل"}
        </Btn>
      </div>
    </form>
  );
}
