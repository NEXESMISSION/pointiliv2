import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Off Vercel — the Google Cloud Run backup (CLOUDRUN.md, Dockerfile) — the site is built as one
  // self-contained Node server. Only when asked: Vercel's own build stays exactly as it was.
  ...(process.env.NEXT_STANDALONE === "1" ? { output: "standalone" as const } : {}),
  // v2 lives inside the first version's folder: its root is here, not there
  // (for the bundler and for the files a function ships with alike)
  turbopack: { root: __dirname },
  outputFileTracingRoot: __dirname,
  devIndicators: { position: "top-right" },
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react"],
    // `next dev` only: a server answer comes whole, in one piece. Left on (the
    // default), half of it — React's debug notes — travels on the dev server's
    // socket instead, and a tab whose socket went quiet (asleep in the
    // background, reconnecting) waits for that half forever: a save lands in
    // the database and the page stays on «لحظة…». The real site never had it.
    reactDebugChannel: false,
  },
  // the Android app's short address, easy to type or say on the phone: the app itself (public/pointili.apk)
  async redirects() {
    return [{ source: "/android", destination: "/pointili.apk", permanent: false }];
  },
  async headers() {
    return [
      // the Android app (android/: the site as an app, signed by Pointili): an Android download with its
      // name, always asked again — a new version keeps the same address
      {
        source: "/pointili.apk",
        headers: [
          { key: "Content-Type", value: "application/vnd.android.package-archive" },
          { key: "Content-Disposition", value: 'attachment; filename="Pointili.apk"' },
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
      // the clips (public/clips): named with their version, so a phone keeps them a year
      { source: "/clips/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      // the 3D icons, the front door's pictures, the news' pictures, the mark and the app's icons: a month in the
      // phone, then asked again quietly (they were asked again on every page). A picture changed takes a new name.
      ...["/3d/:path*", "/tn/:path*", "/news/:path*", "/brand-mark.svg", "/icon-:size(192|512).png", "/icon-maskable-:size(192|512).png", "/og.jpg"].map((source) => ({
        source,
        headers: [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=604800" }],
      })),
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
      // the console alone may use the microphone: the founder's voice notes (components/AdminVoice).
      // The last rule to set a header wins, so this one comes after the site's own
      ...["/admin", "/admin/:path*"].map((source) => ({
        source,
        headers: [{ key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" }],
      })),
    ];
  },
};

export default nextConfig;
