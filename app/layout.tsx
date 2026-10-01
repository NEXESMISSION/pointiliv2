import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Readex_Pro } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import { ServiceWorker } from "@/components/ServiceWorker";
import { NavTracker } from "@/components/nav/BackButton";
import { Beacon } from "@/components/analytics/Beacon";
import { I18nProvider } from "@/components/i18n/Provider";
import { DIR, HTML_LANG, OG_LOCALE, localePath } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { siteUrl } from "@/lib/url";
import "./globals.css";

// One typeface for the whole app: Readex Pro draws Arabic, French and the
// numbers in the same modern hand (the remake, round 2).
const readex = Readex_Pro({ subsets: ["arabic", "latin"], variable: "--font-readex", display: "swap" });


export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getI18n();
  const title = t.common.site.title;
  const description = t.common.site.description;
  const url = localePath("/", locale) || "/";
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: title, template: "%s · Pointili" },
    description,
    applicationName: "Pointili",
    keywords: t.common.site.keywords,
    authors: [{ name: "Pointili" }],
    creator: "Pointili",
    publisher: "Pointili",
    category: "business",
    openGraph: { type: "website", siteName: "Pointili", title, description, url, locale: OG_LOCALE[locale] },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
    appleWebApp: { capable: true, title: "Pointili", statusBarStyle: "default" },
    formatDetection: { telephone: false, email: false, address: false },
    other: { "mobile-web-app-capable": "yes" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F3F9" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0A12" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [{ locale }, jar] = await Promise.all([getI18n(), cookies()]);
  // day or night by choice (the account's «الشكل»); otherwise the phone decides
  const theme = jar.get("pl_theme")?.value;
  return (
    <html lang={HTML_LANG[locale]} dir={DIR[locale]} className={readex.variable} data-theme={theme === "light" || theme === "dark" ? theme : undefined}>
      <body className="min-h-dvh font-sans">
        <I18nProvider locale={locale}>
          <ToastProvider>{children}</ToastProvider>
        </I18nProvider>
        <ServiceWorker />
        <NavTracker />
        <Beacon />
      </body>
    </html>
  );
}
