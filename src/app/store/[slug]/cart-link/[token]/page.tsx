import type { Metadata } from "next";
import { getCachedStore } from "@/lib/storefront-page";
import { resolveCartLink } from "@/lib/meta/cart-links";
import CartLinkClient from "./CartLinkClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your cart", robots: { index: false, follow: false } };

// "Checkout" from a WhatsApp chat lands here: the chat's cart is loaded into
// this store's normal cart, then the shopper continues at the usual checkout.
export default async function CartLinkPage({ params }: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await params;
  const store = await getCachedStore(slug);
  const link = store ? await resolveCartLink(store.id, token).catch(() => null) : null;
  return <CartLinkClient token={token} items={link?.items ?? null} dropped={link?.dropped ?? 0} />;
}
