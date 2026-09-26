import { LanguageToggle } from "@/components/i18n/LanguageSwitcher";
import { getI18n } from "@/lib/i18n/server";

/** One centred screen: the other language in the corner, the page in the middle, one legal line at the foot. */
export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const { t, fill } = await getI18n();
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip bg-canvas">
      <div className="pt-safe mx-auto flex w-full max-w-5xl justify-end px-4 pt-3">
        <LanguageToggle />
      </div>
      {/* not centred any more: the page explains before it asks, so it is long
          enough that vertical centring would clip its top on a phone */}
      <main id="main" className="flex-1 py-6">
        {children}
      </main>
      <footer className="pb-safe px-5 pb-5 text-center text-xs text-faint">{fill(t.nav.site.footerLegal, { year: new Date().getFullYear() })}</footer>
    </div>
  );
}
