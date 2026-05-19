"use client";

import { useState, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import {
  Video, Upload, X, Trash2, Eye, Star, Loader2,
  Plus, Film, BarChart2, Package,
} from "lucide-react";
import { Tip } from "@/components/dashboard/Tip";
import type { Reel, Product } from "@/types";

const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload`;
const MAX_FILE_MB = 15;

interface Props {
  storeId:      string;
  storeSlug:    string;
  initialReels: Reel[];
  products:     Product[];
  monthlyUsed:  number;
  monthlyLimit: number;
}

function clThumb(url: string) {
  // Convert Cloudinary video URL to thumbnail
  return url.replace("/video/upload/", "/video/upload/so_0,f_jpg,w_480,h_854,c_fill/");
}

export default function ReelsClient({
  storeId, storeSlug, initialReels, products, monthlyUsed, monthlyLimit,
}: Props) {
  const [reels,    setReels]    = useState<Reel[]>(initialReels);
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [showUpload, setShowUpload] = useState(false);

  // Upload form state
  const [videoFile,    setVideoFile]    = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [title,        setTitle]        = useState("");
  const [description,  setDescription]  = useState("");
  const [selectedIds,  setSelectedIds]  = useState<string[]>([]);

  const fileRef = useRef<HTMLInputElement>(null);
  const used    = reels.filter(r => {
    const d = new Date(r.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // ── File selection ─────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(`Video must be under ${MAX_FILE_MB} MB`);
      return;
    }
    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file");
      return;
    }
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setShowUpload(true);
    e.target.value = "";
  }

  // ── Product toggle ─────────────────────────────────────────────
  function toggleProduct(id: string) {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : prev.length >= 5
          ? (toast.error("Max 5 products per reel"), prev)
          : [...prev, id]
    );
  }

  // ── Upload ─────────────────────────────────────────────────────
  const handleUpload = useCallback(async () => {
    if (!videoFile) return;
    if (monthlyUsed >= monthlyLimit) {
      toast.error(`Monthly limit reached (${monthlyLimit} reels/month)`);
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      // 1. Get signed params from our server
      const sigRes = await fetch("/api/reels/upload-signature");
      if (!sigRes.ok) throw new Error("Failed to get upload signature");
      const { signature, timestamp, folder, apiKey, cloudName } = await sigRes.json();

      // 2. Upload directly to Cloudinary
      const fd = new FormData();
      fd.append("file", videoFile);
      fd.append("api_key", apiKey);
      fd.append("timestamp", String(timestamp));
      fd.append("signature", signature);
      fd.append("folder", folder);

      const xhr = new XMLHttpRequest();
      const cloudRes = await new Promise<{ public_id: string; secure_url: string; duration: number }>((resolve, reject) => {
        xhr.upload.onprogress = e => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 85));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
          else reject(new Error(JSON.parse(xhr.responseText)?.error?.message ?? "Upload failed"));
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`);
        xhr.send(fd);
      });

      setProgress(90);

      // 3. Save to our DB
      const thumbUrl = cloudRes.secure_url.replace(
        "/video/upload/",
        "/video/upload/so_0,f_jpg,w_480,h_854,c_fill/"
      ).replace(/\.[^.]+$/, ".jpg");

      const saveRes = await fetch("/api/reels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cloudinaryPublicId: cloudRes.public_id,
          videoUrl:           cloudRes.secure_url,
          thumbnailUrl:       thumbUrl,
          durationSeconds:    Math.round(cloudRes.duration ?? 0),
          title:              title.trim() || null,
          description:        description.trim() || null,
          productIds:         selectedIds,
        }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error ?? "Failed to save reel");

      setProgress(100);
      toast.success("Reel uploaded!");

      // Optimistically add to list
      const newReel: Reel = {
        id: saveData.id,
        store_id: storeId,
        title: title.trim() || null,
        description: description.trim() || null,
        cloudinary_public_id: cloudRes.public_id,
        video_url: cloudRes.secure_url,
        thumbnail_url: thumbUrl,
        duration_seconds: Math.round(cloudRes.duration ?? 0),
        view_count: 0, share_count: 0,
        is_active: true, is_featured: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        products: products.filter(p => selectedIds.includes(p.id)).map(p => ({
          product_id: p.id, name: p.name, price: Number(p.price),
          image_url: p.image_url ?? null, slug: p.slug,
          stock_quantity: p.stock_quantity ?? 0,
        })),
      };
      setReels(prev => [newReel, ...prev]);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [videoFile, title, description, selectedIds, monthlyUsed, monthlyLimit, storeId, products]);

  function resetForm() {
    setVideoFile(null);
    setVideoPreview(null);
    setTitle("");
    setDescription("");
    setSelectedIds([]);
    setShowUpload(false);
  }

  // ── Delete ─────────────────────────────────────────────────────
  async function deleteReel(reelId: string) {
    if (!confirm("Delete this reel? This cannot be undone.")) return;
    const res = await fetch(`/api/reels/${reelId}`, { method: "DELETE" });
    if (res.ok) {
      setReels(prev => prev.filter(r => r.id !== reelId));
      toast.success("Reel deleted");
    } else {
      toast.error("Failed to delete");
    }
  }

  // ── Toggle active ──────────────────────────────────────────────
  async function toggleActive(reel: Reel) {
    const res = await fetch(`/api/reels/${reel.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !reel.is_active }),
    });
    if (res.ok) {
      setReels(prev => prev.map(r => r.id === reel.id ? { ...r, is_active: !r.is_active } : r));
    } else {
      toast.error("Failed to update");
    }
  }

  const remaining = monthlyLimit - monthlyUsed;
  const pct = Math.min(100, Math.round((monthlyUsed / monthlyLimit) * 100));

  return (
    <div className="max-w-4xl space-y-6">
      <Tip id="reels-guide" variant="tip">
        <strong>Shoppable Reels:</strong> Upload short vertical videos (max {MAX_FILE_MB} MB) and tag your products. Customers swipe through them on your store and can add to cart instantly. You have <strong>{remaining} reel{remaining !== 1 ? "s" : ""}</strong> left this month.
      </Tip>

      {/* Monthly usage bar */}
      <div className="rounded-2xl border border-surface-200 dark:border-surface-700 p-5 bg-white dark:bg-surface-900">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-semibold text-surface-700 dark:text-surface-300">Monthly uploads</p>
          <p className="text-sm text-surface-400">{monthlyUsed} / {monthlyLimit}</p>
        </div>
        <div className="h-2 rounded-full bg-surface-100 dark:bg-surface-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: pct >= 90 ? "#ef4444" : "var(--accent)" }}
          />
        </div>
        {pct >= 90 && (
          <p className="text-xs text-red-500 mt-1">Almost at your limit — contact support to increase your quota.</p>
        )}
      </div>

      {/* Upload trigger */}
      {!showUpload && (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={monthlyUsed >= monthlyLimit}
          className="w-full flex flex-col items-center gap-3 py-10 rounded-2xl border-2 border-dashed border-surface-300 dark:border-surface-600 hover:border-surface-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--accent)" }}>
            <Plus className="w-7 h-7 text-black" />
          </div>
          <div>
            <p className="font-semibold text-surface-700 dark:text-surface-300">Upload a Reel</p>
            <p className="text-xs text-surface-400 mt-0.5">MP4, MOV • Max {MAX_FILE_MB} MB • Vertical recommended</p>
          </div>
        </button>
      )}
      <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleFileChange} />

      {/* Upload form */}
      {showUpload && videoFile && (
        <div className="rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 dark:border-surface-800">
            <h3 className="font-bold text-surface-900 dark:text-white">New Reel</h3>
            <button onClick={resetForm} disabled={uploading} className="text-surface-400 hover:text-surface-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 grid sm:grid-cols-2 gap-6">
            {/* Video preview */}
            <div className="aspect-[9/16] bg-black rounded-xl overflow-hidden flex items-center justify-center">
              {videoPreview && (
                <video src={videoPreview} className="w-full h-full object-cover" controls muted playsInline />
              )}
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-surface-500 uppercase tracking-wide">Title (optional)</label>
                <input
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-sm text-surface-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="What's this reel about?"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-surface-500 uppercase tracking-wide">Description (optional)</label>
                <textarea
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-sm text-surface-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  rows={3}
                  placeholder="Add details, hashtags…"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  maxLength={500}
                />
              </div>

              {/* Product selection */}
              <div>
                <label className="text-xs font-semibold text-surface-500 uppercase tracking-wide flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" /> Tag Products (max 5)
                </label>
                <div className="mt-2 space-y-1 max-h-52 overflow-y-auto pr-1">
                  {products.map(p => {
                    const sel = selectedIds.includes(p.id);
                    return (
                      <label key={p.id}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                          sel ? "bg-amber-50 dark:bg-amber-900/20" : "hover:bg-surface-50 dark:hover:bg-surface-800"
                        }`}
                      >
                        <input type="checkbox" className="hidden" checked={sel} onChange={() => toggleProduct(p.id)} />
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                          sel ? "border-amber-400 bg-amber-400" : "border-surface-300 dark:border-surface-600"
                        }`}>
                          {sel && <Star className="w-3 h-3 text-black fill-black" />}
                        </div>
                        {p.image_url && (
                          <img src={p.image_url} alt={p.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-surface-900 dark:text-white truncate">{p.name}</p>
                          <p className="text-xs text-surface-400">₦{Number(p.price).toLocaleString()}</p>
                        </div>
                      </label>
                    );
                  })}
                  {products.length === 0 && (
                    <p className="text-xs text-surface-400 py-4 text-center">No products yet. Add products first.</p>
                  )}
                </div>
              </div>

              {/* Upload progress */}
              {uploading && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-surface-400">
                    <span>Uploading…</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-100 dark:bg-surface-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${progress}%`, background: "var(--accent)" }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-black transition-all disabled:opacity-60 hover:opacity-90"
                style={{ background: "var(--accent)" }}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? "Uploading…" : "Publish Reel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reels grid */}
      {reels.length === 0 ? (
        <div className="py-20 text-center">
          <Film className="w-12 h-12 text-surface-300 mx-auto mb-4" />
          <p className="font-semibold text-surface-700 dark:text-surface-300 mb-1">No reels yet</p>
          <p className="text-sm text-surface-400">Upload your first reel to start attracting customers.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {reels.map(reel => (
            <div key={reel.id} className="relative group rounded-2xl overflow-hidden bg-black aspect-[9/16]">
              {reel.thumbnail_url ? (
                <img src={reel.thumbnail_url} alt={reel.title ?? "Reel"} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Film className="w-8 h-8 text-surface-600" />
                </div>
              )}

              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                <div className="flex justify-end">
                  <button
                    onClick={() => deleteReel(reel.id)}
                    className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-2">
                  {reel.title && (
                    <p className="text-xs font-semibold text-white truncate">{reel.title}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-white/80">
                      <Eye className="w-3 h-3" /> {reel.view_count.toLocaleString()}
                    </span>
                    {(reel.products?.length ?? 0) > 0 && (
                      <span className="flex items-center gap-1 text-xs text-white/80">
                        <Package className="w-3 h-3" /> {reel.products!.length}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => toggleActive(reel)}
                    className={`text-xs px-2 py-1 rounded-full font-semibold ${
                      reel.is_active
                        ? "bg-green-500 text-white"
                        : "bg-surface-600 text-white"
                    }`}
                  >
                    {reel.is_active ? "Live" : "Hidden"}
                  </button>
                </div>
              </div>

              {/* Featured badge */}
              {reel.is_featured && (
                <div className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full font-bold text-black" style={{ background: "var(--accent)" }}>
                  ★ Featured
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
