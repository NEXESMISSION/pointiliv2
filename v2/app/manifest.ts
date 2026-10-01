import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pointili",
    short_name: "Pointili",
    description: "كارطات الفيدليتي متاعك، في تليفونك",
    start_url: "/",
    display: "standalone",
    background_color: "#F4F3F9",
    theme_color: "#F4F3F9",
    lang: "ar-TN",
    dir: "rtl",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
