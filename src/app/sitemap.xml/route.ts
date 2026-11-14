import { NextResponse } from "next/server";
import { platformSitemapUrls, urlsetXml, XML_HEADERS } from "@/lib/sitemaps";

// dukanigeria.com/sitemap.xml: Duka's own pages
export async function GET() {
  return new NextResponse(urlsetXml(platformSitemapUrls()), { headers: XML_HEADERS });
}
