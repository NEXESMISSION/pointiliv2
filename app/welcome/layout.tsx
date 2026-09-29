import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { LanguageToggle } from "@/components/i18n/LanguageSwitcher";
import { homeFor, requireMerchant } from "@/lib/session";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * The owner's first sign-in, with nothing else on screen: no menu to wander
 * off into, one step at a time, centred on a phone. Only the owner comes here.
 */
export default async function WelcomeLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireMerchant("/welcome");
  if (ctx.member_role !== "owner") redirect(homeFor(ctx));
  return (
    <div className="flex min-h-dvh flex-col bg-surface sm:bg-canvas sm:px-4 sm:py-8">
      <main className="relative m-auto w-full max-w-md bg-surface px-5 pb-6 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:rounded-3xl sm:border sm:border-line sm:px-8 sm:py-7 sm:shadow-card">
        <div className="mb-4 flex h-10 items-center justify-between">
          <Logo size={22} />
          <LanguageToggle />
        </div>
        {children}
      </main>
    </div>
  );
}
