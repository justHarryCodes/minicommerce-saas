import { redirect } from "next/navigation";
import { featureGate } from "@/components/dashboard/FeatureGate";
import { verifySession } from "@/lib/auth";
import { getPageAccess, can } from "@/lib/access";
import { query } from "@/lib/db";
import PosClient, { type PosProduct } from "./PosClient";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const user = await verifySession();
  if (!user) redirect("/auth/login");
  const { store, role } = await getPageAccess(user, "pos");
  const gate = await featureGate(store.id, "pos", role === "owner");
  if (gate) return gate;

  const [products, sizes, categories] = await Promise.all([
    query<{ id: string; name: string; price: string; stock_quantity: number; has_sizes: boolean; image_url: string | null; images: string[] | null; category_id: string | null; sku: string | null; is_active: boolean }>(
      `SELECT p.id, p.name, p.price, p.stock_quantity, p.has_sizes, p.image_url, p.images, p.category_id, p.is_active,
              (SELECT string_agg(ps.sku, ' ') FROM product_sizes ps WHERE ps.product_id = p.id AND ps.sku IS NOT NULL) AS sku
       FROM products p
       WHERE p.store_id = $1 AND COALESCE(p.is_bookable, false) = false
       ORDER BY p.is_active DESC, p.name`,
      [store.id]
    ),
    query<{ product_id: string; label: string; stock_quantity: number; price: string | null; sku: string | null }>(
      `SELECT ps.product_id, ps.label, ps.stock_quantity, ps.price, ps.sku
       FROM product_sizes ps JOIN products p ON p.id = ps.product_id
       WHERE p.store_id = $1 ORDER BY ps.sort_order, ps.created_at`,
      [store.id]
    ),
    query<{ id: string; name: string }>(
      "SELECT id, name FROM categories WHERE store_id = $1 AND parent_id IS NULL ORDER BY sort_order, name",
      [store.id]
    ),
  ]);

  const sizesBy = new Map<string, PosProduct["sizes"]>();
  for (const s of sizes) {
    const list = sizesBy.get(s.product_id) ?? [];
    list.push({ label: s.label, stock: Number(s.stock_quantity), price: s.price != null ? Number(s.price) : null, sku: s.sku });
    sizesBy.set(s.product_id, list);
  }

  return (
    <PosClient
      storeName={store.name}
      canDiscount={can(role, "products")}
      categories={categories}
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        stock: Number(p.stock_quantity ?? 0),
        image: p.image_url || p.images?.[0] || null,
        categoryId: p.category_id,
        hidden: !p.is_active,
        sku: p.sku,
        sizes: p.has_sizes ? sizesBy.get(p.id) ?? [] : null,
      }))}
    />
  );
}
