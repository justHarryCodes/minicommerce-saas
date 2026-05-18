import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        // awarizon.shop — all variants
        "awarizon.shop",
        "www.awarizon.shop",   // ← added: canonical www origin
        "*.awarizon.shop",
        // legacy / secondary domain
        "awarizonmall.com",
        "www.awarizonmall.com", // ← added: canonical www origin
        "*.awarizonmall.com",
        // local dev
        "localhost:3000",
      ],
    },
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "storage.googleapis.com" },
      // awarizon.shop subdomains (storefronts)
      { protocol: "https", hostname: "*.awarizon.shop" }, // ← added
      // legacy domain
      { protocol: "https", hostname: "*.awarizonmall.com" },
    ],
    unoptimized: false,
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/_next/image",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=2592000, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;