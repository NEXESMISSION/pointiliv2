import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root: a stray lockfile in the home directory otherwise confuses Turbopack.
  turbopack: { root: __dirname },
  // The dev badge defaults to bottom-left, on top of the mobile bottom nav.
  devIndicators: { position: "top-right" },
  poweredByHeader: false,
  // The share card draws Arabic, so its font has to travel with the function.
  outputFileTracingIncludes: { "/opengraph-image": ["./assets/fonts/**"], "/twitter-image": ["./assets/fonts/**"] },
  experimental: {
    optimizePackageImports: ["lucide-react"],
    // Logo/cover uploads are compressed in the browser first; this is headroom, not the target.
    serverActions: { bodySizeLimit: "4mb" },
  },
  // Tunisian used to live under /tn; those links must not 404.
  async redirects() {
    return [
      { source: "/tn", destination: "/", permanent: true },
      { source: "/tn/:path*", destination: "/:path*", permanent: true },
      // extra rewards became levels on the card itself (0012)
      { source: "/rewards", destination: "/loyalty", permanent: false },
      { source: "/rewards/:path*", destination: "/loyalty", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // SAMEORIGIN, not DENY: the console's click map shows the public pages in a frame
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
