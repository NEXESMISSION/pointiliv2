"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { boxFocus, boxLook } from "@/components/ui";
import { t } from "@/lib/t";

/**
 * A password field with an eye at its end, to see what was typed (23 Oct 2026:
 * owners and customers kept saying their password «does not work» — most had
 * mistyped it once, in a field that hides every letter). A new password shows
 * as it is typed (`shown`), so it is never chosen blind; signing in starts
 * hidden. Either way the keyboard is told to leave it alone: no capital, no
 * correction.
 */
export function PasswordField({ label, error, shown = false, className = "", ...rest }: Omit<ComponentProps<"input">, "type"> & { label: string; error?: string | null; shown?: boolean }) {
  const [see, setSee] = useState(shown);
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-[0.8125rem] font-semibold text-muted">{label}</span>
      <span className="relative block">
        <input
          type={see ? "text" : "password"}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={`block h-[3.5rem] w-full pe-12 ps-4 text-[17px] text-ink outline-none placeholder:text-faint ${boxLook} ${boxFocus} ${className}`}
          aria-invalid={!!error}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setSee(!see)}
          aria-label={see ? t.passwordHide : t.passwordShow}
          aria-pressed={see}
          className="absolute inset-y-0 end-0 grid w-12 place-items-center rounded-e-[1.125rem] text-muted"
        >
          {see ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </span>
      {error && <span className="mt-1.5 block px-1 text-[0.8125rem] font-medium text-coral">{error}</span>}
    </label>
  );
}
