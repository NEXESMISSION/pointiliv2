import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { getI18n } from "@/lib/i18n/server";

export async function SiteFooter() {
  const { t, fill, path } = await getI18n();
  const groups = [
    {
      title: t.nav.site.product,
      links: [
        { href: path("/how-it-works"), label: t.nav.site.howItWorks },
        { href: path("/pricing"), label: t.nav.site.pricing },
      ],
    },
    {
      title: t.nav.site.signIn,
      links: [
        { href: "/login", label: t.nav.site.businessLogin },
        { href: "/customer/login", label: t.nav.site.customerLogin },
      ],
    },
  ];
  return (
    <footer className="pb-safe border-t border-line bg-white">
      <div className="mx-auto max-w-5xl px-5 pb-8 pt-12">
        <div className="flex flex-col items-center gap-8 text-center sm:flex-row sm:items-start sm:justify-between sm:text-start">
          <div>
            <Logo size={22} />
            <p className="mt-3 max-w-[16rem] text-sm leading-relaxed text-muted">{t.nav.site.footerTagline}</p>
            <div className="mt-4 flex justify-center sm:justify-start">
              <LanguageSwitcher />
            </div>
          </div>
          <nav aria-label={t.marketing.a11y.footerNav} className="grid grid-cols-2 gap-x-14 gap-y-2 text-start">
            {groups.map((g) => (
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
        <p className="mt-10 border-t border-line pt-6 text-center text-xs text-faint sm:text-start">{fill(t.nav.site.footerLegal, { year: new Date().getFullYear() })}</p>
      </div>
    </footer>
  );
}
