import { verifySession, getUserStore } from "@/lib/auth";
import { queryMany } from "@/lib/db";
import ProductForm from "@/components/dashboard/ProductForm";
import type { Category } from "@/types";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function NewProductPage() {
  const user = await verifySession();
  const store = await getUserStore(user!.firebaseUid);

  const categories = await queryMany<Category>(
    `SELECT * FROM categories WHERE store_id = $1 ORDER BY name ASC`,
    [store!.id]
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 pt-4 lg:pt-0">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/products"
          className="p-2 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white">
            Add product
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400">
            Add a new product to your store
          </p>
        </div>
      </div>

      <ProductForm storeId={store!.id} categories={categories} />
    </div>
  );
}
