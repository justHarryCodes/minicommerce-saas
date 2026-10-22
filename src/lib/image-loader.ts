// next/image loader. Cloudinary photos (almost every product, banner and
// logo) are resized and converted to WebP/AVIF by Cloudinary's CDN — the
// browser fetches them straight from the nearest edge instead of our
// server downloading the full-size original and re-encoding it.
//
// With a custom loader Next's own /_next/image optimiser isn't served, so
// other images load as-is: local files from /public (small, long-cached)
// and the rare non-Cloudinary upload. Unsplash can resize by URL too.
import { cl } from "./cloudinary";

export default function imageLoader({ src, width, quality }: { src: string; width: number; quality?: number }): string {
  if (src.includes("res.cloudinary.com") && src.includes("/image/upload/")) {
    return cl(src, `f_auto,q_${quality ? Math.min(100, Math.max(1, quality)) : "auto"},w_${width},c_limit`);
  }
  if (src.startsWith("https://images.unsplash.com/")) {
    const u = new URL(src);
    u.searchParams.set("w", String(width));
    u.searchParams.set("auto", "format");
    u.searchParams.set("q", String(quality || 75));
    return u.toString();
  }
  // next/image requires the loader to use `width`; a harmless fragment for
  // sources that can't be resized keeps one cache entry per file in practice.
  return src.includes("#") ? src : `${src}#w=${width}`;
}
