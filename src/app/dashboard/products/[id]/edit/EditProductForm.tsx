"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2, Package } from "lucide-react";
import type { Product } from "@/types";

interface Props {
  product: Product;
}

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-white placeholder-surface-400 text-sm focus:outline-none focus:ring-2 focus:ring-accent-400 transition-all";

const labelClass =
  "block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-1.5";

export default function EditProductForm({ product }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: product.name ?? "",
    description: product.description ?? "",
    price: String(product.price ?? ""),
    comparePrice: String(product.compare_price ?? product.comparePrice ?? ""),
    stockQuantity: String(product.stock_quantity ?? product.stockQuantity ?? 0),
    isActive: product.is_active ?? product.isActive ?? true,
  });

  const set = (k: keyof typeof form, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const name = form.name.trim();
    if (name.length < 2) {
      toast.error("Product name must be at least 2 characters");
      return;
    }
    const price = parseFloat(form.price);
    if (isNaN(price) || price <= 0) {
      toast.error("Enter a valid price");
      return;
    }
    const stock = parseInt(form.stockQuantity, 10);
    if (isNaN(stock) || stock < 0) {
      toast.error("Stock quantity cannot be negative");
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        name,
        description: form.description.trim() || null,
        price,
        stockQuantity: stock,
        isActive: form.isActive,
      };
      const cp = parseFloat(form.comparePrice);
      body.comparePrice = !isNaN(cp) && cp > 0 ? cp : null;

      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Update failed");

      toast.success("Product updated!");
      router.push("/dashboard/products");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  }

  const currentStock = product.stock_quantity ?? product.stockQuantity ?? 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Image — read-only */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-4 flex items-center gap-4">
        {product.image_url ?? product.imageUrl ? (
          <img
            src={(product.image_url ?? product.imageUrl)!}
            alt={product.name}
            className="w-16 h-16 rounded-xl object-cover border border-surface-100 dark:border-surface-700 shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-surface-100 dark:bg-surface-700 flex items-center justify-center shrink-0">
            <Package className="w-7 h-7 text-surface-400" />
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-surface-900 dark:text-white leading-tight">
            {product.name}
          </p>
          <p className="text-xs text-surface-400 mt-1">Product image cannot be changed here</p>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-5 space-y-4">
        <h2 className="text-sm font-bold text-surface-900 dark:text-white">Details</h2>
        <div>
          <label className={labelClass}>Product name</label>
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Product name"
            required
          />
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <textarea
            className={inputClass + " resize-none"}
            rows={3}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Short product description (optional)"
          />
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-5 space-y-4">
        <h2 className="text-sm font-bold text-surface-900 dark:text-white">Pricing</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Price (₦)</label>
            <input
              className={inputClass}
              type="number"
              min="0.01"
              step="0.01"
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              placeholder="0.00"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Compare price (₦)</label>
            <input
              className={inputClass}
              type="number"
              min="0"
              step="0.01"
              value={form.comparePrice}
              onChange={(e) => set("comparePrice", e.target.value)}
              placeholder="Was ₦ …"
            />
          </div>
        </div>
        <p className="text-xs text-surface-400">
          Set a compare price to show a crossed-out &ldquo;was ₦X&rdquo; on your storefront.
        </p>
      </div>

      {/* Stock */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-surface-900 dark:text-white">Stock</h2>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              currentStock === 0
                ? "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                : currentStock <= 5
                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400"
                : "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
            }`}
          >
            {currentStock === 0 ? "Out of stock" : `${currentStock} in stock`}
          </span>
        </div>
        <div>
          <label className={labelClass}>Quantity in stock</label>
          <input
            className={inputClass}
            type="number"
            min="0"
            step="1"
            value={form.stockQuantity}
            onChange={(e) => set("stockQuantity", e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      {/* Visibility */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-surface-900 dark:text-white">Visible on storefront</p>
            <p className="text-xs text-surface-400 mt-0.5">
              Hidden products won&apos;t appear to shoppers
            </p>
          </div>
          <button
            type="button"
            onClick={() => set("isActive", !form.isActive)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              form.isActive
                ? "bg-accent-400"
                : "bg-surface-200 dark:bg-surface-700"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                form.isActive ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1 pb-6">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 bg-accent-400 hover:bg-accent-500 disabled:opacity-50 text-black font-bold py-3 rounded-xl text-sm transition-all"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-3 rounded-xl border border-surface-200 dark:border-surface-700 text-sm font-semibold text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-all"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
