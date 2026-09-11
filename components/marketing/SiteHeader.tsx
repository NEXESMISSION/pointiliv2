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
    <header className="pt-safe sticky top-0 z-40 border-b border-white/[0.06] bg-[#0B0D1A]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6">
        <MarketingBack />
        <Link href="/" aria-label="Pointidi home" className="-ml-1 shrink-0 rounded-xl p-1">
          <Logo size={26} light />
        </Link>

        <nav aria-label="Main" className="ml-6 hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-xl px-3 py-2 text-[15px] font-medium text-white/70 transition hover:bg-white/5 hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link href="/login" className="rounded-xl px-3 py-2.5 text-[15px] font-semibold text-white/85 transition hover:bg-white/5 hover:text-white">
            Log in
          </Link>
          <LinkButton href="/register" size="sm" className="sm:h-11 sm:px-5 sm:text-[15px]">
            Start free
          </LinkButton>
        </div>
      </div>
    </header>
  );
}
