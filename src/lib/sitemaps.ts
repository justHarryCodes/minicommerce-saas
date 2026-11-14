// XML sitemaps and robots.txt for Duka and for every store.
//
//   dukanigeria.com/robots.txt            platform rules + sitemaps
//   dukanigeria.com/sitemap.xml           platform pages
//   dukanigeria.com/stores-sitemap.xml    index of every store's sitemap
//   <store>/robots.txt                    the store's rules + its sitemap
//   <store>/sitemap.xml                   home, categories, products (with
//                                         photos), pages, blog posts
//
// <store> is the store's own address (subdomain or custom domain); the
// Cloudflare Worker maps it to /store/<slug>/..., where these routes live.

import { query } from "@/lib/db";
import { blogEnabled } from "@/lib/store-pages";
import { appUrl, storeCanonicalBase } from "@/lib/seo";
import { clCrawler } from "@/lib/cloudinary";
import type { Store } from "@/types";

export interface SitemapUrl {
  loc: string;
  lastmod?: string | Date | null;
  images?: string[];
}

const xmlEsc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
const day = (d: string | Date | null | undefined) => {
  if (!d) return null;
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? null : t.toISOString().slice(0, 10);
};

export function urlsetXml(urls: SitemapUrl[]): string {
  const body = urls
    .map((u) => {
      const lm = day(u.lastmod);
      const imgs = (u.images ?? [])
        .filter((i) => /^https?:\/\//.test(i))
        .slice(0, 10)
        .map((i) => `<image:image><image:loc>${xmlEsc(i)}</image:loc></image:image>`)
        .join("");
      return `<url><loc>${xmlEsc(u.loc)}</loc>${lm ? `<lastmod>${lm}</lastmod>` : ""}${imgs}</url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${body}
</urlset>`;
}

export function sitemapIndexXml(entries: { loc: string; lastmod?: string | Date | null }[]): string {
  const body = entries
    .map((e) => {
      const lm = day(e.lastmod);
      return `<sitemap><loc>${xmlEsc(e.loc)}</loc>${lm ? `<lastmod>${lm}</lastmod>` : ""}</sitemap>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</sitemapindex>`;
}

export const XML_HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
};
export const TEXT_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
};

/* ───────────────────────────── Platform ──────────────────────────── */

const PLATFORM_PATHS = ["/", "/pricing", "/discover", "/resources", "/affiliate", "/terms", "/data-deletion"];

export function platformSitemapUrls(): SitemapUrl[] {
  const base = appUrl();
  return PLATFORM_PATHS.map((p) => ({ loc: p === "/" ? `${base}/` : `${base}${p}` }));
}

export function platformRobots(): string {
  const base = appUrl();
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /dashboard",
    "Disallow: /admin",
    // Product feeds stay fetchable (Merchant Center); the longer rule wins over /api/
    "Allow: /api/feeds/",
    "Disallow: /api/",
    "Disallow: /auth/",
    "Disallow: /onboarding",
    "Disallow: /team/",
    "Disallow: /affiliate/dashboard",
    "Disallow: /theme-demo/",
    "Disallow: /store/*/checkout",
    "Disallow: /store/*/receipt/",
    "Disallow: /store/*/track",
    "Disallow: /store/*/saved",
    "Disallow: /store/*/search",
    "Disallow: /*?*theme_preview=",
    "",
    `Sitemap: ${base}/sitemap.xml`,
    `Sitemap: ${base}/stores-sitemap.xml`,
    "",
  ].join("\n");
}

/**
 * Every live store's own sitemap. Custom-domain stores are left out: Google
 * only accepts a sitemap from the same site, and those stores list theirs
 * in their own robots.txt instead.
 */
export async function storeSitemapIndex(): Promise<{ loc: string; lastmod?: string | Date | null }[]> {
  const rows = await query<{ slug: string; custom_domain: string | null; lastmod: string | null }>(
    `SELECT s.slug, s.custom_domain, GREATEST(s.updated_at, MAX(p.updated_at)) AS lastmod
       FROM stores s
       JOIN products p ON p.store_id = s.id AND p.is_active = true
      WHERE s.is_active = true AND s.deleted_at IS NULL AND s.custom_domain IS NULL
      GROUP BY s.id
      ORDER BY lastmod DESC NULLS LAST
      LIMIT 50000`,
  );
  return rows.map((r) => ({ loc: `${storeCanonicalBase(r)}/sitemap.xml`, lastmod: r.lastmod }));
}

/* ───────────────────────────── Stores ────────────────────────────── */

export function storeRobots(store: Store): string {
  const base = storeCanonicalBase(store);
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /checkout",
    "Disallow: /receipt/",
    "Disallow: /track",
    "Disallow: /saved",
    "Disallow: /search",
    "Disallow: /*?*theme_preview=",
    "",
    `Sitemap: ${base}/sitemap.xml`,
    "",
  ].join("\n");
}

export async function storeSitemapUrls(store: Store): Promise<SitemapUrl[]> {
  const base = storeCanonicalBase(store);
  const [products, categories, pages, blog] = await Promise.all([
    query<{ slug: string | null; id: string; updated_at: string | null; image_url: string | null; images: string[] | null }>(
      `SELECT id, slug, updated_at, image_url, images FROM products
        WHERE store_id = $1 AND is_active = true
        ORDER BY sort_order, created_at DESC
        LIMIT 45000`,
      [store.id],
    ),
    // Only categories with something in them: an empty category page is thin content
    query<{ slug: string; lastmod: string | null }>(
      `SELECT c.slug, MAX(p.updated_at) AS lastmod FROM categories c
         JOIN products p ON p.category_id = c.id AND p.is_active = true
        WHERE c.store_id = $1 AND c.parent_id IS NULL AND c.slug <> 'uncategorized'
        GROUP BY c.id, c.slug, c.sort_order
        ORDER BY c.sort_order`,
      [store.id],
    ),
    query<{ kind: "page" | "post"; slug: string; updated_at: string | null; cover_url: string | null }>(
      `SELECT kind, slug, updated_at, cover_url FROM store_pages WHERE store_id = $1 AND is_published = true ORDER BY kind, sort_order`,
      [store.id],
    ).catch(() => []),
    blogEnabled(store.id).catch(() => false),
  ]);

  const newest = products.reduce<string | null>((m, p) => (p.updated_at && (!m || p.updated_at > m) ? p.updated_at : m), null);
  const urls: SitemapUrl[] = [{ loc: `${base}/`, lastmod: newest ?? store.updated_at ?? null, images: store.logo_url ? [clCrawler(store.logo_url)] : [] }];
  for (const c of categories) urls.push({ loc: `${base}/?category=${encodeURIComponent(c.slug)}`, lastmod: c.lastmod });
  for (const p of products) {
    urls.push({
      loc: `${base}/products/${encodeURIComponent(p.slug || p.id)}`,
      lastmod: p.updated_at,
      images: [...new Set([p.image_url, ...(p.images ?? [])].filter((u): u is string => !!u))].map(clCrawler),
    });
  }
  for (const pg of pages.filter((x) => x.kind === "page")) urls.push({ loc: `${base}/pages/${encodeURIComponent(pg.slug)}`, lastmod: pg.updated_at });
  const posts = pages.filter((x) => x.kind === "post");
  if (blog && posts.length) {
    urls.push({ loc: `${base}/blog`, lastmod: posts.map((p) => p.updated_at).sort().pop() });
    for (const p of posts) urls.push({ loc: `${base}/blog/${encodeURIComponent(p.slug)}`, lastmod: p.updated_at, images: p.cover_url ? [clCrawler(p.cover_url)] : [] });
  }
  return urls;
}
