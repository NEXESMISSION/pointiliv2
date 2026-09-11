"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { requestResetCode, setNewPassword, verifyResetCode } from "@/app/actions/auth";
import type { FormState } from "@/app/actions/types";
import { Alert } from "@/components/ui/Alert";
import { Field } from "@/components/ui/Field";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { SubmitButton } from "@/components/ui/Button";
import { AuthHeading } from "./AuthShell";

export function ForgotPasswordFlow() {
  const [reqState, reqAction] = useActionState<FormState, FormData>(requestResetCode, null);
  const [verState, verAction] = useActionState<FormState, FormData>(verifyResetCode, null);
  const [pwState, pwAction] = useActionState<FormState, FormData>(setNewPassword, null);

  // The most recent result decides which step is on screen.
  const latest = [reqState, verState, pwState].filter(Boolean).sort((a, b) => (b!.at ?? 0) - (a!.at ?? 0))[0];
  const step = latest?.step ?? "phone";

  if (step === "password") {
    return (
      <>
        <AuthHeading title="Choose a new password" subtitle="Use at least 8 characters." />
        <form action={pwAction} className="space-y-5" noValidate>
          {latest === pwState && pwState?.error && <Alert>{pwState.error}</Alert>}
          <Field label="New password" htmlFor="password" error={pwState?.fields?.password}>
            <PasswordInput autoComplete="new-password" invalid={!!pwState?.fields?.password} />
          </Field>
          <Field label="Confirm password" htmlFor="confirm" error={pwState?.fields?.confirm}>
            <PasswordInput name="confirm" autoComplete="new-password" invalid={!!pwState?.fields?.confirm} />
          </Field>
          <SubmitButton pendingText="Saving…">Save password</SubmitButton>
        </form>
      </>
    );
  }

  if (step === "code") {
    return (
      <>
        <CodeIllustration />
        <AuthHeading title="Enter verification code" subtitle={<>We sent a 6-digit code to <span className="font-semibold text-ink tabular">+216 {reqState?.values?.phone}</span></>} />
        {reqState?.devCode && latest === reqState && (
          <Alert tone="info" title="Development mode" className="mb-4">
            No SMS provider is configured, so here is the code: <span className="font-mono text-base font-bold tracking-widest">{reqState.devCode}</span>
          </Alert>
        )}
        <form action={verAction} className="space-y-5" noValidate>
          {latest?.error && latest !== pwState && <Alert>{latest.error}</Alert>}
          <OtpInput invalid={!!verState?.fields?.code} />
          {verState?.fields?.code && <p className="text-center text-sm text-danger-600">{verState.fields.code}</p>}
          <SubmitButton pendingText="Checking…">Continue</SubmitButton>
        </form>
        <form action={reqAction} className="mt-5 text-center">
          <input type="hidden" name="phone" value={reqState?.values?.phone ?? ""} />
          <ResendButton at={reqState?.at} />
        </form>
      </>
    );
  }

  return (
    <>
      <PhoneIllustration />
      <AuthHeading title="Reset your password" subtitle="Enter your phone number and we'll send you a code to reset your password." />
      <form action={reqAction} className="space-y-5" noValidate>
        {latest?.error && <Alert>{latest.error}</Alert>}
        <Field label="Phone number" htmlFor="phone" error={reqState?.fields?.phone}>
          <PhoneInput key={reqState?.at} defaultValue={reqState?.values?.phone ?? ""} invalid={!!reqState?.fields?.phone} autoFocus />
        </Field>
        <SubmitButton pendingText="Sending…">Send code</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link href="/customer/login" className="font-semibold text-brand-600 hover:underline">
          Back to login
        </Link>
      </p>
    </>
  );
}

function OtpInput({ invalid }: { invalid?: boolean }) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const set = (i: number, v: string) => {
    const clean = v.replace(/\D/g, "");
    if (clean.length > 1) {
      const next = clean.slice(0, 6).split("");
      setDigits(Array.from({ length: 6 }, (_, k) => next[k] ?? ""));
      refs.current[Math.min(next.length, 5)]?.focus();
      return;
    }
    setDigits((d) => d.map((x, k) => (k === i ? clean : x)));
    if (clean && i < 5) refs.current[i + 1]?.focus();
  };
  return (
    <div className="flex justify-between gap-2" dir="ltr">
      <input type="hidden" name="code" value={digits.join("")} />
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          onChange={(e) => set(i, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
          }}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={6}
          autoFocus={i === 0}
          aria-label={`Digit ${i + 1}`}
          aria-invalid={invalid || undefined}
          className="h-14 w-full min-w-0 rounded-2xl border border-line bg-white text-center text-xl font-bold text-ink tabular focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 aria-[invalid=true]:border-danger-500"
        />
      ))}
    </div>
  );
}

function ResendButton({ at }: { at?: number }) {
  const [left, setLeft] = useState(60);
  useEffect(() => {
    const start = at ?? Date.now();
    const tick = () => setLeft(Math.max(0, 60 - Math.floor((Date.now() - start) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [at]);
  if (left > 0) return <p className="text-sm text-muted tabular">Resend code in 00:{String(left).padStart(2, "0")}</p>;
  return (
    <button type="submit" className="text-sm font-semibold text-brand-600 hover:underline">
      Resend code
    </button>
  );
}

function PhoneIllustration() {
  return (
    <div className="mx-auto mb-6 grid size-28 place-items-center rounded-[2rem] bg-brand-50" aria-hidden>
      <svg viewBox="0 0 64 64" className="size-16">
        <rect x="18" y="6" width="28" height="52" rx="6" fill="#fff" stroke="#4536F0" strokeWidth="3" />
        <rect x="23" y="16" width="18" height="12" rx="3" fill="#E3E2FF" />
        <circle cx="32" cy="40" r="6" fill="#4536F0" />
        <path d="M29.5 40l1.8 1.8 3.2-3.6" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function CodeIllustration() {
  return (
    <div className="mx-auto mb-6 grid size-28 place-items-center rounded-[2rem] bg-brand-50" aria-hidden>
      <svg viewBox="0 0 64 64" className="size-16">
        <rect x="8" y="14" width="40" height="30" rx="6" fill="#fff" stroke="#4536F0" strokeWidth="3" />
        <path d="M16 26h8M16 33h16" stroke="#A7A2FD" strokeWidth="3" strokeLinecap="round" />
        <rect x="30" y="30" width="26" height="20" rx="6" fill="#4536F0" />
        <path d="M36 40h2M42 40h2M48 40h2" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}
