import { NextRequest, NextResponse } from "next/server";
import { getCachedStore } from "@/lib/storefront-page";
import { storeSitemapUrls, urlsetXml, XML_HEADERS } from "@/lib/sitemaps";

export const dynamic = "force-dynamic";

// <store address>/sitemap.xml: home, categories, products with photos, pages, blog
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const store = await getCachedStore((await params).slug);
  if (!store) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(urlsetXml(await storeSitemapUrls(store)), { headers: XML_HEADERS });
}
