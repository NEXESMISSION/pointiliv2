import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { BackButton } from "@/components/nav/BackButton";

/** White, centred, phone-first shell for sign-in / sign-up screens. */
export function AuthShell({ children, wide = false, back = "/" }: { children: ReactNode; wide?: boolean; back?: string }) {
  return (
    <div className="relative min-h-dvh bg-white sm:bg-canvas sm:px-4 sm:py-12">
      <main
        className={`relative mx-auto flex min-h-dvh w-full flex-col bg-white px-6 pb-10 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:min-h-0 sm:rounded-3xl sm:border sm:border-line sm:px-10 sm:pb-10 sm:pt-6 sm:shadow-card ${wide ? "max-w-lg" : "max-w-md"}`}
      >
        <div className="mb-8 grid h-11 grid-cols-[2.5rem_1fr_2.5rem] items-center">
          <BackButton fallback={back} className="-ml-2" />
          <Link href="/" className="justify-self-center rounded-lg p-1" aria-label="Pointili home">
            <Logo size={22} />
          </Link>
        </div>
        {children}
      </main>
    </div>
  );
}

export function AuthHeading({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="mb-8 text-center">
      <h1 className="text-[1.6rem] font-semibold leading-tight tracking-[-0.025em] text-ink">{title}</h1>
      {subtitle && <p className="mx-auto mt-2 max-w-xs text-[15px] leading-relaxed text-muted">{subtitle}</p>}
    </div>
  );
}
