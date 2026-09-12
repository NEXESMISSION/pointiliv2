import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LinkButton } from "@/components/ui/Button";
import { LanguageToggle } from "@/components/i18n/LanguageSwitcher";
import { getI18n } from "@/lib/i18n/server";
import { MarketingBack } from "./MarketingBack";

export async function SiteHeader() {
  const { t, path } = await getI18n();
  const nav = [
    { href: path("/how-it-works"), label: t.nav.site.howItWorks },
    { href: path("/pricing"), label: t.nav.site.pricing },
  ];
  return (
    <header className="pt-safe sticky top-0 z-40 border-b border-line/80 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-0.5 px-3 sm:h-16 sm:gap-1 sm:px-6">
        <MarketingBack />
        <Link href={path("/")} aria-label={t.nav.site.homeAria} className="shrink-0 rounded-lg p-1">
          <Logo size={22} />
        </Link>

        <nav aria-label={t.marketing.a11y.mainNav} className="mx-auto hidden items-center gap-0.5 md:flex">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex min-w-0 items-center gap-0.5 sm:gap-1 md:ms-0">
          <LanguageToggle />
          <Link href="/login" className="shrink-0 rounded-lg px-2 py-2 text-[13px] font-medium text-body transition-colors hover:text-ink sm:px-3 sm:text-sm">
            {t.nav.site.login}
          </Link>
          <LinkButton href="/register" size="sm" className="shrink-0 whitespace-nowrap px-3 text-[13px] sm:h-9 sm:px-3.5 sm:text-sm">
            {t.nav.site.startFreeShort}
          </LinkButton>
        </div>
      </div>
    </header>
  );
}
