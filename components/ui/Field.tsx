import type { ComponentProps, ReactNode } from "react";

export const inputClass =
  "block h-[50px] w-full rounded-2xl border-0 bg-surface px-4 text-base text-ink shadow-[var(--shadow-card),inset_0_0_0_1px_var(--color-line)] placeholder:text-faint transition focus:outline-none focus:shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-brand-600)] aria-[invalid=true]:shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-danger-500)] disabled:bg-surface-2 disabled:text-muted";

export function Field({ label, htmlFor, hint, error, children, action }: { label: ReactNode; htmlFor?: string; hint?: ReactNode; error?: string | null; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="px-0.5 text-[13.5px] font-semibold text-muted">
          {label}
        </label>
        {action}
      </div>
      {children}
      {error ? (
        <p className="text-sm text-danger-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className = "", ...rest }: ComponentProps<"input">) {
  return <input className={`${inputClass} ${className}`} {...rest} />;
}

export function Textarea({ className = "", ...rest }: ComponentProps<"textarea">) {
  return <textarea className={`${inputClass} h-auto min-h-24 py-3 ${className}`} {...rest} />;
}

export function Select({ className = "", children, ...rest }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={`${inputClass} appearance-none pe-10 ${className}`} {...rest}>
        {children}
      </select>
      <svg className="pointer-events-none absolute end-4 top-1/2 size-4 -translate-y-1/2 text-muted" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
        <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" />
      </svg>
    </div>
  );
}
