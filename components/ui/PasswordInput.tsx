"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { inputClass } from "./Field";
import { useT } from "@/components/i18n/Provider";

export function PasswordInput({ name = "password", id, autoComplete = "current-password", placeholder = "••••••••", invalid, minLength }: { name?: string; id?: string; autoComplete?: string; placeholder?: string; invalid?: boolean; minLength?: number }) {
  const [show, setShow] = useState(false);
  const { t } = useT();
  // The field is LTR (passwords are), so the wrapper must be too: otherwise, on
  // the Tunisian pages, "end" puts the eye on the left while the input pads its
  // right, and the first characters typed sit under the button.
  return (
    <div className="relative" dir="ltr">
      <input
        id={id ?? name}
        name={name}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
        minLength={minLength}
        aria-invalid={invalid || undefined}
        className={`${inputClass} pe-12`}
        dir="ltr"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute end-1.5 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-xl text-muted hover:bg-canvas hover:text-ink"
        aria-label={show ? t.common.hidePassword : t.common.showPassword}
      >
        {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </button>
    </div>
  );
}
