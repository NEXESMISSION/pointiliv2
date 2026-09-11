"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { inputClass } from "./Field";

export function PasswordInput({ name = "password", id, autoComplete = "current-password", placeholder = "••••••••", invalid, minLength }: { name?: string; id?: string; autoComplete?: string; placeholder?: string; invalid?: boolean; minLength?: number }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id ?? name}
        name={name}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
        minLength={minLength}
        aria-invalid={invalid || undefined}
        className={`${inputClass} pr-12`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-1.5 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-xl text-muted hover:bg-canvas hover:text-ink"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </button>
    </div>
  );
}
