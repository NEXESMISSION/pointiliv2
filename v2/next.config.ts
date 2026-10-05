import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
