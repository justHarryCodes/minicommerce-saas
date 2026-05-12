import { redirect, notFound } from "next/navigation";
import { verifySession, getUserStore } from "@/lib/auth";
import { queryOne, queryMany } from "@/lib/db";
import ProductForm from "@/components/dashboard/ProductForm";
import type { Product, Category } from "@/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;

  const user = await verifySession();
  if (!user) redirect("/auth/login");

  const store = await getUserStore(user.firebaseUid);
  if (!store) redirect("/onboarding");

  const [product, categories] = await Promise.all([
    queryOne<Product>(
      "SELECT * FROM products WHERE id = $1 AND store_id = $2",
      [id, store.id]
    ),
    queryMany<Category>(
      "SELECT * FROM categories WHERE store_id = $1 AND parent_id IS NULL ORDER BY name ASC",
      [store.id]
    ),
  ]);

  if (!product) notFound();

  const subcategoriesRaw = await queryMany<Category>(
    "SELECT * FROM categories WHERE store_id = $1 AND parent_id IS NOT NULL ORDER BY name ASC",
    [store.id]
  );

  const categoriesWithSubs = categories.map((cat) => ({
    ...cat,
    subcategories: subcategoriesRaw.filter((s) => s.parent_id === cat.id),
  }));

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-surface-900 dark:text-white">Edit product</h1>
        <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">{product.name}</p>
      </div>
      <ProductForm product={product} categories={categoriesWithSubs} />
    </div>
  );
}
