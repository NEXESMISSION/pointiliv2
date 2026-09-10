import type { MetadataRoute } from "next";
import { DESCRIPTION, SITE_NAME, TAGLINE } from "@/lib/seo";
import { BRAND_COLOR } from "@/lib/brand";

/**
 * What Android and iOS need to put Pointili on a home screen — and, on
 * Android, what makes an installed app CAPTURE in-scope /s/ links opened from
 * the camera, which is the only real fix for the browser-jar split (Samsung
 * Internet vs Chrome each holding half a card).
 *
 * THE TRAP: start_url is /app, the switchboard, never /owner or /moi. One
 * installed icon serves both audiences; scope "/" is what lets link capture
 * cover /s/<token>.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — ${TAGLINE}`,
    short_name: SITE_NAME,
    description: DESCRIPTION,
    lang: "fr",
    dir: "ltr",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    /* The splash and the task-switcher tint: the page colour, so the launch
       screen and the first paint are the same colour with no flash between. */
    background_color: "#f4efe6",
    theme_color: BRAND_COLOR,
    categories: ["business", "food", "shopping"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
