import { NextRequest, NextResponse } from "next/server";
import { hasFeature } from "@/lib/plan";
import { query, queryOne } from "@/lib/db";
import { csvFeed, rssFeed, toFeedItem, type FeedProduct } from "@/lib/feeds";
import { lagosParts } from "@/lib/hours";
import { getStoreUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Public catalog feeds, fetched on a schedule by Google / Meta:
//   /api/feeds/<slug>/google.xml   Google Merchant Center
//   /api/feeds/<slug>/meta.xml     Meta Commerce Manager (Facebook & Instagram)
//   /api/feeds/<slug>/products.csv Meta (or a spreadsheet)
const FILES = new Set(["google.xml", "meta.xml", "products.csv"]);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string; file: string }> }) {
  const { slug, file } = await params;
  if (!FILES.has(file)) return new NextResponse("Not found", { status: 404 });

  const store = await queryOne<{ id: string; name: string; slug: string; description: string | null; custom_domain: string | null; feeds_enabled: boolean }>(
    "SELECT id, name, slug, description, custom_domain, feeds_enabled FROM stores WHERE slug = $1 AND is_active = true",
    [slug]
  );
  if (!store || !store.feeds_enabled) return new NextResponse("Not found", { status: 404 });
  if (!(await hasFeature(store.id, "sales_channels"))) return new NextResponse("Not found", { status: 404 });

  const products = await query<FeedProduct>(
    `SELECT p.id, p.slug, p.name, p.description, p.short_description, p.price, p.compare_price, p.stock_quantity,
            p.image_url, p.images, p.brand, p.gtin, p.google_category, p.sold_out_until, c.name AS category_name
     FROM products p LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.store_id = $1 AND p.is_active = true AND COALESCE(p.is_bookable, false) = false
     ORDER BY p.created_at DESC
     LIMIT 5000`,
    [store.id]
  );

  let url = getStoreUrl(store.slug, store.custom_domain);
  // Catalogs need absolute links even when no root domain is configured (local dev)
  if (url.startsWith("/")) url = `${(process.env.NEXT_PUBLIC_APP_URL ?? "https://dukanigeria.com").replace(/\/$/, "")}${url}`;
  const feedStore = { name: store.name, description: store.description, url };
  const today = lagosParts(new Date()).date;
  const items = products.map((p) => toFeedItem(p, feedStore, today)).filter((i) => i !== null);

  const headers = { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" };
  if (file === "products.csv") {
    return new NextResponse(csvFeed(items), { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" } });
  }
  return new NextResponse(rssFeed(feedStore, items), { headers: { ...headers, "Content-Type": "application/xml; charset=utf-8" } });
}
