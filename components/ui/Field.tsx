import type { ComponentProps, ReactNode } from "react";

export const inputClass =
  "block h-13 w-full rounded-2xl border border-line bg-white px-4 text-base text-ink placeholder:text-faint transition focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 aria-[invalid=true]:border-danger-500 disabled:bg-canvas disabled:text-muted";

export function Field({ label, htmlFor, hint, error, children, action }: { label: string; htmlFor?: string; hint?: ReactNode; error?: string | null; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="text-sm font-medium text-body">
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
      <select className={`${inputClass} appearance-none pr-10 ${className}`} {...rest}>
        {children}
      </select>
      <svg className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
        <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" />
      </svg>
    </div>
  );
}
