import { NextRequest, NextResponse } from "next/server";
import { getCachedStore } from "@/lib/storefront-page";
import { recordView, validView } from "@/lib/product-views";

// A shopper opened a product page. Body: { product_id, visitor_id } where
// visitor_id is the storefront's anonymous browser id (sf_vid).
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json().catch(() => ({}));
  if (!validView(body.product_id, body.visitor_id)) return NextResponse.json({ ok: false }, { status: 400 });

  const store = await getCachedStore(slug);
  if (!store || !store.is_active) return NextResponse.json({ ok: false }, { status: 404 });

  try {
    await recordView(store.id, body.product_id, body.visitor_id);
  } catch {
    // Tracking never matters enough to show the shopper an error
  }
  return new NextResponse(null, { status: 204 });
}
