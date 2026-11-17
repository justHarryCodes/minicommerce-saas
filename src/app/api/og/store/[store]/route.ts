import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCachedStore } from "@/lib/storefront-page";
import { storeCanonicalBase } from "@/lib/seo";
import { CARD_HEADERS, storeCard } from "@/lib/og-cards";
import { storeAccent } from "@/lib/store-brand";

export const runtime = "nodejs";

// GET /api/og/store/<storeSlug>?v=<version>
// The share card for a store link: logo, name, description, four product photos.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ store: string }> }) {
  const store = await getCachedStore((await params).store);
  if (!store) return new NextResponse("Not found", { status: 404 });
  const [photos, count] = await Promise.all([
    query<{ img: string }>(
      `SELECT COALESCE(NULLIF(image_url, ''), images[1]) AS img FROM products
        WHERE store_id = $1 AND is_active = true AND COALESCE(NULLIF(image_url, ''), images[1]) IS NOT NULL
        ORDER BY is_featured DESC, created_at DESC LIMIT 3`,
      [store.id],
    ),
    query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM products WHERE store_id = $1 AND is_active = true`, [store.id]),
  ]);
  try {
    const jpg = await storeCard({
      name: store.name,
      logo: store.logo_url ?? null,
      description: store.description ?? null,
      url: storeCanonicalBase(store),
      productCount: Number(count[0]?.n ?? 0),
      photos: photos.map((r) => r.img),
      accent: await storeAccent(store as never),
    });
    return new NextResponse(new Uint8Array(jpg), { headers: CARD_HEADERS });
  } catch (e) {
    console.error("[og] store card failed:", e);
    return new NextResponse("Card unavailable", { status: 500 });
  }
}
