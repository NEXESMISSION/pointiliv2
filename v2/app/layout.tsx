import type { Metadata, Viewport } from "next";
import { Readex_Pro } from "next/font/google";
import { t } from "@/lib/t";
import "./globals.css";

// One typeface for Arabic, French and the numbers.
const readex = Readex_Pro({ subsets: ["arabic", "latin"], variable: "--font-readex", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Pointili", template: "%s · Pointili" },
  description: t.tagline,
  applicationName: "Pointili",
  appleWebApp: { capable: true, title: "Pointili", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#F4F3F9" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar-TN" dir="rtl" className={readex.variable}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
