import Link from "next/link";
import { Logo } from "@/components/Logo";

const GROUPS = [
  {
    title: "Pointidi",
    links: [
      { href: "/how-it-works", label: "How it works" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "Businesses",
    links: [
      { href: "/login", label: "Business login" },
      { href: "/register", label: "Start free trial" },
    ],
  },
  {
    title: "Customers",
    links: [
      { href: "/customer/login", label: "Customer login" },
      { href: "/customer/register", label: "Create customer account" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="pb-safe bg-[#0B0D1A] text-white/60">
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-12 sm:px-6 sm:pt-16">
        <div className="grid gap-10 md:grid-cols-[1.3fr_2fr]">
          <div>
            <Logo size={26} light />
            <p className="mt-3 max-w-xs text-sm leading-relaxed">Digital loyalty cards for cafés, restaurants, salons and local shops in Tunisia.</p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3">
            {GROUPS.map((group) => (
              <div key={group.title}>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40">{group.title}</p>
                <ul className="mt-3 space-y-1">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="inline-block py-1.5 text-[15px] transition hover:text-white">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="mt-12 flex flex-col gap-1 border-t border-white/10 pt-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>© Pointidi</p>
          <p className="text-white/40">Made for local businesses in Tunisia.</p>
        </div>
      </div>
    </footer>
  );
}
