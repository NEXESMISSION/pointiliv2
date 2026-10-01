"use client";

import { useState } from "react";
import { boxLook } from "@/components/ui";
import { western } from "@/lib/phone";

/** 22123456 → 22 123 456, whatever was typed or pasted (+216 included, Arabic digits too). */
function shape(raw: string): string {
  let d = western(raw).replace(/\D/g, "");
  if (d.length > 8 && d.startsWith("216")) d = d.slice(3);
  d = d.slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 8)].filter(Boolean).join(" ");
}

/** A Tunisian mobile number: +216 written in, the eight digits spaced as they are said. */
export function PhoneField({ label, name = "phone", error }: { label: string; name?: string; error?: string | null }) {
  const [value, setValue] = useState("");
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-[14px] font-semibold text-muted">{label}</span>
      <span dir="ltr" className={`flex h-[56px] w-full items-center ${boxLook} focus-within:shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-brand)]`}>
        <span className="num ps-4 pe-3 text-[17px] font-semibold text-muted">+216</span>
        <span className="h-6 w-px bg-line" aria-hidden />
        <input
          name={name}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="22 123 456"
          required
          value={value}
          onChange={(e) => setValue(shape(e.target.value))}
          aria-invalid={!!error}
          className="num h-full min-w-0 flex-1 rounded-e-[18px] bg-transparent px-3 text-[17px] tracking-wide text-ink outline-none placeholder:text-faint"
        />
      </span>
      {error && <span className="mt-1.5 block px-1 text-[13.5px] font-medium text-coral">{error}</span>}
    </label>
  );
}
