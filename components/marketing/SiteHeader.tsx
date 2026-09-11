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
    <header className="pt-safe sticky top-0 z-40 border-b border-line/80 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-1 px-4 sm:h-16 sm:px-6">
        <MarketingBack />
        <Link href="/" aria-label="Pointili home" className="shrink-0 rounded-lg p-1">
          <Logo size={22} />
        </Link>

        <nav aria-label="Main" className="mx-auto hidden items-center gap-0.5 md:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-body transition-colors hover:text-ink">
            Log in
          </Link>
          <LinkButton href="/register" size="sm" className="sm:h-9 sm:px-3.5">
            Start free
          </LinkButton>
        </div>
      </div>
    </header>
  );
}
