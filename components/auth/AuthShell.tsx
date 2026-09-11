import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { BackButton } from "@/components/nav/BackButton";

/** White, centered, phone-first shell for sign-in / sign-up screens. */
export function AuthShell({ children, wide = false, back = "/" }: { children: ReactNode; wide?: boolean; back?: string }) {
  return (
    <div className="min-h-dvh bg-white sm:bg-canvas sm:px-4 sm:py-10">
      <main
        className={`relative mx-auto flex min-h-dvh w-full flex-col bg-white px-6 pb-10 pt-[calc(1rem+env(safe-area-inset-top))] sm:min-h-0 sm:rounded-[2rem] sm:px-9 sm:py-8 sm:shadow-card ${wide ? "max-w-lg" : "max-w-md"}`}
      >
        <div className="mb-6 flex h-11 items-center">
          <BackButton fallback={back} />
          <Link href="/" className="mx-auto rounded-xl pr-10" aria-label="Pointili home">
            <Logo size={32} />
          </Link>
        </div>
        {children}
      </main>
    </div>
  );
}

export function AuthHeading({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="mb-7 text-center">
      <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight text-ink">{title}</h1>
      {subtitle && <p className="mx-auto mt-1.5 max-w-xs text-[15px] text-muted">{subtitle}</p>}
    </div>
  );
}
