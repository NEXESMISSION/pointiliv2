import type { Metadata, Viewport } from "next";
import { Readex_Pro } from "next/font/google";
import { Pwa } from "@/components/InstallApp";
import { Clarity } from "@/components/Clarity";
import { MetaPixel } from "@/components/MetaPixel";
import { Tracker } from "@/components/Tracker";
import { PRICE, PRICE_MONTH, SITE } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import "./globals.css";

// One typeface for Arabic, French and the numbers.
const readex = Readex_Pro({ subsets: ["arabic", "latin"], variable: "--font-readex", display: "swap" });

const description = `Pointili: كارط فيديليتي ديجيتال للمحلات في تونس — الحريف يلمّ التامبونات في تليفونو ويرجعلك. Carte de fidélité digitale pour les commerces en Tunisie, sans application, ${PRICE} DT/an (${PRICE_MONTH} DT/mois).`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Pointili — كارط فيديليتي ديجيتال للمحلات في تونس · Carte de fidélité digitale", template: "%s · Pointili" },
  description,
  applicationName: "Pointili",
  keywords: [
    "carte de fidélité",
    "carte de fidélité digitale",
    "carte de fidélité Tunisie",
    "meilleur système de fidélité Tunisie",
    "logiciel de fidélité Tunisie",
    "application fidélité Tunisie",
    "أحسن كارط فيديليتي في تونس",
    "best loyalty program Tunisia",
    "programme de fidélité Tunisie",
    "fidélisation client Tunisie",
    "application fidélité commerce",
    "carte tampon",
    "كارط فيديليتي",
    "كارط فيديليتي تونس",
    "تامبونات",
    "loyalty card Tunisia",
    "digital stamp card",
    "Pointili",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Pointili",
    title: "Pointili — كارط الفيديليتي متاعك، في التليفون",
    description,
    url: SITE,
    locale: "ar_TN",
    alternateLocale: ["fr_TN"],
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Pointili — carte de fidélité digitale en Tunisie" }],
  },
  twitter: { card: "summary_large_image", title: "Pointili — carte de fidélité digitale en Tunisie", description, images: ["/og.png"] },
  category: "business",
  appleWebApp: { capable: true, title: "Pointili", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#F4F3F9" };

/** Facebook's pixel and Microsoft Clarity, with their ids from the console's settings (none set: nothing). */
async function Pixel() {
  const { meta, clarity } = await getSettings();
  return (
    <>
      <MetaPixel id={meta.pixel} />
      <Clarity id={clarity} />
    </>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar-TN" dir="rtl" className={readex.variable}>
      <body className="min-h-dvh font-sans">
        {/* Android's install prompt can come before the page wakes: kept here for the button */}
        <script dangerouslySetInnerHTML={{ __html: "addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__pwaPrompt=e})" }} />
        {children}
        <Tracker />
        <Pwa />
        <Pixel />
      </body>
    </html>
  );
}
