import type { MetadataRoute } from "next";

/** Installable on Android (Chrome, Edge, Samsung Internet) and iPhone (Add to Home Screen). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/app",
    name: "Pointili — Loyalty cards",
    short_name: "Pointili",
    description: "Your loyalty cards on your phone. Scan the QR at the counter, collect stamps, earn rewards.",
    lang: "en",
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
      { name: "Scan a QR", short_name: "Scan", url: "/customer/scan", icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "My cards", short_name: "Cards", url: "/customer/cards", icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }] },
    ],
  };
}
