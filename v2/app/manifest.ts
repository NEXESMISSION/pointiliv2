import type { MetadataRoute } from "next";

/**
 * Pointili as an app on the phone (Android's install, iOS's «Add to Home
 * Screen»): its names, its words in Tunisian and French, its icons (with the
 * round-cut ones Android asks for), the screens the install shows, and the
 * shortcuts a long press on the icon offers.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Pointili — كارط فيديليتي",
    short_name: "Pointili",
    description: "كارطات الفيدليتي متاعك، في تليفونك — Carte de fidélité digitale pour les commerces en Tunisie.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F4F3F9",
    theme_color: "#F4F3F9",
    lang: "ar-TN",
    dir: "rtl",
    categories: ["business", "shopping", "lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    screenshots: [
      { src: "/pwa/welcome.webp", sizes: "780x1688", type: "image/webp", form_factor: "narrow", label: "Pointili — كارط فيديليتي ديجيتال للمحلات في تونس" },
    ],
    shortcuts: [
      { name: "سكاني الكود", short_name: "سكاني", url: "/scan", icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "ورّي الكود متاع المحل", short_name: "الكود", url: "/shop/qr", icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }] },
    ],
    prefer_related_applications: false,
  };
}
