"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Loader2, X, ImageIcon } from "lucide-react";
import type { Category, Product } from "@/types";

const schema = z.object({
  name: z.string().min(2, "Product name is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0.01, "Price must be at least ₦0.01"),
  comparePrice: z.coerce.number().optional(),
  stockQuantity: z.coerce.number().min(0, "Stock cannot be negative").int(),
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  isActive: z.boolean().default(true).optional(),
});
type FormData = z.infer<typeof schema>;

interface Props {
  storeId?: string; // optional — API resolves from session
  categories: (Category & { subcategories?: Category[] })[];
  product?: Product;
}

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-white placeholder-surface-400 text-sm focus:outline-none focus:ring-2 focus:ring-accent-400";

export default function ProductForm({ categories, product }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(
    product?.image_url ?? product?.images?.[0] ?? null
  );
  const [uploading, setUploading] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState(product?.category_id ?? "");

  // Build category tree: top-level cats with their subcategories
  const topCats = categories.filter((c) => !c.parent_id);
  const subCats = selectedCatId
    ? categories.filter((c) => c.parent_id === selectedCatId)
    : [];

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: product?.name ?? "",
      description: product?.description ?? "",
      price: product?.price ?? 0,
      comparePrice: product?.compare_price ?? undefined,
      stockQuantity: product?.stock_quantity ?? 0,
      categoryId: product?.category_id ?? "",
      subcategoryId: product?.subcategory_id ?? "",
      isActive: product?.is_active ?? true,
    },
  });

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Image must be under 10MB"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImageUrl(data.url);
    } catch { toast.error("Image upload failed"); }
    finally { setUploading(false); }
  }

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const isEdit = !!product;
      const url = isEdit ? `/api/products/${product.id}` : "/api/products";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          imageUrl: imageUrl,
          images: imageUrl ? [imageUrl] : [],
          categoryId: data.categoryId || undefined,
          subcategoryId: data.subcategoryId || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(
        typeof json.error === "string" ? json.error : "Failed to save product"
      );

      toast.success(isEdit ? "Product updated!" : "Product added!");
      router.push("/dashboard/products");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-6"
    >
      {/* Image upload */}
      <div>
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
          Product image
        </label>
        <div className="flex items-start gap-4">
          <label className="relative w-32 h-32 rounded-xl border-2 border-dashed border-surface-200 dark:border-surface-700 cursor-pointer hover:border-accent-400 transition-colors overflow-hidden shrink-0">
            {imageUrl ? (
              <img src={imageUrl} alt="Product" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                {uploading
                  ? <Loader2 className="w-5 h-5 text-surface-400 animate-spin" />
                  : <>
                      <ImageIcon className="w-5 h-5 text-surface-300" />
                      <span className="text-xs text-surface-400 text-center px-2">Click to upload</span>
                    </>
                }
              </div>
            )}
            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleImageUpload} disabled={uploading} />
          </label>
          {imageUrl && (
            <button type="button" onClick={() => setImageUrl(null)}
              className="mt-2 flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
              <X className="w-3 h-3" /> Remove
            </button>
          )}
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
          Product name <span className="text-red-500">*</span>
        </label>
        <input {...register("name")} className={inputClass} placeholder="e.g. Premium Sneakers" />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
          Description
        </label>
        <textarea {...register("description")} rows={4}
          className={inputClass + " resize-none"} placeholder="Describe your product…" />
      </div>

      {/* Price */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
            Price (₦) <span className="text-red-500">*</span>
          </label>
          <input {...register("price")} type="number" step="0.01" min="0"
            className={inputClass} placeholder="0.00" />
          {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
            Compare price (₦)
          </label>
          <input {...register("comparePrice")} type="number" step="0.01" min="0"
            className={inputClass} placeholder="Strike-through price" />
        </div>
      </div>

      {/* Stock */}
      <div>
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
          Stock quantity <span className="text-red-500">*</span>
        </label>
        <input {...register("stockQuantity")} type="number" min="0"
          className={inputClass} placeholder="0" />
        {errors.stockQuantity && (
          <p className="text-red-500 text-xs mt-1">{errors.stockQuantity.message}</p>
        )}
      </div>

      {/* Category */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
            Category
          </label>
          <select {...register("categoryId")} className={inputClass}
            onChange={(e) => {
              register("categoryId").onChange(e);
              setSelectedCatId(e.target.value);
              setValue("subcategoryId", "");
            }}>
            <option value="">Select category</option>
            {topCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
            Subcategory
          </label>
          <select {...register("subcategoryId")} className={inputClass}
            disabled={!selectedCatId || subCats.length === 0}>
            <option value="">Select subcategory</option>
            {subCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Active toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input {...register("isActive")} type="checkbox" id="isActive"
          className="w-4 h-4 rounded accent-amber-400" />
        <span className="text-sm text-surface-700 dark:text-surface-300">
          Show this product on storefront
        </span>
      </label>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => router.back()}
          className="flex-1 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-900 dark:text-white font-semibold py-3 rounded-xl text-sm transition-all">
          Cancel
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 bg-accent-400 hover:bg-accent-500 disabled:opacity-60 text-black font-bold py-3 rounded-xl text-sm transition-all">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? "Saving…" : product ? "Update product" : "Add product"}
        </button>
      </div>
    </form>
  );
}
