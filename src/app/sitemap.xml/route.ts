import { NextResponse } from "next/server";
import { platformSitemapUrls, urlsetXml, XML_HEADERS } from "@/lib/sitemaps";
import { publishedSlugs } from "@/lib/blog";
import { getAppUrl } from "@/lib/paystack";

export const dynamic = "force-dynamic";

// dukanigeria.com/sitemap.xml: Duka's own pages
export async function GET() {
  // Plus every published blog post (dukanigeria.com/blog/…)
  const posts = await publishedSlugs();
  const base = getAppUrl();
  const urls = [...platformSitemapUrls(), ...posts.map((p) => ({ loc: `${base}/blog/${p.slug}`, lastmod: p.updated_at }))];
  return new NextResponse(urlsetXml(urls), { headers: XML_HEADERS });
}
