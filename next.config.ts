import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        "awarizonmall.com",
        "*.awarizonmall.com",
        "localhost:3000",
      ],
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "storage.googleapis.com" },
      // Allow images served from any shopforge subdomain
      { protocol: "https", hostname: "*.awarizonmall.com" },
    ],
  },
};

export default nextConfig;
