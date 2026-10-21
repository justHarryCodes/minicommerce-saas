"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import {
  Loader2,
  X,
  ImageIcon,
  Sparkles,
  UploadCloud,
  Lock,
} from "lucide-react";
import { VariantEditor, initialVariantState, variantPayload, type VariantState } from "@/components/dashboard/VariantEditor";
import { BookableFields, SizeGuideEditor } from "@/components/dashboard/ProductExtras";
import { parseSizeGuide, type SizeGuide } from "@/lib/size-guide";
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
  "w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-white placeholder-surface-400 text-sm focus:outline-none focus:ring-2 focus:ring-accent-400 disabled:opacity-50 disabled:cursor-not-allowed";

const cardClass =
  "bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-5 sm:p-6";

const labelClass =
  "block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5";

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-bold text-surface-900 dark:text-white">
        {title}
      </h2>
      {hint && <p className="text-xs text-surface-400 mt-0.5">{hint}</p>}
    </div>
  );
}

export default function ProductForm({ categories, product }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(
    product?.image_url ?? product?.images?.[0] ?? null,
  );
  const [uploading, setUploading] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState(
    product?.category_id ?? "",
  );
  const [variants, setVariants] = useState<VariantState>(() =>
    initialVariantState(product?.option_names ?? product?.optionNames, product?.sizes),
  );
  const sizes = variants.variants;
  const [service, setService] = useState<{ isBookable: boolean; durationMinutes: number | null }>({
    isBookable: Boolean(product?.is_bookable ?? product?.isBookable),
    durationMinutes: product?.duration_minutes ?? product?.durationMinutes ?? null,
  });
  const [sizeGuide, setSizeGuide] = useState<SizeGuide | null>(() => parseSizeGuide(product?.size_guide ?? product?.sizeGuide));
  const [lowStockThreshold, setLowStockThreshold] = useState<string>(
    String(product?.low_stock_threshold ?? product?.lowStockThreshold ?? ""),
  );

  // AI assist — hidden entirely until GROQ_API_KEY/GEMINI_API_KEY are configured.
  // product-description and suggest-category are both Pro-only server-side
  // (requirePro()) — isPro gates whether the button is clickable at all
  // rather than rendering it live for every plan and letting it 403.
  const [aiAvailable, setAiAvailable] = useState({
    groq: false,
    gemini: false,
    isPro: false,
  });
  const [writingDescription, setWritingDescription] = useState(false);
  const [categorySuggestion, setCategorySuggestion] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/ai/status")
      .then((res) =>
        res.ok ? res.json() : { groq: false, gemini: false, isPro: false },
      )
      .then(setAiAvailable)
      .catch(() => {});
  }, []);

  // Build category tree: top-level cats with their subcategories
  const topCats = categories.filter((c) => !c.parent_id);
  const subCats = selectedCatId
    ? categories.filter((c) => c.parent_id === selectedCatId)
    : [];

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<FormData>({
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

  const priceVal = Number(watch("price")) || 0;
  const compareVal = Number(watch("comparePrice")) || 0;
  const isActiveVal = watch("isActive");
  const descLen = (watch("description") ?? "").length;
  const hasDiscount = compareVal > 0 && priceVal > 0 && compareVal > priceVal;
  const discountPct = hasDiscount
    ? Math.round(((compareVal - priceVal) / compareVal) * 100)
    : 0;
  const compareTooLow =
    compareVal > 0 && priceVal > 0 && compareVal <= priceVal;

  const categoryReg = register("categoryId");

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setImageUrl(data.url);
      if (aiAvailable.gemini && aiAvailable.isPro) suggestCategory(data.url);
    } catch {
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
      e.target.value = ""; // allow re-selecting the same file
    }
  }

  // Fire-and-forget — never blocks the upload flow, just surfaces a
  // dismissible chip near the category field if it succeeds.
  async function suggestCategory(uploadedImageUrl: string) {
    try {
      const res = await fetch("/api/ai/suggest-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: uploadedImageUrl }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.suggestedCategoryId) {
        setCategorySuggestion({
          id: data.suggestedCategoryId,
          name: data.suggestedCategoryName,
        });
      }
    } catch {
      /* silent — this is a convenience suggestion, not required */
    }
  }

  // When sizes are in use, product-level stock is the sum of size stocks —
  // keep the (now read-only) Stock quantity field in sync so the number
  // shown on screen and the number submitted always match.
  useEffect(() => {
    if (sizes.length > 0) {
      setValue(
        "stockQuantity",
        sizes.reduce((sum, s) => sum + (s.stockQuantity ?? 0), 0),
      );
    }
  }, [sizes, setValue]);

  function applyCategorySuggestion() {
    if (!categorySuggestion) return;
    setValue("categoryId", categorySuggestion.id);
    setSelectedCatId(categorySuggestion.id);
    setValue("subcategoryId", "");
    setCategorySuggestion(null);
  }

  async function generateDescription() {
    const name = getValues("name");
    if (!name || name.trim().length < 2) {
      toast.error("Enter a product name first");
      return;
    }
    setWritingDescription(true);
    try {
      const categoryName = topCats.find((c) => c.id === selectedCatId)?.name;
      const res = await fetch("/api/ai/product-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category: categoryName }),
      });
      const data = await res.json();
      // data.error is a plain string from every route this calls except the
      // Zod-validation-failure case, which is a Zod .flatten() object.
      if (!res.ok)
        throw new Error(
          typeof data.error === "string" ? data.error : "AI generation failed",
        );
      if (data.description) setValue("description", data.description);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI generation failed");
    } finally {
      setWritingDescription(false);
    }
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
          ...variantPayload(variants),
          lowStockThreshold:
            lowStockThreshold.trim() === "" ? null : Math.max(0, parseInt(lowStockThreshold, 10) || 0),
          isBookable: service.isBookable,
          durationMinutes: service.durationMinutes,
          sizeGuide,
        }),
      });

      const json = await res.json();
      if (!res.ok)
        throw new Error(
          typeof json.error === "string"
            ? json.error
            : "Failed to save product",
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        {/* ═════════════ MAIN COLUMN ═════════════ */}
        <div className="space-y-6 lg:order-1 order-2">
          {/* Basics */}
          <section className={cardClass}>
            <SectionTitle title="Product details" />
            <div className="space-y-5">
              <div>
                <label className={labelClass} htmlFor="pf-name">
                  Product name <span className="text-red-500">*</span>
                </label>
                <input
                  id="pf-name"
                  {...register("name")}
                  className={inputClass}
                  placeholder="e.g. Premium Sneakers"
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    className="block text-sm font-medium text-surface-700 dark:text-surface-300"
                    htmlFor="pf-desc"
                  >
                    Description
                  </label>
                  {aiAvailable.groq &&
                    (aiAvailable.isPro ? (
                      <button
                        type="button"
                        onClick={generateDescription}
                        disabled={writingDescription}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/50 disabled:opacity-50 transition-colors"
                      >
                        {writingDescription ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                        {writingDescription ? "Writing…" : "Write with AI"}
                      </button>
                    ) : (
                      // Same feature, but requirePro() would 403 this for a
                      // non-Pro store — a locked/upgrade link instead of a
                      // button that looks live but always fails.
                      <Link
                        href="/dashboard/billing"
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-100 dark:bg-surface-800 text-surface-500 hover:text-accent-600 dark:hover:text-accent-400 transition-colors"
                      >
                        <Lock className="w-3 h-3" />
                        AI writing · Pro
                      </Link>
                    ))}
                </div>
                <textarea
                  id="pf-desc"
                  {...register("description")}
                  rows={5}
                  className={inputClass + " resize-none"}
                  placeholder="Materials, sizes, what makes it special…"
                />
                <p className="text-xs text-surface-400 mt-1 text-right">
                  {descLen} characters
                </p>
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section className={cardClass}>
            <SectionTitle
              title="Pricing"
              hint="Add a compare price to show a strike-through discount on your storefront."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="pf-price">
                  Price <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-surface-400">
                    ₦
                  </span>
                  <input
                    id="pf-price"
                    {...register("price")}
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    className={inputClass + " pl-8"}
                    placeholder="0.00"
                  />
                </div>
                {errors.price && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.price.message}
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass} htmlFor="pf-compare">
                  Compare price
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-surface-400">
                    ₦
                  </span>
                  <input
                    id="pf-compare"
                    {...register("comparePrice")}
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    className={inputClass + " pl-8"}
                    placeholder="Original price"
                  />
                </div>
                {hasDiscount && (
                  <p className="text-xs font-semibold text-green-600 dark:text-green-400 mt-1">
                    Shoppers will see {discountPct}% off
                  </p>
                )}
                {compareTooLow && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Compare price should be higher than the price to show a
                    discount.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Inventory */}
          <section className={cardClass}>
            <SectionTitle title="Inventory" />
            <div className="mb-5 pb-5 border-b border-surface-100 dark:border-surface-800">
              <BookableFields isBookable={service.isBookable} durationMinutes={service.durationMinutes} onChange={setService} />
            </div>
            {!service.isBookable && (<>
            <div>
              <label className={labelClass} htmlFor="pf-stock">
                Stock quantity <span className="text-red-500">*</span>
              </label>
              <input
                id="pf-stock"
                {...register("stockQuantity")}
                type="number"
                min="0"
                inputMode="numeric"
                readOnly={sizes.length > 0}
                className={
                  inputClass +
                  (sizes.length > 0
                    ? " opacity-60 cursor-not-allowed sm:max-w-xs"
                    : " sm:max-w-xs")
                }
                placeholder="0"
              />
              {sizes.length > 0 ? (
                <p className="text-xs text-surface-400 mt-1">
                  Auto-calculated from the variants below
                </p>
              ) : (
                errors.stockQuantity && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.stockQuantity.message}
                  </p>
                )
              )}
            </div>

            <div className="mt-4">
              <label className={labelClass} htmlFor="pf-low-stock">
                Low-stock alert at
              </label>
              <input
                id="pf-low-stock"
                type="number"
                min="0"
                inputMode="numeric"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                className={inputClass + " sm:max-w-xs"}
                placeholder="Store default"
              />
              <p className="text-xs text-surface-400 mt-1">
                We&apos;ll notify you when {sizes.length > 0 ? "any variant" : "stock"} drops to this number.
              </p>
            </div>

            <div className="mt-5 pt-5 border-t border-surface-100 dark:border-surface-800">
              <VariantEditor value={variants} onChange={setVariants} basePrice={Number(watch("price")) || undefined} />
            </div>

            <div className="mt-5 pt-5 border-t border-surface-100 dark:border-surface-800">
              <SizeGuideEditor value={sizeGuide} onChange={setSizeGuide} />
            </div>
            </>)}
          </section>
        </div>

        {/* ═════════════ SIDEBAR ═════════════ */}
        <aside className="space-y-6 lg:order-2 order-1 lg:sticky lg:top-6">
          {/* Image */}
          <section className={cardClass}>
            <SectionTitle
              title="Product image"
              hint="Square photos look best. Max 10MB."
            />
            <div className="relative">
              <label
                className={`relative flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-colors hover:border-accent-400 ${
                  imageUrl
                    ? "border-transparent"
                    : "border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/40"
                }`}
              >
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt="Product"
                    fill
                    sizes="340px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 px-4 text-center">
                    {uploading ? (
                      <Loader2 className="w-7 h-7 text-surface-400 animate-spin" />
                    ) : (
                      <>
                        <span className="w-12 h-12 rounded-2xl bg-white dark:bg-surface-800 shadow-sm flex items-center justify-center">
                          <UploadCloud className="w-6 h-6 text-accent-500" />
                        </span>
                        <span className="text-sm font-semibold text-surface-700 dark:text-surface-300">
                          Click to upload
                        </span>
                        <span className="text-xs text-surface-400 flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" /> PNG, JPG or WebP
                        </span>
                      </>
                    )}
                  </div>
                )}
                {imageUrl && uploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="w-7 h-7 text-white animate-spin" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
              </label>

              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl(null)}
                  aria-label="Remove image"
                  className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {imageUrl && (
              <p className="text-xs text-surface-400 mt-2">
                Click the image to replace it.
              </p>
            )}
          </section>

          {/* Visibility */}
          <section className={cardClass}>
            <SectionTitle title="Visibility" />
            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <span>
                <span className="block text-sm font-medium text-surface-800 dark:text-surface-200">
                  {isActiveVal
                    ? "Visible on storefront"
                    : "Hidden from storefront"}
                </span>
                <span className="block text-xs text-surface-400 mt-0.5">
                  {isActiveVal
                    ? "Shoppers can find and buy this product."
                    : "Only you can see this product."}
                </span>
              </span>
              <span className="relative shrink-0">
                <input
                  {...register("isActive")}
                  type="checkbox"
                  id="isActive"
                  className="peer sr-only"
                />
                <span className="block h-6 w-11 rounded-full bg-surface-200 dark:bg-surface-700 transition-colors peer-checked:bg-accent-400 peer-focus-visible:ring-2 peer-focus-visible:ring-accent-400 peer-focus-visible:ring-offset-2" />
                <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
              </span>
            </label>
          </section>

          {/* Organization */}
          <section className={cardClass}>
            <SectionTitle title="Organization" />
            <div className="space-y-4">
              <div>
                <label className={labelClass} htmlFor="pf-cat">
                  Category
                </label>
                <select
                  id="pf-cat"
                  {...categoryReg}
                  className={inputClass}
                  onChange={(e) => {
                    categoryReg.onChange(e);
                    setSelectedCatId(e.target.value);
                    setValue("subcategoryId", "");
                    setCategorySuggestion(null);
                  }}
                >
                  <option value="">Select category</option>
                  {topCats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {categorySuggestion &&
                  categorySuggestion.id !== selectedCatId && (
                    <button
                      type="button"
                      onClick={applyCategorySuggestion}
                      className="mt-2 flex w-full items-center gap-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-left text-xs font-medium text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        AI suggests &ldquo;{categorySuggestion.name}&rdquo; —{" "}
                        <span className="font-bold underline">apply</span>
                      </span>
                    </button>
                  )}
              </div>

              <div>
                <label className={labelClass} htmlFor="pf-sub">
                  Subcategory
                </label>
                <select
                  id="pf-sub"
                  {...register("subcategoryId")}
                  className={inputClass}
                  disabled={!selectedCatId || subCats.length === 0}
                >
                  <option value="">
                    {selectedCatId && subCats.length === 0
                      ? "No subcategories"
                      : "Select subcategory"}
                  </option>
                  {subCats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {topCats.length === 0 && (
                <p className="text-xs text-surface-400">
                  No categories yet.{" "}
                  <Link
                    href="/dashboard/categories"
                    className="font-semibold text-accent-600 dark:text-accent-400 hover:underline"
                  >
                    Create one
                  </Link>
                </p>
              )}
            </div>
          </section>
        </aside>
      </div>

      {/* ═════════════ ACTION BAR ═════════════ */}
      <div className="sticky bottom-3 z-20 flex gap-3 rounded-2xl border border-surface-100 dark:border-surface-800 bg-white/90 dark:bg-surface-900/90 p-3 shadow-lg backdrop-blur-md">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 sm:flex-none sm:px-8 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-900 dark:text-white font-semibold py-3 rounded-xl text-sm transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || uploading}
          className="flex-1 sm:ml-auto sm:flex-none sm:px-10 flex items-center justify-center gap-2 bg-accent-400 hover:bg-accent-500 disabled:opacity-60 text-black font-bold py-3 rounded-xl text-sm transition-all"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? "Saving…" : product ? "Update product" : "Add product"}
        </button>
      </div>
    </form>
  );
}
