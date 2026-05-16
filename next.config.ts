import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        "awarizon.shop",
        "*.awarizon.shop",
        "awarizonmall.com",
        "*.awarizonmall.com",
        "localhost:3000",
      ],
    },
  },

  // We apply Cloudinary transforms directly in the URL (clCard / clBanner etc.)
  // and serve images straight from Cloudinary's CDN.
  // Cloudinary already returns Cache-Control: public, max-age=31536000, immutable
  // for transformed URLs, so there is no need to route images through Next.js's
  // /api/image optimizer — that would just re-download + re-encode an already
  // optimised image, wasting CPU and adding latency.
  images: {
    // Opt-out of the built-in optimizer for Cloudinary images.
    // clCard / clBanner / clLogo already embed f_auto + q_auto, so the browser
    // receives WebP/AVIF directly from Cloudinary's edge without any Next.js
    // server involvement.
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "https", hostname: "*.awarizonmall.com" },
    ],
    // Tell Next.js not to re-process images that already carry transforms.
    // Any <Image> component that points at res.cloudinary.com will pass through.
    unoptimized: false,
    // Minimum TTL for Next.js's own image cache (used for non-Cloudinary images).
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  async headers() {
    return [
      {
        // Long-lived cache for Next.js static assets and image responses.
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Cache Next.js image optimizer responses for 30 days.
        // (Only applies to non-Cloudinary images routed through /api/image.)
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
