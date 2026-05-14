"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ShoppingCart, Check, Minus, Plus, Share2, Star, Loader2, Send } from "lucide-react";
import { useCart } from "@/components/storefront/CartProvider";
import ProductCard from "@/components/storefront/ProductCard";
import { formatCurrency, getProductUrl, waLink } from "@/lib/utils";
import type { Product, Store } from "@/types";

interface Props {
  product: Product & { category_name?: string; category_slug?: string };
  related: Product[];
  store: Store;
  storeSlug: string;
}

interface Review {
  id: string;
  customer_name: string;
  rating: number;
  body: string | null;
  created_at: string;
}

function StarDisplay({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cls}
          style={{
            fill: i < rating ? "#f59e0b" : "transparent",
            stroke: i < rating ? "#f59e0b" : "#d1d5db",
          }}
        />
      ))}
    </div>
  );
}

function StarSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="p-0.5 transition-transform hover:scale-110"
          aria-label={`Rate ${star} stars`}
        >
          <Star
            className="w-6 h-6"
            style={{
              fill: star <= (hovered || value) ? "#f59e0b" : "transparent",
              stroke: star <= (hovered || value) ? "#f59e0b" : "#9ca3af",
            }}
          />
        </button>
      ))}
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ProductDetailClient({ product, related, store, storeSlug }: Props) {
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    customer_name: "",
    customer_email: "",
    rating: 0,
    body: "",
  });

  const images = product.images?.length ? product.images
    : product.image_url ? [product.image_url]
    : product.imageUrl ? [product.imageUrl]
    : [];

  const stockQty = product.stock_quantity ?? product.stockQuantity ?? 0;
  const comparePrice = product.compare_price ?? product.comparePrice;
  const hasDiscount = comparePrice && comparePrice > product.price;
  const discountPct = hasDiscount ? Math.round((1 - product.price / comparePrice!) * 100) : 0;

  useEffect(() => {
    async function fetchReviews() {
      setReviewsLoading(true);
      try {
        const res = await fetch(
          `/api/storefront/${storeSlug}/reviews?product_id=${product.id}`
        );
        if (res.ok) {
          const data = await res.json();
          setReviews(data.data ?? []);
          setAvgRating(data.avg_rating ?? 0);
          setReviewTotal(data.total ?? 0);
        }
      } catch {
        // silently fail
      } finally {
        setReviewsLoading(false);
      }
    }
    fetchReviews();
  }, [product.id, storeSlug]);

  function handleAdd() {
    for (let i = 0; i < qty; i++) {
      addItem({
        product_id: product.id,
        name: product.name,
        price: product.price,
        image_url: images[0],
        stock_quantity: stockQty,
        quantity: 1,
      });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  function handleShare() {
    if (navigator.share) navigator.share({ title: product.name, url: window.location.href });
    else navigator.clipboard.writeText(window.location.href);
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewForm.customer_name || reviewForm.rating === 0) {
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/storefront/${storeSlug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: product.id,
          customer_name: reviewForm.customer_name,
          customer_email: reviewForm.customer_email || undefined,
          rating: reviewForm.rating,
          body: reviewForm.body || undefined,
        }),
      });
      if (res.ok) {
        setReviewSubmitted(true);
        setShowReviewForm(false);
        setReviewForm({ customer_name: "", customer_email: "", rating: 0, body: "" });
      }
    } catch {
      // silently fail
    } finally {
      setSubmittingReview(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm text-surface-400">
        <Link href={`/store/${storeSlug}`}
          className="flex items-center gap-1 hover:text-surface-900 dark:hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />Back to shop
        </Link>
        {product.category_name && (
          <>
            <span>/</span>
            <Link href={`/store/${storeSlug}?category=${product.category_slug}`}
              className="hover:text-surface-900 dark:hover:text-white transition-colors">
              {product.category_name}
            </Link>
          </>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Images */}
        <div className="space-y-3">
          <div className="aspect-square rounded-2xl overflow-hidden bg-surface-50 dark:bg-surface-900 border border-surface-100 dark:border-surface-800">
            {images.length > 0 ? (
              <img src={images[activeImg]} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl text-surface-200">🛍️</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)}
                  className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                    i === activeImg ? "border-[var(--sf-accent)]" : "border-surface-200 dark:border-surface-700"
                  }`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-5">
          <div>
            {product.category_name && (
              <span className="text-xs font-semibold uppercase tracking-wide text-surface-400 mb-2 block">
                {product.category_name}
              </span>
            )}
            <h1 className="text-2xl sm:text-3xl font-black text-surface-900 dark:text-white leading-tight mb-3">
              {product.name}
            </h1>

            {/* Rating summary inline */}
            {reviewTotal > 0 && (
              <div className="flex items-center gap-2 mb-3">
                <StarDisplay rating={Math.round(avgRating)} size="sm" />
                <span className="text-sm text-surface-500 dark:text-surface-400">
                  {avgRating.toFixed(1)} · {reviewTotal} review{reviewTotal !== 1 ? "s" : ""}
                </span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <span className="text-3xl font-black text-surface-900 dark:text-white">
                {formatCurrency(product.price)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-lg text-surface-400 line-through">
                    {formatCurrency(comparePrice!)}
                  </span>
                  <span className="text-sm font-bold px-2 py-0.5 rounded-full text-black"
                    style={{ backgroundColor: "var(--sf-accent)" }}>
                    -{discountPct}% OFF
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Stock badge */}
          {stockQty > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              In stock ({stockQty} available)
            </span>
          ) : (
            <span className="text-sm text-red-500 font-medium">Out of stock</span>
          )}

          {product.description && (
            <p className="text-sm text-surface-600 dark:text-surface-300 whitespace-pre-wrap leading-relaxed">
              {product.description}
            </p>
          )}

          {/* Qty + Add to cart */}
          {stockQty > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-surface-600 dark:text-surface-400">Quantity</span>
                <div className="flex items-center gap-3 bg-surface-50 dark:bg-surface-800 rounded-xl p-1">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-surface-600 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-6 text-center font-bold text-surface-900 dark:text-white">{qty}</span>
                  <button onClick={() => setQty((q) => Math.min(stockQty, q + 1))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-surface-600 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleAdd}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all ${
                    added ? "bg-green-500 text-white" : "hover:opacity-90"
                  }`}
                  style={added ? {} : { backgroundColor: "var(--sf-accent)", color: "#000" }}>
                  {added ? <><Check className="w-4 h-4" />Added!</> : <><ShoppingCart className="w-4 h-4" />Add to cart</>}
                </button>
                <button onClick={handleShare}
                  className="p-3.5 rounded-xl border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors">
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* WhatsApp order CTA */}
          {(store.whatsapp ?? (store as unknown as Record<string, unknown>).whatsapp as string) && (() => {
            const wa = (store.whatsapp ?? (store as unknown as Record<string, unknown>).whatsapp) as string;
            const productUrl = getProductUrl(storeSlug, product.slug);
            const storeName = store.name;
            const lineTotal = formatCurrency(product.price * qty);
            const blurb = (product.shortDescription ?? product.short_description ?? product.description ?? '').slice(0, 120);

            const msg = [
              `Hello! I'd like to order from *${storeName}* 🛍️`,
              ``,
              `*${product.name}*`,
              `📦 Quantity: ${qty}`,
              `💰 Price: ${formatCurrency(product.price)} each`,
              `💳 Total: ${lineTotal}`,
              blurb ? `📝 ${blurb}${blurb.length === 120 ? '…' : ''}` : '',
              ``,
              `🔗 Product link: ${productUrl}`,
              ``,
              `Please confirm availability and send payment details. Thank you! 🙏`,
            ].filter(l => l !== null).join('\n');

            return (
              <a
                href={waLink(wa, msg)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-sm transition-all hover:opacity-90 hover:scale-[1.01]"
                style={{ background: '#25D366', color: '#fff' }}
              >
                <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.553 4.122 1.52 5.862L.057 23.743l5.994-1.573A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.89 0-3.652-.522-5.157-1.43l-.37-.22-3.56.933.951-3.473-.241-.381A9.963 9.963 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                </svg>
                Order on WhatsApp — {formatCurrency(product.price * qty)}
              </a>
            );
          })()}
        </div>
      </div>

      {/* ── Reviews section ── */}
      <div className="mt-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-surface-900 dark:text-white flex items-center gap-2">
              <Star className="w-5 h-5" />
              Customer reviews
              {reviewTotal > 0 && (
                <span className="text-sm font-normal text-surface-400">
                  — ★ {avgRating.toFixed(1)} ({reviewTotal})
                </span>
              )}
            </h2>
          </div>
          {!showReviewForm && !reviewSubmitted && (
            <button
              onClick={() => setShowReviewForm(true)}
              className="text-sm font-semibold px-4 py-2 rounded-xl border-2 transition-all hover:opacity-80"
              style={{ borderColor: "var(--sf-accent)", color: "var(--sf-accent)" }}
            >
              Write a review
            </button>
          )}
        </div>

        {/* Review submitted message */}
        {reviewSubmitted && (
          <div className="mb-6 p-4 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm font-medium flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            Thanks! Your review is pending approval and will appear once the store owner approves it.
          </div>
        )}

        {/* Write review form */}
        {showReviewForm && (
          <div className="mb-8 bg-surface-50 dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-6">
            <h3 className="font-bold text-surface-900 dark:text-white mb-4">Write a review</h3>
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                    Your name <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={reviewForm.customer_name}
                    onChange={(e) => setReviewForm((f) => ({ ...f, customer_name: e.target.value }))}
                    required
                    placeholder="e.g. Jane Doe"
                    className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-[var(--sf-accent)] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                    Email (optional)
                  </label>
                  <input
                    value={reviewForm.customer_email}
                    onChange={(e) => setReviewForm((f) => ({ ...f, customer_email: e.target.value }))}
                    type="email"
                    placeholder="jane@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-[var(--sf-accent)] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Rating <span className="text-red-500">*</span>
                </label>
                <StarSelector
                  value={reviewForm.rating}
                  onChange={(v) => setReviewForm((f) => ({ ...f, rating: v }))}
                />
                {reviewForm.rating > 0 && (
                  <p className="text-xs text-surface-400 mt-1">
                    {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][reviewForm.rating]}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                  Your review (optional)
                </label>
                <textarea
                  value={reviewForm.body}
                  onChange={(e) => setReviewForm((f) => ({ ...f, body: e.target.value }))}
                  rows={3}
                  maxLength={1000}
                  placeholder="Share your experience with this product..."
                  className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-[var(--sf-accent)] text-sm resize-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={submittingReview || !reviewForm.customer_name || reviewForm.rating === 0}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-black transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "var(--sf-accent)" }}
                >
                  {submittingReview ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Submit review
                </button>
                <button
                  type="button"
                  onClick={() => setShowReviewForm(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Reviews list */}
        {reviewsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-surface-400" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-10 text-surface-400">
            <Star className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No reviews yet. Be the first to review this product!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="bg-surface-50 dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <span className="font-bold text-surface-900 dark:text-white text-sm">
                      {review.customer_name}
                    </span>
                    <span className="text-xs text-surface-400 ml-2">{formatDate(review.created_at)}</span>
                  </div>
                  <StarDisplay rating={review.rating} size="sm" />
                </div>
                {review.body && (
                  <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
                    {review.body}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <div className="mt-16">
          <h2 className="text-xl font-bold text-surface-900 dark:text-white mb-6">You might also like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {related.map((p) => <ProductCard key={p.id} product={p} storeSlug={storeSlug} />)}
          </div>
        </div>
      )}
    </div>
  );
}
