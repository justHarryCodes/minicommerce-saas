import { verifySession, getUserStore } from "@/lib/auth";
import { queryMany } from "@/lib/db";
import Link from "next/link";
import { Plus, Package, Pencil } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import DeleteProductButton from "@/components/dashboard/DeleteProductButton";
import type { Product } from "@/types";

export default async function ProductsPage() {
  const user = await verifySession();
  const store = await getUserStore(user!.firebaseUid);

  const products = await queryMany<Product & { category_name: string | null }>(
    `SELECT p.*, c.name AS category_name 
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     WHERE p.store_id = $1
     ORDER BY p.created_at DESC`,
    [store!.id]
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pt-4 lg:pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white">Products</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400">
            {products.length} product{products.length !== 1 ? "s" : ""} in your store
          </p>
        </div>
        <Link
          href="/dashboard/products/new"
          className="flex items-center gap-2 bg-accent-400 hover:bg-accent-500 text-black font-semibold px-4 py-2.5 rounded-xl text-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Add product
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-16 text-center">
          <Package className="w-12 h-12 text-surface-200 dark:text-surface-700 mx-auto mb-4" />
          <h3 className="font-semibold text-surface-900 dark:text-white mb-2">
            No products yet
          </h3>
          <p className="text-sm text-surface-400 mb-6">
            Add your first product to start selling on your storefront.
          </p>
          <Link
            href="/dashboard/products/new"
            className="inline-flex items-center gap-2 bg-accent-400 hover:bg-accent-500 text-black font-semibold px-5 py-2.5 rounded-xl text-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Add first product
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 overflow-hidden">
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50 dark:divide-surface-800">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-10 h-10 rounded-lg object-cover border border-surface-100 dark:border-surface-700"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-surface-100 dark:bg-surface-700 flex items-center justify-center">
                            <Package className="w-4 h-4 text-surface-400" />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-surface-900 dark:text-white">
                            {product.name}
                          </div>
                          {product.description && (
                            <div className="text-xs text-surface-400 truncate max-w-48">
                              {product.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-sm text-surface-500 dark:text-surface-400">
                        {product.category_name ?? "—"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-sm font-semibold text-surface-900 dark:text-white">
                        {formatCurrency(product.price)}
                      </span>
                      {product.compare_price && (
                        <span className="text-xs text-surface-400 line-through ml-1">
                          {formatCurrency(product.compare_price)}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-sm font-medium ${
                          product.stock_quantity ?? 0 === 0
                            ? "text-red-500"
                            : product.stock_quantity ?? 0 <= 5
                            ? "text-yellow-500"
                            : "text-surface-700 dark:text-surface-300"
                        }`}
                      >
                        {product.stock_quantity ?? 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center text-xs px-2 py-1 rounded-full font-medium ${
                          product.is_active
                            ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                            : "bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400"
                        }`}
                      >
                        {product.is_active ? "Active" : "Hidden"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 justify-end">
                        <Link
                          href={`/dashboard/products/${product.id}/edit`}
                          className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Link>
                        <DeleteProductButton productId={product.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-surface-100 dark:divide-surface-800">
            {products.map((product) => (
              <div key={product.id} className="p-4 flex items-center gap-3">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-14 h-14 rounded-xl object-cover border border-surface-100 dark:border-surface-700 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-surface-100 dark:bg-surface-700 flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-surface-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-surface-900 dark:text-white truncate">
                    {product.name}
                  </div>
                  <div className="text-xs text-surface-400 mt-0.5">
                    {formatCurrency(product.price)} · {product.stock_quantity ?? 0} in stock
                  </div>
                </div>
                <Link
                  href={`/dashboard/products/${product.id}/edit`}
                  className="p-2 rounded-lg text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800"
                >
                  <Pencil className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
