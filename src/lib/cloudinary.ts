/**
 * Cloudinary URL builder.
 *
 * Stored URLs are always:
 *   https://res.cloudinary.com/{cloud}/image/upload/v{ts}/{public_id}
 *
 * We insert a transformation string between `/upload/` and `v{ts}/`.
 * The resulting URL is a distinct CDN entry that Cloudinary caches forever
 * and serves with Cache-Control: public, max-age=31536000, immutable.
 *
 * Non-Cloudinary URLs (Firebase, external) are returned untouched.
 */

const CLOUDINARY_ORIGIN = 'res.cloudinary.com';

// Matches the upload segment just before the version marker.
// Handles URLs with or without an existing version prefix.
const VERSION_RE = /\/image\/upload\/(v\d+\/)/;
const NO_VERSION_RE = /\/image\/upload\//;

export function cl(
  rawUrl: string | null | undefined,
  transforms: string,
): string {
  if (!rawUrl) return '';
  if (!rawUrl.includes(CLOUDINARY_ORIGIN)) return rawUrl;

  if (VERSION_RE.test(rawUrl)) {
    // Normal path: insert transforms before the version string
    return rawUrl.replace(VERSION_RE, `/image/upload/${transforms}/$1`);
  }

  // Fallback: no version in URL — insert after /upload/
  return rawUrl.replace(NO_VERSION_RE, `/image/upload/${transforms}/`);
}

// ── Presets ────────────────────────────────────────────────────────────────
// All use f_auto (WebP/AVIF where supported) and q_auto:good (smart compression).
// Cloudinary caches each variant once; browsers cache for 1 year.

/** Product card thumbnail — square crop, 480 px */
export const clCard = (url: string | null | undefined) =>
  cl(url, 'f_auto,q_auto:good,c_fill,w_480,h_480');

/** Hero banner — wide crop for the 21:9 slider */
export const clBanner = (url: string | null | undefined) =>
  cl(url, 'f_auto,q_auto:good,c_fill,w_1400,h_600');

/** Store logo / avatar — fit within 200 px, preserve aspect ratio */
export const clLogo = (url: string | null | undefined) =>
  cl(url, 'f_auto,q_auto:good,c_fit,w_200,h_200');

/** Small square thumbnail (admin tables, bookmark slider) — 120 px */
export const clThumb = (url: string | null | undefined) =>
  cl(url, 'f_auto,q_auto:good,c_fill,w_120,h_120');

/** Medium card for discover / featured sliders — 640 px wide */
export const clMedium = (url: string | null | undefined) =>
  cl(url, 'f_auto,q_auto:good,c_fill,w_640,h_640');
