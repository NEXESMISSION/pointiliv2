"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { requestResetCode, setNewPassword, verifyResetCode } from "@/app/actions/auth";
import type { FormState } from "@/app/actions/types";
import { Alert } from "@/components/ui/Alert";
import { Field } from "@/components/ui/Field";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { SubmitButton } from "@/components/ui/Button";
import { useT } from "@/components/i18n/Provider";
import { useFormAction } from "@/lib/use-form-action";
import { AuthHeading } from "./AuthShell";

export function ForgotPasswordFlow() {
  const { t } = useT();
  const req = useFormAction<FormState>(requestResetCode, null);
  const ver = useFormAction<FormState>(verifyResetCode, null);
  const pw = useFormAction<FormState>(setNewPassword, null);
  const reqState = req.state;
  const verState = ver.state;
  const pwState = pw.state;

  // The most recent result decides which step is on screen.
  const latest = [reqState, verState, pwState].filter(Boolean).sort((a, b) => (b!.at ?? 0) - (a!.at ?? 0))[0];
  const step = latest?.step ?? "phone";

  if (step === "password") {
    return (
      <>
        <AuthHeading title={t.auth.forgot.newTitle} subtitle={t.auth.forgot.newSubtitle} />
        <form onSubmit={pw.onSubmit} className="space-y-3.5" noValidate>
          {latest === pwState && pwState?.error && <Alert>{pwState.error}</Alert>}
          <Field label={t.auth.newPassword} htmlFor="password" error={pwState?.fields?.password}>
            <PasswordInput autoComplete="new-password" invalid={!!pwState?.fields?.password} />
          </Field>
          <Field label={t.auth.confirmPassword} htmlFor="confirm" error={pwState?.fields?.confirm}>
            <PasswordInput name="confirm" autoComplete="new-password" invalid={!!pwState?.fields?.confirm} />
          </Field>
          <SubmitButton pending={pw.pending} pendingText={t.common.saving}>
            {t.auth.forgot.savePassword}
          </SubmitButton>
        </form>
      </>
    );
  }

  if (step === "code") {
    return (
      <>
        <CodeIllustration />
        <AuthHeading
          title={t.auth.forgot.codeTitle}
          subtitle={
            <>
              {t.auth.forgot.codeSentTo}{" "}
              <span className="font-semibold text-ink tabular" dir="ltr">
                +216 {reqState?.values?.phone}
              </span>
            </>
          }
        />
        {reqState?.devCode && latest === reqState && (
          <Alert tone="info" title={t.auth.forgot.devTitle} className="mb-4">
            {t.auth.forgot.devBody} <span className="font-mono text-base font-bold tracking-widest">{reqState.devCode}</span>
          </Alert>
        )}
        <form onSubmit={ver.onSubmit} className="space-y-3.5" noValidate>
          {latest?.error && latest !== pwState && <Alert>{latest.error}</Alert>}
          <OtpInput invalid={!!verState?.fields?.code} />
          {verState?.fields?.code && <p className="text-center text-sm text-danger-600">{verState.fields.code}</p>}
          <SubmitButton pending={ver.pending} pendingText={t.auth.forgot.checking}>
            {t.auth.forgot.continue}
          </SubmitButton>
        </form>
        <form onSubmit={req.onSubmit} className="mt-5 text-center">
          <input type="hidden" name="phone" value={reqState?.values?.phone ?? ""} />
          <ResendButton at={reqState?.at} />
        </form>
      </>
    );
  }

  return (
    <>
      <PhoneIllustration />
      <AuthHeading title={t.auth.forgot.title} subtitle={t.auth.forgot.subtitle} />
      <form onSubmit={req.onSubmit} className="space-y-3.5" noValidate>
        {latest?.error && <Alert>{latest.error}</Alert>}
        <Field label={t.common.phoneNumber} htmlFor="phone" error={reqState?.fields?.phone}>
          <PhoneInput defaultValue={reqState?.values?.phone ?? ""} invalid={!!reqState?.fields?.phone} autoFocus />
        </Field>
        <SubmitButton pending={req.pending} pendingText={t.common.sending}>
          {t.auth.forgot.send}
        </SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link href="/customer/login" className="font-semibold text-brand-600 hover:underline">
          {t.auth.forgot.backToLogin}
        </Link>
      </p>
    </>
  );
}

function OtpInput({ invalid }: { invalid?: boolean }) {
  const { t, fill } = useT();
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
          aria-label={fill(t.auth.forgot.digit, { n: i + 1 })}
          aria-invalid={invalid || undefined}
          className="h-14 w-full min-w-0 rounded-2xl border border-line bg-white text-center text-xl font-bold text-ink tabular focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 aria-[invalid=true]:border-danger-500"
        />
      ))}
    </div>
  );
}

function ResendButton({ at }: { at?: number }) {
  const { t, fill } = useT();
  const [left, setLeft] = useState(60);
  useEffect(() => {
    const start = at ?? Date.now();
    const tick = () => setLeft(Math.max(0, 60 - Math.floor((Date.now() - start) / 1000)));
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [at]);
  if (left > 0) return <p className="text-sm text-muted tabular">{fill(t.auth.forgot.resendIn, { s: String(left).padStart(2, "0") })}</p>;
  return (
    <button type="submit" className="text-sm font-semibold text-brand-600 hover:underline">
      {t.auth.forgot.resend}
    </button>
  );
}

function PhoneIllustration() {
  return (
    <div className="mx-auto mb-6 grid size-28 place-items-center rounded-[2rem] bg-brand-50" aria-hidden>
      <svg viewBox="0 0 64 64" className="size-16">
        <rect x="18" y="6" width="28" height="52" rx="6" fill="#fff" stroke="#6535E0" strokeWidth="3" />
        <rect x="23" y="16" width="18" height="12" rx="3" fill="#EBE3FF" />
        <circle cx="32" cy="40" r="6" fill="#6535E0" />
        <path d="M29.5 40l1.8 1.8 3.2-3.6" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function CodeIllustration() {
  return (
    <div className="mx-auto mb-6 grid size-28 place-items-center rounded-[2rem] bg-brand-50" aria-hidden>
      <svg viewBox="0 0 64 64" className="size-16">
        <rect x="8" y="14" width="40" height="30" rx="6" fill="#fff" stroke="#6535E0" strokeWidth="3" />
        <path d="M16 26h8M16 33h16" stroke="#B9A1FC" strokeWidth="3" strokeLinecap="round" />
        <rect x="30" y="30" width="26" height="20" rx="6" fill="#6535E0" />
        <path d="M36 40h2M42 40h2M48 40h2" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}
