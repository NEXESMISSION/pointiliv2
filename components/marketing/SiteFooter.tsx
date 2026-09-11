import Link from "next/link";
import { Logo } from "@/components/Logo";

const LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/login", label: "Business login" },
  { href: "/customer/login", label: "Customer login" },
];

export function SiteFooter() {
  return (
    <footer className="pb-safe border-t border-line bg-white">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-5 px-5 py-10 text-center">
        <Logo size={22} />
        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="py-1 text-sm text-muted transition hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="text-xs text-faint">© {new Date().getFullYear()} Pointili · Made for local businesses in Tunisia</p>
      </div>
    </footer>
  );
}
