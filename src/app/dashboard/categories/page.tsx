import { verifySession, getUserStore } from "@/lib/auth";
import { queryMany } from "@/lib/db";
import CategoryManager from "@/components/dashboard/CategoryManager";
import type { Category } from "@/types";

export default async function CategoriesPage() {
  const user = await verifySession();
  const store = await getUserStore(user!.firebaseUid);

  const categories = await queryMany<Category>(
    `SELECT * FROM categories WHERE store_id = $1 ORDER BY sort_order ASC, name ASC`,
    [store!.id]
  );

  const topLevel = categories.filter((c) => !c.parent_id);
  const withSubs = topLevel.map((cat) => ({
    ...cat,
    subcategories: categories.filter((c) => c.parent_id === cat.id),
  }));

  return (
    <div className="max-w-2xl mx-auto space-y-6 pt-4 lg:pt-0">
      <div>
        <h1 className="text-xl font-bold text-surface-900 dark:text-white">Categories</h1>
        <p className="text-sm text-surface-500 dark:text-surface-400">
          Organise your products with categories and subcategories
        </p>
      </div>

      <CategoryManager storeId={store!.id} categories={withSubs} />
    </div>
  );
}
