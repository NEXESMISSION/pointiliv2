"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import type { ComponentProps, ReactNode } from "react";
import { Spinner } from "./Spinner";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./button-styles";

type Common = { variant?: ButtonVariant; size?: ButtonSize; block?: boolean; icon?: ReactNode };

export function Button({ variant, size, block, icon, className = "", children, loading, ...rest }: Common & ComponentProps<"button"> & { loading?: boolean }) {
  return (
    <button className={buttonClass(variant, size, block, className)} disabled={loading || rest.disabled} {...rest}>
      {loading ? <Spinner className="size-5" /> : icon}
      {children}
    </button>
  );
}

export function LinkButton({ variant, size, block, icon, className = "", children, ...rest }: Common & ComponentProps<typeof Link>) {
  return (
    <Link className={buttonClass(variant, size, block, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

/** Submit button for server-action forms: disables itself and spins while pending. */
export function SubmitButton({ variant, size, block = true, icon, className = "", children, pendingText, ...rest }: Common & ComponentProps<"button"> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={buttonClass(variant, size, block, className)} disabled={pending || rest.disabled} aria-busy={pending} {...rest}>
      {pending ? <Spinner className="size-5" /> : icon}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
