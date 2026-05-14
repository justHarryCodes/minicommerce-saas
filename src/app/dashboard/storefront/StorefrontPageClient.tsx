"use client";

import { useState, useRef } from "react";
import toast from "react-hot-toast";
import { Upload, X, GripVertical, Star, Loader2, ImagePlus } from "lucide-react";
import { Tip } from "@/components/dashboard/Tip";
import { clBanner, clThumb } from "@/lib/cloudinary";
import type { Product } from "@/types";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

interface Props {
  initialBanners: string[];
  initialFeatured: string[];
  products: Product[];
}

export default function StorefrontPageClient({ initialBanners, initialFeatured, products }: Props) {
  const [banners, setBanners] = useState<string[]>(initialBanners);
  const [featured, setFeatured] = useState<string[]>(initialFeatured);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [savingBanners, setSavingBanners] = useState(false);
  const [savingFeatured, setSavingFeatured] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Banner upload ──────────────────────────────────────
  async function uploadBanner(file: File) {
    if (file.size > 8 * 1024 * 1024) { toast.error("Image must be under 8 MB"); return; }
    setUploadingBanner(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", UPLOAD_PRESET);
      // Cap the stored master at 1 600 px wide with smart quality.
      // Display-time transforms (clBanner) then derive from this smaller master.
      fd.append("transformation", "c_limit,w_1600,q_auto:good");
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST", body: fd,
      });
      const data = await res.json();
      if (data.secure_url) {
        setBanners((prev) => [...prev, data.secure_url].slice(0, 5));
      } else {
        toast.error("Upload failed");
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploadingBanner(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadBanner(file);
    e.target.value = "";
  }

  async function saveBanners() {
    setSavingBanners(true);
    try {
      const res = await fetch("/api/stores/banner", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: banners }),
      });
      if (res.ok) toast.success("Banner images saved");
      else toast.error("Failed to save");
    } catch {
      toast.error("Network error");
    } finally {
      setSavingBanners(false);
    }
  }

  // ── Featured products ──────────────────────────────────
  function toggleFeatured(id: string) {
    setFeatured((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 10) { toast.error("Max 10 featured products"); return prev; }
      return [...prev, id];
    });
  }

  async function saveFeatured() {
    setSavingFeatured(true);
    try {
      const res = await fetch("/api/stores/featured", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_ids: featured }),
      });
      if (res.ok) toast.success("Featured products saved");
      else toast.error("Failed to save");
    } catch {
      toast.error("Network error");
    } finally {
      setSavingFeatured(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-10">
      <Tip id="storefront-guide" variant="tip">
        <strong>Customise your storefront:</strong> Banners appear as a full-width slideshow at the top of your store. Featured products appear right below the banner — great for showcasing your best sellers. Changes go live as soon as you save.
      </Tip>

      {/* ── Banner images ─────────────────────────────────── */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-surface-900 dark:text-white">Hero Banner</h2>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
            Upload up to 5 images that slide on your store homepage. Best size: 1400 × 600 px, JPG or PNG.
          </p>
        </div>

        {/* Thumbnails */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          {banners.map((url, i) => (
            <div key={url} className="relative group rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700 aspect-video bg-surface-50 dark:bg-surface-800">
              <img src={clBanner(url)} alt={`Banner ${i + 1}`} loading="lazy" decoding="async" className="w-full h-full object-cover" />
              <button
                onClick={() => setBanners((prev) => prev.filter((_, j) => j !== i))}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-red-500"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="absolute bottom-2 left-2 text-xs font-bold text-white bg-black/50 px-2 py-0.5 rounded-full">
                {i + 1}
              </div>
            </div>
          ))}

          {banners.length < 5 && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingBanner}
              className="aspect-video rounded-xl border-2 border-dashed border-surface-300 dark:border-surface-600 flex flex-col items-center justify-center gap-2 hover:border-surface-400 dark:hover:border-surface-500 transition-colors disabled:opacity-50"
            >
              {uploadingBanner ? (
                <Loader2 className="w-6 h-6 animate-spin text-surface-400" />
              ) : (
                <>
                  <ImagePlus className="w-6 h-6 text-surface-400" />
                  <span className="text-xs text-surface-400 font-medium">Add image</span>
                </>
              )}
            </button>
          )}
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

        <div className="flex items-center gap-3">
          <button
            onClick={saveBanners}
            disabled={savingBanners}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-black transition-all disabled:opacity-60 hover:opacity-90"
            style={{ background: "var(--accent)" }}
          >
            {savingBanners ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {savingBanners ? "Saving…" : "Save Banners"}
          </button>
          <p className="text-xs text-surface-400">{banners.length}/5 images</p>
        </div>
      </section>

      {/* ── Featured products ──────────────────────────────── */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-surface-900 dark:text-white">Featured Products</h2>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
            Select up to 10 products to highlight in a slider on your store homepage. The order you check them is the order they appear.
          </p>
        </div>

        {products.length === 0 ? (
          <p className="text-sm text-surface-400 py-8 text-center">
            Add products first before selecting featured ones.
          </p>
        ) : (
          <>
            <div className="rounded-2xl border border-surface-200 dark:border-surface-700 overflow-hidden divide-y divide-surface-100 dark:divide-surface-800">
              {products.map((p) => {
                const selected = featured.includes(p.id);
                const imageUrl = p.images?.[0] ?? p.image_url ?? null;
                return (
                  <label
                    key={p.id}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                      selected
                        ? "bg-amber-50 dark:bg-amber-900/10"
                        : "hover:bg-surface-50 dark:hover:bg-surface-800/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleFeatured(p.id)}
                      className="hidden"
                    />
                    {/* Custom checkbox */}
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                      selected ? "border-amber-400 bg-amber-400" : "border-surface-300 dark:border-surface-600"
                    }`}>
                      {selected && <Star className="w-3 h-3 text-black fill-black" />}
                    </div>

                    {/* Product image */}
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-100 dark:bg-surface-800 shrink-0">
                      {imageUrl ? (
                        <img src={clThumb(imageUrl)} alt={p.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">🛍️</div>
                      )}
                    </div>

                    {/* Name + price */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-900 dark:text-white truncate">{p.name}</p>
                      <p className="text-xs text-surface-400">
                        ₦{Number(p.price).toLocaleString()}
                        {p.stock_quantity === 0 && " · Out of stock"}
                      </p>
                    </div>

                    {selected && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 shrink-0">
                        #{featured.indexOf(p.id) + 1}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>

            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={saveFeatured}
                disabled={savingFeatured}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-black transition-all disabled:opacity-60 hover:opacity-90"
                style={{ background: "var(--accent)" }}
              >
                {savingFeatured ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
                {savingFeatured ? "Saving…" : "Save Featured"}
              </button>
              <p className="text-xs text-surface-400">{featured.length}/10 selected</p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
