import Link from "next/link";
import { BrandLockup } from "@/components/BrandMark";

/**
 * Public auth shell — deliberately OUTSIDE app/owner/(app)/layout.tsx, whose
 * guard redirects here. Nesting these under the guard would be an infinite
 * redirect loop.
 *
 * THE TRAP: the way back is an explicit Link to "/", not a router.back(): the
 * commonest way to arrive here is the (app) guard bouncing you off /owner, so
 * "back" lands on /owner, which bounces you straight here again.
 */
export default function OwnerAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="safe-t safe-b a-shell flex min-h-dvh flex-col items-center px-5 [--safe-pb:2.25rem] [--safe-pt:2.25rem]">
      <div className="mb-4 w-full max-w-[400px]">
        <Link
          href="/"
          className="-ml-2 inline-flex items-center gap-1.5 rounded-full py-1.5 pl-2 pr-3 text-[13px] font-semibold text-slate transition hover:bg-[var(--o-inset)]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
            <path d="m15 18-6-6 6-6" />
          </svg>
          Retour au site
        </Link>
      </div>

      <Link href="/" className="mb-7 inline-flex">
        <BrandLockup size={40} accent="#5b3fd1" />
      </Link>
      <div className="w-full max-w-[400px]">{children}</div>
    </div>
  );
}
