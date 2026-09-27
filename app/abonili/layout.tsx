import type { Metadata, Viewport } from "next";
import { Changa } from "next/font/google";
import { AbProvider } from "@/components/abonili/AbProvider";
import { getAb } from "@/lib/abonili/server";
import "./abonili.css";

/**
 * The root of the second product. Everything under /abonili renders inside
 * this frame: its own typeface, its own dark theme, its own dictionary. The
 * only thing it inherits from Pointili's root is the <html> element itself.
 */
const changa = Changa({ subsets: ["arabic", "latin"], variable: "--font-ab", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const { a } = await getAb();
  return {
    title: { default: a.brand, template: `%s · ${a.brand}` },
    description: a.tagline,
    applicationName: a.brand,
    // every screen here is private: a club's roster, a member's card
    robots: { index: false, follow: false },
    openGraph: { type: "website", siteName: a.brand, title: a.brand, description: a.tagline },
    twitter: { card: "summary_large_image", title: a.brand, description: a.tagline },
    appleWebApp: { capable: true, title: a.brand, statusBarStyle: "black-translucent" },
  };
}

export const viewport: Viewport = { themeColor: "#0b0c0e", colorScheme: "dark" };

export default async function AboniliLayout({ children }: { children: React.ReactNode }) {
  const { locale, dir } = await getAb();
  return (
    <div className={`ab ${changa.variable}`} dir={dir} lang={locale === "fr" ? "fr" : "ar-TN"}>
      <AbProvider locale={locale}>{children}</AbProvider>
    </div>
  );
}
