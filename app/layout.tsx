import type { Metadata, Viewport } from "next";
import { Inter, Poppins, Space_Mono } from "next/font/google";
import { DESCRIPTION, SITE_NAME, SITE_URL, TAGLINE } from "@/lib/seo";
import { BRAND_COLOR } from "@/lib/brand";
import { ServiceWorker } from "@/components/ServiceWorker";
import { PullToRefresh } from "@/components/PullToRefresh";
import { StayFresh } from "@/components/StayFresh";
import { RouteProgress } from "@/components/RouteProgress";
import "./globals.css";

/**
 * The root layout: fonts, metadata, viewport, and the three components every
 * page needs (route progress, service worker, deploy repair, pull to refresh).
 * No shell here — /s, /[slug] and /owner each lay out their own phone column.
 *
 * THE TRAP: viewportFit "cover" is what makes env(safe-area-inset-*) non-zero
 * in an installed app. Without it .safe-t and .safe-b are no-ops and the till
 * sits under the notch.
 */

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  /* 400 and 700 are the ONLY weights Space Mono ships; a heavier request is
     synthesised and smears the wide glyphs of the 6-digit code. */
  weight: ["400", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  /* NO weight list, on purpose: that loads the VARIABLE font (100–900 in one
     file), so font-extrabold is a real cut rather than a browser-faked bold. */
});

const poppins = Poppins({
  variable: "--font-poppins-var",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  /* Without metadataBase every canonical and OG URL is emitted relative. */
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  formatDetection: { telephone: false },
  /*
    The iOS half of "add to home screen": without `capable` an installed icon
    can reopen inside Safari chrome. `title` is what shows UNDER the icon.
  */
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "default",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: BRAND_COLOR,
  /* THE LINE THAT MAKES THE SAFE AREAS REAL — see globals.css .safe-t. */
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${spaceMono.variable} ${inter.variable} ${poppins.variable}`}>
      <body>
        {/* Every navigation in the product, answered — see RouteProgress. */}
        <RouteProgress />
        {children}
        {/* Registers the service worker for the whole origin — installability. */}
        <ServiceWorker />
        {/* Repairs a tab still running a previous deploy — see the file. */}
        <StayFresh />
        {/* The gesture an installed app has nowhere else. */}
        <PullToRefresh />
      </body>
    </html>
  );
}
