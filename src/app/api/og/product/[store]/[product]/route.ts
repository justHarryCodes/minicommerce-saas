import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { getCachedStore } from "@/lib/storefront-page";
import { storeCanonicalBase } from "@/lib/seo";
import { CARD_HEADERS, productCard } from "@/lib/og-cards";
import { storeAccent } from "@/lib/store-brand";

export const runtime = "nodejs";

// GET /api/og/product/<storeSlug>/<productSlug or id>?v=<version>
// The share card for a product link (og:image / twitter:image).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ store: string; product: string }> }) {
  const { store: slug, product: productSlug } = await params;
  const store = await getCachedStore(slug);
  if (!store) return new NextResponse("Not found", { status: 404 });
  const p = await queryOne<{
    name: string; price: string; compare_price: string | null; short_description: string | null; description: string | null;
    image_url: string | null; images: string[] | null; stock_quantity: number | null; is_bookable: boolean | null;
  }>(
    `SELECT name, price, compare_price, short_description, description, image_url, images, stock_quantity, is_bookable
       FROM products WHERE store_id = $1 AND (slug = $2 OR id::text = $2) AND is_active = true LIMIT 1`,
    [store.id, productSlug],
  );
  if (!p) return new NextResponse("Not found", { status: 404 });
  try {
    const jpg = await productCard({
      name: p.name,
      price: Number(p.price),
      compare: p.compare_price ? Number(p.compare_price) : null,
      description: p.short_description || p.description,
      image: p.image_url || p.images?.[0] || null,
      storeName: store.name,
      storeLogo: store.logo_url ?? null,
      storeUrl: storeCanonicalBase(store),
      inStock: !!p.is_bookable || Number(p.stock_quantity ?? 0) > 0,
      accent: await storeAccent(store as never),
    });
    return new NextResponse(new Uint8Array(jpg), { headers: CARD_HEADERS });
  } catch (e) {
    console.error("[og] product card failed:", e);
    return new NextResponse("Card unavailable", { status: 500 });
  }
}
