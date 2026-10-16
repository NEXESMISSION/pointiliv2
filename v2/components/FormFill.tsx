"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { BadgeCheck, ChevronLeft } from "lucide-react";
import { formFill, type FormField } from "@/app/actions-forms";
import { formJoin } from "@/app/actions";
import { Confetti } from "@/components/StampLand";
import { useScreen } from "@/components/Tracker";
import { Btn } from "@/components/ui";
import { Trap } from "@/components/Trap";
import { signal } from "@/lib/track";
import { western } from "@/lib/phone";

/** 22123456 → 22 123 456, whatever was typed or pasted (+216 and Arabic digits too) */
const shape = (raw: string) => {
  let d = western(raw).replace(/\D/g, "");
  if (d.length > 8 && d.startsWith("216")) d = d.slice(3);
  d = d.slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 8)].filter(Boolean).join(" ");
};
/** a field that asks for the person's name gives the new account its name, so it is not asked twice */
const isName = (f: FormField) => f.kind === "text" && /اسم|إسم|nom|name/i.test(f.label);

const box =
  "h-[3.25rem] w-full rounded-[1rem] bg-surface px-4 text-[0.9375rem] font-semibold shadow-[var(--shadow-card),inset_0_0_0_1px_var(--color-line)] outline-none focus:shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-brand)]";

/**
 * A form of identification, filled by the customer: the founder's fields,
 * each as it should be typed (a number, a phone, a date, one of a list),
 * the required ones said. Sent once — and filled again to change it. Then:
 * from now on, every tampon at this shop shows these answers to the owner.
 *
 * `join`: nobody signed in — the account is made on the same page, under the
 * form (the number and a password; the name from the form's own name field,
 * else asked), one button for both. A field of kind «phone» is that number.
 */
export function FormFill({ token, shop, name, fields, mine, join = false, next }: { token: string; shop: string; name: string; fields: FormField[]; mine: Record<string, string> | null; join?: boolean; next?: string }) {
  useScreen("form");
  const [data, setData] = useState<Record<string, string>>(() => ({ ...(mine ?? {}) }));
  const [error, setError] = useState<{ field?: string; text: string } | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const [acc, setAcc] = useState({ name: "", phone: "", password: "" });
  const nameField = join ? fields.find(isName) : undefined;
  // signing up, the number is asked once, in the account part
  const shown = join ? fields.filter((f) => f.kind !== "phone") : fields;

  const send = (trap: string) =>
    start(async () => {
      const res = join
        ? await formJoin(token, data, { name: nameField ? (data[nameField.key] ?? "") : acc.name, phone: acc.phone, password: acc.password, trap })
        : await formFill(token, data);
      if (res.ok) {
        setDone(true);
        setError(null);
        signal("form_filled", name);
        return;
      }
      if (res.field?.startsWith("acc_") || (res.error && !["required", "invalid", "own_shop"].includes(res.error))) {
        setError({ field: res.field === "acc_name" && nameField ? nameField.key : res.field, text: res.error ?? "صار مشكل، عاود" });
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
        <h1 className="mt-4 text-[1.5rem] font-bold">تسجّلت!</h1>
        <p className="mt-1.5 max-w-xs text-balance text-[0.9375rem] leading-relaxed text-body">
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
        send(String(new FormData(e.currentTarget).get("pl_site") ?? ""));
      }}
    >
      <Trap />
      <div data-list className="-mx-1 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-1 py-1">
        {shown.map((f) => {
          // a list to pick from is a group of buttons, not a label (a label would name every button with its own text)
          const Wrap = f.kind === "choice" ? "div" : "label";
          return (
            <Wrap key={f.key} className="block" {...(f.kind === "choice" ? { role: "radiogroup", "aria-label": f.label } : {})}>
              <span className="mb-1.5 block px-1 text-[0.9375rem] font-semibold text-body">
                {f.label}
                {f.required && <span className="text-coral"> *</span>}
              </span>
              {f.kind === "choice" ? (
                <span className="flex flex-wrap gap-1.5">
                  {(f.options ?? []).map((o) => (
                    <button
                      key={o}
                      type="button"
                      role="radio"
                      aria-checked={data[f.key] === o}
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
            </Wrap>
          );
        })}
        {join && (
          <div className="space-y-3 border-t border-line pt-3">
            <p className="px-1 text-[0.9375rem] font-bold text-ink">الكونت متاعك</p>
            {!nameField && (
              <label className="block">
                <span className="mb-1.5 block px-1 text-[0.9375rem] font-semibold text-body">اسمك</span>
                <input
                  value={acc.name}
                  onChange={(e) => {
                    setAcc((a) => ({ ...a, name: e.target.value.slice(0, 60) }));
                    setError(null);
                  }}
                  autoComplete="name"
                  placeholder="مثلا: سامي"
                  className={`${box} ${error?.field === "acc_name" ? "shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-coral)]" : ""}`}
                />
              </label>
            )}
            <label className="block">
              <span className="mb-1.5 block px-1 text-[0.9375rem] font-semibold text-body">نومرو التليفون</span>
              <span dir="ltr" className={`flex items-center ${box} px-0 ${error?.field === "acc_phone" ? "shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-coral)]" : ""}`}>
                <span className="num ps-4 pe-3 text-muted">+216</span>
                <input
                  value={acc.phone}
                  onChange={(e) => {
                    setAcc((a) => ({ ...a, phone: shape(e.target.value) }));
                    setError(null);
                  }}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="22 123 456"
                  className="num h-full min-w-0 flex-1 bg-transparent pe-3 text-[17px] tracking-wide outline-none"
                />
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block px-1 text-[0.9375rem] font-semibold text-body">كلمة السر</span>
              <input
                value={acc.password}
                onChange={(e) => {
                  setAcc((a) => ({ ...a, password: e.target.value }));
                  setError(null);
                }}
                type="password"
                autoComplete="new-password"
                placeholder="8 حروف ولا أرقام على الأقل"
                className={`${box} ${error?.field === "acc_password" ? "shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-coral)]" : ""}`}
              />
            </label>
            {next && (
              <Link href={`/login?next=${encodeURIComponent(next)}`} className="block px-1 text-[0.9375rem] font-semibold text-brand">
                عندك كونت؟ ادخل
              </Link>
            )}
          </div>
        )}
      </div>
      <div className="shrink-0 pb-3 pt-3">
        {error && <p className="mb-2 text-center text-[0.9375rem] font-semibold text-coral">{error.text}</p>}
        <Btn type="submit" disabled={pending}>
          {pending ? "…" : mine ? "بدّل" : "سجّل"}
        </Btn>
      </div>
    </form>
  );
}
