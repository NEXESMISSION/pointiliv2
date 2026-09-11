import Link from "next/link";
import { Logo } from "@/components/Logo";

const GROUPS = [
  {
    title: "Product",
    links: [
      { href: "/how-it-works", label: "How it works" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "Log in",
    links: [
      { href: "/login", label: "Business login" },
      { href: "/customer/login", label: "Customer login" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="pb-safe border-t border-line bg-white">
      <div className="mx-auto max-w-5xl px-5 pb-8 pt-12">
        <div className="flex flex-col items-center gap-8 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
          <div>
            <Logo size={22} />
            <p className="mt-3 max-w-[16rem] text-sm leading-relaxed text-muted">Digital loyalty cards for cafés, restaurants and salons.</p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-14 gap-y-2 text-left">
            {GROUPS.map((g) => (
              <div key={g.title}>
                <p className="text-[13px] font-semibold text-ink">{g.title}</p>
                <ul className="mt-3 space-y-2">
                  {g.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="text-sm text-muted transition-colors hover:text-ink">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <p className="mt-10 border-t border-line pt-6 text-center text-xs text-faint sm:text-left">© {new Date().getFullYear()} Pointili · Made for local businesses in Tunisia</p>
      </div>
    </footer>
  );
}
