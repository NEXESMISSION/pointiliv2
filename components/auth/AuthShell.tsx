import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";

/** White, centered, phone-first shell for sign-in / sign-up screens. */
export function AuthShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-dvh bg-white sm:bg-canvas sm:px-4 sm:py-10">
      <main
        className={`mx-auto flex min-h-dvh w-full flex-col bg-white px-6 pb-10 pt-[calc(2.25rem+env(safe-area-inset-top))] sm:min-h-0 sm:rounded-[2rem] sm:px-9 sm:py-10 sm:shadow-card ${wide ? "max-w-lg" : "max-w-md"}`}
      >
        <Link href="/" className="mx-auto mb-9 rounded-xl" aria-label="Pointidi home">
          <Logo size={34} />
        </Link>
        {children}
      </main>
    </div>
  );
}

export function AuthHeading({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="mb-7">
      <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight text-ink">{title}</h1>
      {subtitle && <p className="mt-1.5 text-[15px] text-muted">{subtitle}</p>}
    </div>
  );
}
