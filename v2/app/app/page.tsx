import type { Metadata } from "next";
import QRCode from "qrcode";
import { InstallPage } from "@/components/InstallPage";
import { Top } from "@/components/Top";
import { Screen } from "@/components/ui";
import { SITE } from "@/lib/seo";
import { t } from "@/lib/t";

const LINK = `${SITE}/app`;

export const metadata: Metadata = {
  title: t.installApp,
  description: t.installAppHint,
  alternates: { canonical: "/app" },
  // the card a chat draws under the link (WhatsApp, Messenger): this page's own words. A page's
  // openGraph replaces the layout's whole, so the site's picture is said again
  openGraph: {
    type: "website",
    siteName: "Pointili",
    locale: "ar_TN",
    title: t.installApp,
    description: t.installAppHint,
    url: LINK,
    images: [{ url: "/og-v2.jpg", width: 1200, height: 630, alt: "Pointili" }],
  },
};

/**
 * pointili.online/app: the link to send when an owner or a customer cannot find the install button
 * (components/InstallPage decides, on the phone, what this phone gets). The QR is the same link, for
 * whoever opens it on a computer.
 */
export default async function AppLink() {
  const qr = await QRCode.toString(LINK, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0F0E17", light: "#FFFFFF" } });
  return (
    <Screen>
      <Top back="/" />
      <InstallPage qr={qr} address={LINK.replace(/^https?:\/\/(?:www\.)?/, "")} />
    </Screen>
  );
}
