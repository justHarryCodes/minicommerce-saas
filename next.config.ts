import path from "path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Every external domain the app actually loads client-side today (confirmed
// by grep, not guessed): Tawk.to chat widget, Google reCAPTCHA v2, Firebase
// Auth's own network calls + its Google sign-in popup, Google Fonts, and the
// three image CDNs already listed in images.remotePatterns below.
// Report-Only: logs violations, blocks nothing — this is a live site with
// real customers and these embeds; enforcing without a monitoring period
// risks silently breaking one of them. script-src/style-src keep
// 'unsafe-inline' for now since there's no nonce-issuing middleware yet —
// dropping it is a natural follow-up once the report period confirms
// nothing else is missing.
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://embed.tawk.to https://www.google.com https://www.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://res.cloudinary.com https://firebasestorage.googleapis.com https://storage.googleapis.com https://*.dukanigeria.com https://*.awarizonmall.com",
  "connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.google.com https://*.tawk.to wss://*.tawk.to",
  "frame-src https://www.google.com https://*.tawk.to https://accounts.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "report-uri /api/csp-report",
].join("; ");

const nextConfig: NextConfig = {
  // Next infers the workspace root by walking up for the nearest
  // package-lock.json — this machine has stray lockfiles above the project
  // (C:\Users\USER\package-lock.json and one more in the shopforge-saas
  // parent folder, neither an actual workspace), so it was picking the
  // user's home directory as the root and file-tracing across the entire
  // profile instead of just this project. Pinned explicitly instead of
  // relying on inference — also a plausible contributor to the intermittent
  // ENOENT/EPERM errors seen during `next build`/`next dev` on Windows,
  // since tracing was covering far more files (OneDrive sync, AppData,
  // browser caches, etc.) than it needed to.
  outputFileTracingRoot: path.join(__dirname),

  experimental: {
    serverActions: {
      allowedOrigins: [
        // dukanigeria.com — all variants (switched from awarizon.shop)
        "dukanigeria.com",
        "www.dukanigeria.com",
        "*.dukanigeria.com",
        // legacy / secondary domain
        "awarizonmall.com",
        "www.awarizonmall.com",
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
      // dukanigeria.com subdomains (storefronts)
      { protocol: "https", hostname: "*.dukanigeria.com" },
      // legacy domain
      { protocol: "https", hostname: "*.awarizonmall.com" },
    ],
    unoptimized: false,
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  async headers() {
    const securityHeaders = [
      { key: "X-Frame-Options",           value: "SAMEORIGIN" },
      { key: "X-Content-Type-Options",    value: "nosniff" },
      { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
    ]

    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
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

// Additive wrap — doesn't change any config already set above. Source-map
// upload only actually runs when SENTRY_AUTH_TOKEN is present; otherwise the
// plugin skips it with a warning, same "inactive until you add the key"
// posture as the rest of this phase.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  telemetry: false,
  disableLogger: true,
});