"use client";

import { useState } from "react";
import { formatLocalDigits } from "@/lib/phone";

/** Tunisian number: fixed +216 prefix with flag, 8 digits grouped as they are typed. */
export function PhoneInput({ name = "phone", id = "phone", defaultValue = "", autoFocus, invalid }: { name?: string; id?: string; defaultValue?: string; autoFocus?: boolean; invalid?: boolean }) {
  const [value, setValue] = useState(formatLocalDigits(defaultValue.replace(/^\+?216/, "")));
  return (
    <div
      className="flex h-13 w-full items-center rounded-2xl border border-line bg-white transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15 aria-[invalid=true]:border-danger-500"
      aria-invalid={invalid || undefined}
    >
      <span className="flex h-full items-center gap-2 border-r border-line pl-4 pr-3 text-base font-medium text-body" aria-hidden>
        <TunisiaFlag />
        +216
      </span>
      <input
        id={id}
        name={name}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="12 345 678"
        required
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => setValue(formatLocalDigits(e.target.value))}
        aria-invalid={invalid || undefined}
        aria-label="Phone number"
        className="h-full min-w-0 flex-1 rounded-r-2xl bg-transparent px-3 text-base tracking-wide text-ink tabular placeholder:text-faint focus:outline-none"
        dir="ltr"
      />
    </div>
  );
}

function TunisiaFlag() {
  return (
    <svg viewBox="0 0 30 20" className="h-3.5 w-5 rounded-[3px] shadow-[0_0_0_1px_rgb(0_0_0/0.06)]" aria-hidden>
      <rect width="30" height="20" fill="#E70013" />
      <circle cx="15" cy="10" r="5" fill="#fff" />
      <circle cx="15.6" cy="10" r="3.9" fill="#E70013" />
      <circle cx="16.6" cy="10" r="3.1" fill="#fff" />
      <path d="m15.3 10 2.9-1-1.8 2.5V8.5l1.8 2.5z" fill="#E70013" />
    </svg>
  );
}
