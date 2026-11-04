import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { verifySession } from "@/lib/auth";
import { getPageStore } from "@/lib/access";
import { queryMany } from "@/lib/db";
import { getEffectivePlan } from "@/lib/plan";
import { isSoldOutToday } from "@/lib/hours";
import { Tip } from "@/components/dashboard/Tip";
import { PageHeader } from "@/components/dashboard/ui";
import ProductsTable, { type ProductRow } from "./ProductsTable";

export default async function ProductsPage() {
  const user = await verifySession();
  const store = await getPageStore(user!, "products");

  const [rows, categories, plan] = await Promise.all([
    queryMany<ProductRow & { sold_out_until: string | Date | null; low_stock_threshold: number | null }>(
      `SELECT p.id, p.name, p.image_url, p.price, p.compare_price, p.stock_quantity, p.is_active,
              COALESCE(p.is_bookable, false) AS is_bookable, COALESCE(p.has_sizes, false) AS has_sizes,
              p.category_id, c.name AS category_name, p.sold_out_until, p.low_stock_threshold, p.created_at
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id AND c.store_id = p.store_id
       WHERE p.store_id = $1
       ORDER BY p.created_at DESC`,
      [store.id]
    ),
    queryMany<{ id: string; name: string }>(
      "SELECT id, name FROM categories WHERE store_id = $1 AND parent_id IS NULL ORDER BY sort_order, name",
      [store.id]
    ),
    getEffectivePlan(store.id),
  ]);

  const st = store as { lowStockThreshold?: number | null; low_stock_threshold?: number | null };
  const storeLow = st.lowStockThreshold ?? st.low_stock_threshold ?? 5;
  const products: ProductRow[] = rows.map((p) => ({
    id: p.id,
    name: p.name,
    image_url: p.image_url,
    price: Number(p.price),
    compare_price: p.compare_price != null ? Number(p.compare_price) : null,
    stock_quantity: Number(p.stock_quantity ?? 0),
    is_active: p.is_active,
    is_bookable: p.is_bookable,
    has_sizes: p.has_sizes,
    category_id: p.category_id,
    category_name: p.category_name,
    sold_out_today: isSoldOutToday(p.sold_out_until),
    low_at: p.low_stock_threshold ?? storeLow,
    created_at: new Date(p.created_at).toISOString(),
  }));
  const atLimit = products.length >= plan.max_products;

  return (
    <div className="pt-1 lg:pt-0">
      <PageHeader
        subtitle={`${products.length} of ${plan.max_products} products on the ${plan.name} plan`}
        actions={
          atLimit ? (
            <Link href="/dashboard/billing" className="inline-flex h-8 items-center gap-1 rounded-md border border-zinc-300 px-3 text-[13px] font-semibold text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
              Limit reached · Upgrade
            </Link>
          ) : (
            <Link href="/dashboard/products/new" className="inline-flex h-8 items-center gap-1 rounded-md bg-accent-400 px-3 text-[13px] font-bold text-black hover:bg-accent-500">
              <Plus className="h-4 w-4" /> Add product
            </Link>
          )
        }
      />
      {products.length > 0 && products.length < 4 && (
        <div className="mb-3">
          <Tip id="products-guide" variant="tip">
            <strong>Tip:</strong> clear photos and a category help shoppers find things. A compare price shows a &ldquo;was ₦X&rdquo; discount.
          </Tip>
        </div>
      )}
      <Suspense>
        <ProductsTable products={products} categories={categories} atLimit={atLimit} />
      </Suspense>
    </div>
  );
}
