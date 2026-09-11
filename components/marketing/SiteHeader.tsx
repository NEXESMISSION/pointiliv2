import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LinkButton } from "@/components/ui/Button";
import { MarketingBack } from "./MarketingBack";

const NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
];

export function SiteHeader() {
  return (
    <header className="pt-safe sticky top-0 z-40 border-b border-line/70 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-2 px-4 sm:px-6">
        <MarketingBack />
        <Link href="/" aria-label="Pointili home" className="shrink-0 rounded-xl p-1">
          <Logo size={24} />
        </Link>

        <nav aria-label="Main" className="mx-auto hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-xl px-3 py-2 text-[15px] font-medium text-body transition hover:bg-canvas hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2 md:ml-0">
          <Link href="/login" className="rounded-xl px-3 py-2.5 text-[15px] font-semibold text-body transition hover:bg-canvas hover:text-ink">
            Log in
          </Link>
          <LinkButton href="/register" size="sm" className="sm:h-10 sm:px-4">
            Start free
          </LinkButton>
        </div>
      </div>
    </header>
  );
}
