import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import { ServiceWorker } from "@/components/ServiceWorker";
import { siteUrl } from "@/lib/url";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Pointidi — Turn customers into regulars", template: "%s · Pointidi" },
  description: "Simple digital loyalty cards for cafés, restaurants, salons and local businesses. Scan, stamp, reward.",
  applicationName: "Pointidi",
  appleWebApp: { capable: true, title: "Pointidi", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  openGraph: {
    title: "Pointidi — Turn customers into regulars",
    description: "Digital loyalty cards for local businesses. Customers scan your QR, collect stamps, earn rewards.",
    siteName: "Pointidi",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#4536F0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="min-h-dvh font-sans">
        <ToastProvider>{children}</ToastProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
