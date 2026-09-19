import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import { ServiceWorker } from "@/components/ServiceWorker";
import { NavTracker } from "@/components/nav/BackButton";
import { I18nProvider } from "@/components/i18n/Provider";
import { DIR, HTML_LANG, OG_LOCALE, localePath } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { siteUrl } from "@/lib/url";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
// Latin text uses Inter; Arabic glyphs fall through to this one, so the
// Tunisian version is set in a real Arabic typeface.
const arabic = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["400", "500", "600", "700"], variable: "--font-arabic", display: "swap" });

const KEYWORDS = [
  "carte de fidélité",
  "carte de fidélité numérique",
  "fidélité QR",
  "tampons fidélité",
  "application fidélité café",
  "Tunisie",
  "كارط وفاء",
  "برنامج وفاء",
  "تونس",
];

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
    keywords: KEYWORDS,
    authors: [{ name: "Pointili" }],
    creator: "Pointili",
    publisher: "Pointili",
    category: "business",
    alternates: { canonical: url, languages: { "ar-TN": "/", fr: "/fr", "x-default": "/" } },
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
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#6535E0" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await getI18n();
  return (
    <html lang={HTML_LANG[locale]} dir={DIR[locale]} className={`${inter.variable} ${arabic.variable}`}>
      <body className="min-h-dvh font-sans">
        <I18nProvider locale={locale}>
          <ToastProvider>{children}</ToastProvider>
        </I18nProvider>
        <ServiceWorker />
        <NavTracker />
      </body>
    </html>
  );
}
