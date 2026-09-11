import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root: a stray lockfile in the home directory otherwise confuses Turbopack.
  turbopack: { root: __dirname },
  // The dev badge defaults to bottom-left, on top of the mobile bottom nav.
  devIndicators: { position: "top-right" },
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react"],
    // Logo/cover uploads are compressed in the browser first; this is headroom, not the target.
    serverActions: { bodySizeLimit: "4mb" },
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
