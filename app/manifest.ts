import type { MetadataRoute } from "next";

/** Installable on Android (Chrome, Edge, Samsung Internet) and iPhone (Add to Home Screen). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app",
    name: "Pointili — Cartes de fidélité",
    short_name: "Pointili",
    description: "Vos cartes de fidélité sur votre téléphone. Scannez le QR au comptoir, collectez des tampons, gagnez des récompenses.",
    lang: "fr",
    dir: "ltr",
    start_url: "/app?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#F7F7FA",
    theme_color: "#6535E0",
    categories: ["lifestyle", "shopping", "business"],
    prefer_related_applications: false,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Scanner un QR", short_name: "Scanner", url: "/customer/scan", icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Mes cartes", short_name: "Cartes", url: "/customer/cards", icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }] },
    ],
  };
}
