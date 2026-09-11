import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import { ServiceWorker } from "@/components/ServiceWorker";
import { NavTracker } from "@/components/nav/BackButton";
import { siteUrl } from "@/lib/url";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

const TITLE = "Pointili — Digital loyalty cards for local businesses";
const DESCRIPTION = "Turn customers into regulars. Customers scan your QR at the counter, collect stamps on their phone and earn rewards. For cafés, restaurants, salons and shops in Tunisia.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: TITLE, template: "%s · Pointili" },
  description: DESCRIPTION,
  applicationName: "Pointili",
  keywords: ["loyalty card", "digital stamp card", "carte de fidélité", "QR loyalty", "café loyalty app", "Tunisia", "Tunisie", "rewards", "punch card"],
  authors: [{ name: "Pointili" }],
  creator: "Pointili",
  publisher: "Pointili",
  category: "business",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Pointili",
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    locale: "en_US",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  appleWebApp: { capable: true, title: "Pointili", statusBarStyle: "default" },
  formatDetection: { telephone: false, email: false, address: false },
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#6535E0" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="min-h-dvh font-sans">
        <ToastProvider>{children}</ToastProvider>
        <ServiceWorker />
        <NavTracker />
      </body>
    </html>
  );
}
