import { NextResponse } from "next/server";
import { sitemapIndexXml, storeSitemapIndex, XML_HEADERS } from "@/lib/sitemaps";

export const dynamic = "force-dynamic";

// dukanigeria.com/stores-sitemap.xml: every live store's sitemap, so Google
// finds new stores (needs the dukanigeria.com Domain property in Search Console)
export async function GET() {
  const entries = await storeSitemapIndex().catch(() => []);
  return new NextResponse(sitemapIndexXml(entries), { headers: XML_HEADERS });
}
