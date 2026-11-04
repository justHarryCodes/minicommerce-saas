"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { ArrowDown, ArrowUp, Check, ImagePlus, Loader2, Search, Star, Upload, X } from "lucide-react";
import { clBanner, clThumb } from "@/lib/cloudinary";
import type { Product } from "@/types";

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
  const [query, setQuery] = useState("");
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const found = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? products.filter((p) => p.name.toLowerCase().includes(q)) : products;
  }, [products, query]);
  const moveFeatured = (i: number, dir: -1 | 1) =>
    setFeatured((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  // ── Banner upload ──────────────────────────────────────
  async function uploadBanner(file: File) {
    if (file.size > 8 * 1024 * 1024) { toast.error("Image must be under 8 MB"); return; }
    setUploadingBanner(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setBanners((prev) => [...prev, data.url].slice(0, 5));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
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

  const panel = "overflow-hidden rounded-lg border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900";
  const head = "flex h-11 items-center justify-between gap-2 border-b border-zinc-100 px-3 dark:border-zinc-800";
  const saveBtn =
    "flex h-8 items-center gap-1.5 rounded-md bg-accent-400 px-3 text-[13px] font-bold text-black hover:bg-accent-500 disabled:opacity-60";

  return (
    <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      {/* ── Left: what shoppers see first ── */}
      <div className="min-w-0 space-y-3">
        <section className={panel}>
          <header className={head}>
            <div className="min-w-0">
              <h2 className="text-[13px] font-semibold text-zinc-900 dark:text-white">Hero banner</h2>
              <p className="truncate text-[11px] text-zinc-500">Up to 5 slides · best 1400 × 600 px</p>
            </div>
            <button onClick={saveBanners} disabled={savingBanners} className={saveBtn}>
              {savingBanners ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {savingBanners ? "Saving…" : "Save banners"}
            </button>
          </header>
          <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
            {banners.map((url, i) => (
              <div key={url} className="group relative aspect-video overflow-hidden rounded-md border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
                <Image src={clBanner(url)} alt={`Banner ${i + 1}`} fill sizes="(min-width: 1280px) 15vw, 33vw" className="object-cover" />
                <button
                  onClick={() => setBanners((prev) => prev.filter((_, j) => j !== i))}
                  aria-label={`Remove banner ${i + 1}`}
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-red-500 focus:opacity-100 group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
                <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/55 px-1.5 text-[10px] font-bold text-white">{i + 1}</span>
              </div>
            ))}
            {banners.length < 5 && (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadingBanner}
                className="flex aspect-video flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-zinc-300 text-zinc-400 transition-colors hover:border-zinc-400 disabled:opacity-50 dark:border-zinc-600"
              >
                {uploadingBanner ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                <span className="text-[11px] font-medium">{uploadingBanner ? "Uploading…" : "Add slide"}</span>
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </section>

        <section className={panel}>
          <header className={head}>
            <div className="min-w-0">
              <h2 className="text-[13px] font-semibold text-zinc-900 dark:text-white">
                Featured on your homepage <span className="font-normal text-zinc-400">· {featured.length}/10</span>
              </h2>
              <p className="truncate text-[11px] text-zinc-500">Shown in this order, right under the banner</p>
            </div>
            <button onClick={saveFeatured} disabled={savingFeatured} className={saveBtn}>
              {savingFeatured ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Star className="h-3.5 w-3.5" />}
              {savingFeatured ? "Saving…" : "Save featured"}
            </button>
          </header>
          {featured.length === 0 ? (
            <p className="px-3 py-8 text-center text-[13px] text-zinc-500">Pick products on the {products.length ? "right" : "Products page first"} to feature them here.</p>
          ) : (
            <ol className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {featured.map((id, i) => {
                const p = byId.get(id);
                const img = p ? p.images?.[0] ?? p.image_url ?? null : null;
                return (
                  <li key={id} className="flex items-center gap-2.5 px-3 py-1.5">
                    <span className="w-5 text-right text-[11px] font-bold tabular-nums text-zinc-400">{i + 1}</span>
                    <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                      {img && <Image src={clThumb(img)} alt="" fill sizes="32px" className="object-cover" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-900 dark:text-white">{p?.name ?? "Product no longer available"}</span>
                    <span className="flex shrink-0 items-center">
                      <button onClick={() => moveFeatured(i, -1)} disabled={i === 0} aria-label="Move up" className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-30 dark:hover:bg-zinc-800">
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => moveFeatured(i, 1)} disabled={i === featured.length - 1} aria-label="Move down" className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-30 dark:hover:bg-zinc-800">
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => toggleFeatured(id)} aria-label="Remove from featured" className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>

      {/* ── Right: pick products ── */}
      <section className={`${panel} xl:sticky xl:top-16`}>
        <header className={head}>
          <h2 className="text-[13px] font-semibold text-zinc-900 dark:text-white">Your products</h2>
          <label className="flex h-8 w-full max-w-[220px] items-center gap-2 rounded-md border border-zinc-200 px-2 focus-within:ring-2 focus-within:ring-accent-400 dark:border-zinc-700">
            <Search className="h-3.5 w-3.5 text-zinc-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              aria-label="Search products"
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13px] text-zinc-900 shadow-none outline-none placeholder:text-zinc-400 focus:ring-0 dark:text-white"
            />
          </label>
        </header>
        {products.length === 0 ? (
          <p className="px-3 py-8 text-center text-[13px] text-zinc-500">Add products first, then feature your best ones here.</p>
        ) : (
          <ul className="max-h-[calc(100vh-11rem)] divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800">
            {found.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-zinc-500">No products match.</li>}
            {found.map((p) => {
              const on = featured.includes(p.id);
              const img = p.images?.[0] ?? p.image_url ?? null;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => toggleFeatured(p.id)}
                    aria-pressed={on}
                    className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors ${on ? "bg-amber-50 dark:bg-amber-900/10" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"}`}
                  >
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 ${on ? "border-amber-400 bg-amber-400 text-black" : "border-zinc-300 dark:border-zinc-600"}`}>
                      {on && <Check className="h-2.5 w-2.5" strokeWidth={4} />}
                    </span>
                    <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                      {img ? <Image src={clThumb(img)} alt="" fill sizes="32px" className="object-cover" /> : <span className="grid h-full place-items-center text-sm">🛍️</span>}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-zinc-900 dark:text-white">{p.name}</span>
                      <span className="block text-[11px] text-zinc-500">
                        ₦{Number(p.price).toLocaleString("en-NG")}
                        {Number(p.stock_quantity) === 0 && <span className="text-red-500"> · Out of stock</span>}
                      </span>
                    </span>
                    {on && <span className="shrink-0 rounded-full bg-amber-100 px-1.5 text-[11px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">#{featured.indexOf(p.id) + 1}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
