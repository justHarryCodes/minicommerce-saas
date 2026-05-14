"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Star, Trash2, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface Review {
  id: string;
  customer_name: string;
  customer_email: string | null;
  rating: number;
  body: string | null;
  is_approved: boolean;
  created_at: string;
  product_name: string;
  product_slug: string;
}

interface Props {
  initialReviews: Review[];
}

function StarRow({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ReviewsClient({ initialReviews }: Props) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [tab, setTab] = useState<"pending" | "approved">("pending");
  const [actingId, setActingId] = useState<string | null>(null);

  const pending = reviews.filter((r) => !r.is_approved);
  const approved = reviews.filter((r) => r.is_approved);
  const displayed = tab === "pending" ? pending : approved;

  async function handleApprove(review: Review) {
    setActingId(review.id);
    const newApproved = !review.is_approved;
    try {
      const res = await fetch(`/api/dashboard/reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_approved: newApproved }),
      });
      if (!res.ok) throw new Error("Failed to update review");
      setReviews((prev) =>
        prev.map((r) => (r.id === review.id ? { ...r, is_approved: newApproved } : r))
      );
      toast.success(newApproved ? "Review approved and published" : "Review unpublished");
    } catch {
      toast.error("Failed to update review");
    } finally {
      setActingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this review permanently?")) return;
    setActingId(id);
    try {
      const res = await fetch(`/api/dashboard/reviews/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete review");
      setReviews((prev) => prev.filter((r) => r.id !== id));
      toast.success("Review deleted");
    } catch {
      toast.error("Failed to delete review");
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-surface-900 dark:text-white flex items-center gap-2">
          <Star className="w-6 h-6" />
          Reviews
        </h1>
        <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
          Moderate customer reviews before they appear on your storefront
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-100 dark:bg-surface-800 p-1 rounded-xl w-fit">
        {(["pending", "approved"] as const).map((t) => {
          const count = t === "pending" ? pending.length : approved.length;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
                tab === t
                  ? "bg-white dark:bg-surface-900 text-surface-900 dark:text-white shadow-sm"
                  : "text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200"
              }`}
            >
              {t}
              <span
                className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                  tab === t
                    ? "bg-accent-400 text-black"
                    : "bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-400"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Reviews list */}
      {displayed.length === 0 ? (
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-16 text-center">
          <Star className="w-10 h-10 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
          <p className="font-semibold text-surface-900 dark:text-white mb-1">
            No {tab} reviews
          </p>
          <p className="text-sm text-surface-400">
            {tab === "pending"
              ? "All reviews have been moderated."
              : "No approved reviews yet. Approve some pending reviews to publish them."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((review) => (
            <div
              key={review.id}
              className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Product link */}
                  <Link
                    href={`/dashboard/products`}
                    className="text-xs font-semibold text-accent-600 dark:text-accent-400 hover:underline uppercase tracking-wide"
                  >
                    {review.product_name}
                  </Link>

                  {/* Customer info + rating */}
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="font-bold text-surface-900 dark:text-white text-sm">
                      {review.customer_name}
                    </span>
                    {review.customer_email && (
                      <span className="text-xs text-surface-400">{review.customer_email}</span>
                    )}
                    <StarRow rating={review.rating} />
                    <span className="text-xs text-surface-400">{formatDate(review.created_at)}</span>
                  </div>

                  {/* Body */}
                  {review.body && (
                    <p className="mt-2 text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
                      {review.body}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleApprove(review)}
                    disabled={actingId === review.id}
                    title={review.is_approved ? "Unapprove (hide from storefront)" : "Approve (publish to storefront)"}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 ${
                      review.is_approved
                        ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                        : "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                    }`}
                  >
                    {actingId === review.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : review.is_approved ? (
                      <XCircle className="w-3.5 h-3.5" />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5" />
                    )}
                    {review.is_approved ? "Unapprove" : "Approve"}
                  </button>

                  <button
                    onClick={() => handleDelete(review.id)}
                    disabled={actingId === review.id}
                    title="Delete review"
                    className="p-2 rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                  >
                    {actingId === review.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
