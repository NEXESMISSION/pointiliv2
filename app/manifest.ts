import type { MetadataRoute } from "next";
import { DEFAULT_LOCALE, DIR, HTML_LANG } from "@/lib/i18n/config";
import { messagesFor } from "@/lib/i18n/messages";

/**
 * Installable on Android (Chrome, Edge, Samsung Internet) and iPhone (Add to
 * Home Screen). A manifest is one file for everyone, so it speaks the default
 * language — Tunisian — right down to lang and dir.
 */
export default function manifest(): MetadataRoute.Manifest {
  const w = messagesFor(DEFAULT_LOCALE).common.pwa;
  return {
    id: "/app",
    name: w.name,
    short_name: "Pointili",
    description: w.description,
    lang: HTML_LANG[DEFAULT_LOCALE],
    dir: DIR[DEFAULT_LOCALE],
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
      { name: w.scan, short_name: w.scanShort, url: "/customer/scan", icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }] },
      { name: w.cards, short_name: w.cardsShort, url: "/customer/cards", icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }] },
    ],
  };
}
