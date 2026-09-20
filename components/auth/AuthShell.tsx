"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { BackButton } from "@/components/nav/BackButton";
import { LanguageToggle } from "@/components/i18n/LanguageSwitcher";
import { useT } from "@/components/i18n/Provider";

/** White, centred, phone-first shell for sign-in / sign-up screens. */
export function AuthShell({ children, wide = false, back = "/" }: { children: ReactNode; wide?: boolean; back?: string }) {
  const { t } = useT();
  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-white sm:bg-canvas sm:px-4 sm:py-8">
      <main
        className={`relative mx-auto flex h-dvh w-full flex-col justify-center overflow-hidden bg-white px-6 py-4 sm:h-auto sm:overflow-visible sm:rounded-3xl sm:border sm:border-line sm:px-10 sm:py-8 sm:shadow-card ${wide ? "max-w-lg" : "max-w-md"}`}
      >
        <div className="mb-4 grid h-10 shrink-0 grid-cols-[1fr_auto_1fr] items-center">
          <BackButton fallback={back} className="-ms-2 justify-self-start" />
          <Link href="/" className="justify-self-center rounded-lg p-1" aria-label={t.auth.home}>
            <Logo size={22} />
          </Link>
          <LanguageToggle className="justify-self-end" />
        </div>
        {children}
      </main>
    </div>
  );
}

export function AuthHeading({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="mb-5 text-center">
      <h1 className="text-[1.45rem] font-semibold leading-tight tracking-[-0.025em] text-ink">{title}</h1>
      {subtitle && <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-muted">{subtitle}</p>}
    </div>
  );
}
