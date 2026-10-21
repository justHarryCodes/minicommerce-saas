"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Check,
  Minus,
  Plus,
  Share2,
  Star,
  Loader2,
  Send,
  X,
  Store as StoreIcon,
  Maximize2,
  Truck,
} from "lucide-react";
import { useCart } from "@/components/storefront/CartProvider";
import ProductCard from "@/components/storefront/ProductCard";
import { useStore } from "@/lib/store-context";
import { clLogo } from "@/lib/cloudinary";
import { formatCurrency, getProductUrl, waLink } from "@/lib/utils";
import type { Product, Store } from "@/types";
import { optionNamesOf, optionsOf } from "@/lib/variants";
import { lagosParts } from "@/lib/hours";
import { formatAppointment } from "@/lib/booking";
import { parseSizeGuide } from "@/lib/size-guide";
import BookingPicker, { type BookingSelection } from "@/components/storefront/BookingPicker";
import SizeGuideButton from "@/components/storefront/SizeGuideButton";
import BackInStockForm from "@/components/storefront/BackInStockForm";

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

function StarDisplay({
  rating,
  size = "sm",
}: {
  rating: number;
  size?: "sm" | "md" | "lg";
}) {
  const cls =
    size === "sm" ? "w-3.5 h-3.5" : size === "md" ? "w-4 h-4" : "w-5 h-5";
  return (
    <div
      className="flex items-center gap-0.5"
      aria-label={`${rating} out of 5 stars`}
    >
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

function StarSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
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
            className="w-8 h-8"
            style={{
              fill: star <= (hovered || value) ? "#f59e0b" : "transparent",
              stroke: star <= (hovered || value) ? "#f59e0b" : "#d1d5db",
            }}
          />
        </button>
      ))}
    </div>
  );
}

const RATING_LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ProductDetailClient({
  product,
  related,
  store,
  storeSlug,
}: Props) {
  const { addItem } = useCart();
  const { storeBase } = useStore();
  const homeHref = storeBase || "/";

  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  // Variants: one picker per option (legacy size-only products → "Size").
  // Once every option is chosen, the matching variant's label becomes
  // `selectedSize` — the key the cart and order API already understand.
  const rawOptionNames = product.option_names ?? product.optionNames;
  const optionNames = optionNamesOf(rawOptionNames);
  const sizes = (product.sizes ?? []).map((s) => ({
    label: s.label,
    stockQuantity: s.stockQuantity ?? s.stock_quantity ?? 0,
    options: optionsOf(rawOptionNames, s),
    price: s.price != null ? Number(s.price) : null,
    imageUrl: s.imageUrl ?? s.image_url ?? null,
  }));
  const hasSizes = sizes.length > 0;
  const [picked, setPicked] = useState<Record<string, string>>({});
  const selectedVariant = hasSizes && optionNames.every((n) => picked[n])
    ? sizes.find((s) => optionNames.every((n) => s.options[n] === picked[n])) ?? null
    : null;
  const selectedSize = selectedVariant?.label ?? null;
  // Values of one option still available given the other picks
  const valuesFor = (name: string) =>
    Array.from(new Set(sizes.map((s) => s.options[name]).filter(Boolean))) as string[];
  const availableWith = (name: string, value: string) =>
    sizes.some(
      (s) =>
        s.options[name] === value &&
        s.stockQuantity > 0 &&
        optionNames.every((n) => n === name || !picked[n] || s.options[n] === picked[n]),
    );
  const unitPrice = selectedVariant?.price ?? product.price;
  const priceRange = useMemo(() => {
    const prices = sizes.map((s) => s.price ?? product.price);
    return prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null;
  }, [sizes, product.price]);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewForm, setReviewForm] = useState({
    customer_name: "",
    customer_email: "",
    rating: 0,
    body: "",
  });

  const images = product.images?.length
    ? product.images
    : product.image_url
      ? [product.image_url]
      : product.imageUrl
        ? [product.imageUrl]
        : [];

  const stockQty = product.stock_quantity ?? product.stockQuantity ?? 0;
  const selectedSizeStock = selectedSize
    ? (sizes.find((s) => s.label === selectedSize)?.stockQuantity ?? 0)
    : 0;
  // Without sizes, the plain product stock governs everything below (add to
  // cart, qty stepper). With sizes, nothing is purchasable until a size with
  // stock is chosen.
  // Services: booked by time, never "out of stock"; food: can be sold out for today
  const isBookable = Boolean(product.is_bookable);
  const sizeGuide = parseSizeGuide(product.size_guide);
  const soldOutToday = !!product.sold_out_until && String(product.sold_out_until).slice(0, 10) >= lagosParts(new Date()).date;
  const [booking, setBooking] = useState<BookingSelection | null>(null);
  const effectiveStock = isBookable ? 1 : hasSizes ? selectedSizeStock : stockQty;
  const comparePrice = product.compare_price ?? product.comparePrice;
  const hasDiscount = !!comparePrice && comparePrice > unitPrice;
  const discountPct = hasDiscount
    ? Math.round((1 - unitPrice / comparePrice!) * 100)
    : 0;
  const savings = hasDiscount ? comparePrice! - unitPrice : 0;
  const needsSize = (hasSizes && !selectedSize) || (isBookable && !booking);
  const inStock = isBookable || (stockQty > 0 && !soldOutToday);

  const distribution = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    reviews.forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) counts[r.rating - 1]++;
    });
    return counts;
  }, [reviews]);

  useEffect(() => {
    async function fetchReviews() {
      setReviewsLoading(true);
      try {
        const res = await fetch(
          `/api/storefront/${storeSlug}/reviews?product_id=${product.id}`,
        );
        if (res.ok) {
          const data = await res.json();
          setReviews(data.data ?? []);
          setAvgRating(data.avg_rating ?? 0);
          setReviewTotal(data.total ?? 0);
        }
      } catch {
        /* silent */
      } finally {
        setReviewsLoading(false);
      }
    }
    fetchReviews();
  }, [product.id, storeSlug]);

  // Reset quantity whenever the selected size changes.
  useEffect(() => {
    setQty(1);
  }, [selectedSize]);

  // Lightbox: Escape / arrow keys + body scroll lock
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowRight") setActiveImg((i) => (i + 1) % images.length);
      if (e.key === "ArrowLeft")
        setActiveImg((i) => (i - 1 + images.length) % images.length);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, images.length]);

  function handleAdd() {
    if (needsSize || !inStock) return;
    if (isBookable && booking) {
      addItem({
        product_id: product.id,
        name: product.name,
        price: unitPrice,
        image_url: images[0],
        stock_quantity: 1,
        quantity: 1,
        booking: { startsAt: booking.startsAt, staffId: booking.staffId, staffName: booking.staffName },
      });
      setBooking(null);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
      return;
    }
    for (let i = 0; i < qty; i++) {
      addItem({
        product_id: product.id,
        name: product.name,
        price: unitPrice,
        image_url: selectedVariant?.imageUrl ?? images[0],
        stock_quantity: effectiveStock,
        quantity: 1,
        size: hasSizes ? selectedSize : undefined,
      });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: product.name,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      /* user cancelled */
    }
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewForm.customer_name || reviewForm.rating === 0) return;
    setSubmittingReview(true);
    setReviewError("");
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
        setReviewForm({
          customer_name: "",
          customer_email: "",
          rating: 0,
          body: "",
        });
      } else {
        setReviewError("We couldn't submit your review. Please try again.");
      }
    } catch {
      setReviewError("Network error. Please try again.");
    } finally {
      setSubmittingReview(false);
    }
  }

  const waNumber = store.whatsapp as string | undefined;
  const lineTotal = formatCurrency(unitPrice * qty);

  const addLabel = soldOutToday
    ? "Sold out today"
    : !inStock
    ? "Out of stock"
    : isBookable
      ? added
        ? "Booked — added to cart"
        : booking
          ? `Book ${formatAppointment(booking.startsAt)}`
          : "Choose a time"
    : needsSize
      ? `Select ${optionNames.length > 1 ? "options" : optionNames[0].toLowerCase()}`
      : added
        ? "Added to cart"
        : "Add to cart";

  const stockNote =
    !inStock || (hasSizes && selectedSize && selectedSizeStock <= 0)
      ? null
      : effectiveStock > 0 && effectiveStock <= 10
        ? `Only ${effectiveStock} left`
        : null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-5 pb-28 md:pb-16">
      {/* ── Breadcrumb ── */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-xs text-surface-400 mb-5 overflow-x-auto whitespace-nowrap"
        style={{ scrollbarWidth: "none" }}
      >
        <Link
          href={homeHref}
          className="hover:text-surface-900 dark:hover:text-white transition-colors flex items-center gap-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          {store.name}
        </Link>
        {product.category_name && (
          <>
            <ChevronRight className="w-3 h-3 opacity-40 shrink-0" />
            <Link
              href={`${homeHref}?category=${product.category_slug}`}
              className="hover:text-surface-900 dark:hover:text-white transition-colors"
            >
              {product.category_name}
            </Link>
          </>
        )}
        <ChevronRight className="w-3 h-3 opacity-40 shrink-0" />
        <span className="text-surface-600 dark:text-surface-300 truncate max-w-[180px]">
          {product.name}
        </span>
      </nav>

      <div className="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-6 lg:gap-10 items-start">
        {/* ═════════════ GALLERY ═════════════ */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row lg:sticky lg:top-24">
          {/* Thumbnails: vertical on sm+, horizontal on mobile */}
          {images.length > 1 && (
            <div
              className="flex gap-2 overflow-x-auto sm:flex-col sm:overflow-y-auto sm:overflow-x-visible sm:max-h-[520px] sm:w-[72px] shrink-0"
              style={{ scrollbarWidth: "none" }}
            >
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  aria-label={`View image ${i + 1}`}
                  className={`relative shrink-0 w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-xl overflow-hidden border-2 transition-all duration-150 ${
                    i === activeImg
                      ? "border-[var(--sf-accent)] shadow-md"
                      : "border-surface-200 dark:border-surface-700 opacity-70 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={img}
                    alt=""
                    fill
                    sizes="72px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Main image */}
          <div className="relative flex-1 aspect-square rounded-2xl overflow-hidden bg-surface-50 dark:bg-surface-900 border border-surface-100 dark:border-surface-800 group">
            {images.length > 0 ? (
              <button
                type="button"
                onClick={() => setLightbox(true)}
                aria-label="Open image full screen"
                className="absolute inset-0 cursor-zoom-in"
              >
                <Image
                  key={activeImg}
                  src={images[activeImg]}
                  alt={product.name}
                  fill
                  sizes="(min-width: 1024px) 45vw, 100vw"
                  priority
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </button>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl text-surface-200">
                🛍️
              </div>
            )}

            {hasDiscount && (
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-black bg-red-500 text-white shadow">
                -{discountPct}%
              </span>
            )}

            {images.length > 0 && (
              <span className="pointer-events-none absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-surface-700 shadow opacity-0 transition-opacity group-hover:opacity-100">
                <Maximize2 className="w-4 h-4" />
              </span>
            )}

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setActiveImg((i) => (i - 1 + images.length) % images.length)
                  }
                  aria-label="Previous image"
                  className="absolute left-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-surface-800 shadow hover:bg-white sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveImg((i) => (i + 1) % images.length)}
                  aria-label="Next image"
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-surface-800 shadow hover:bg-white sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white">
                  {activeImg + 1} / {images.length}
                </span>
              </>
            )}
          </div>
        </div>

        {/* ═════════════ BUY BOX ═════════════ */}
        <div className="flex flex-col gap-5">
          <div>
            {product.category_name && (
              <Link
                href={`${homeHref}?category=${product.category_slug}`}
                className="text-[11px] font-bold uppercase tracking-widest mb-2 inline-block hover:underline"
                style={{ color: "var(--sf-accent)" }}
              >
                {product.category_name}
              </Link>
            )}
            <h1 className="text-2xl sm:text-3xl font-black text-surface-900 dark:text-white leading-tight">
              {product.name}
            </h1>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5">
              {reviewTotal > 0 ? (
                <a
                  href="#reviews"
                  className="flex items-center gap-2 hover:underline"
                >
                  <StarDisplay rating={Math.round(avgRating)} size="sm" />
                  <span className="text-xs text-surface-500 dark:text-surface-400">
                    {avgRating.toFixed(1)} ({reviewTotal} review
                    {reviewTotal !== 1 ? "s" : ""})
                  </span>
                </a>
              ) : (
                <a
                  href="#reviews"
                  className="text-xs text-surface-400 hover:underline"
                >
                  No reviews yet
                </a>
              )}
              <span className="text-surface-200 dark:text-surface-700">|</span>
              <Link
                href={homeHref}
                className="text-xs font-semibold text-surface-500 dark:text-surface-400 hover:underline"
              >
                More from {store.name}
              </Link>
            </div>
          </div>

          {/* Price block */}
          <div className="rounded-2xl bg-surface-50 dark:bg-surface-900 border border-surface-100 dark:border-surface-800 p-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-3xl sm:text-4xl font-black text-surface-900 dark:text-white">
                {!selectedVariant && priceRange && priceRange.min !== priceRange.max
                  ? `${formatCurrency(priceRange.min)} – ${formatCurrency(priceRange.max)}`
                  : formatCurrency(unitPrice)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-base text-surface-400 line-through">
                    {formatCurrency(comparePrice!)}
                  </span>
                  <span className="rounded-md bg-red-50 dark:bg-red-950/30 px-2 py-0.5 text-xs font-bold text-red-600 dark:text-red-400">
                    -{discountPct}%
                  </span>
                </>
              )}
            </div>
            {hasDiscount && (
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                You save {formatCurrency(savings)}
              </p>
            )}

            <div className="mt-3 flex items-center gap-2 text-sm font-medium">
              <span
                className={`w-2 h-2 rounded-full ${inStock ? "bg-emerald-500" : "bg-red-400"}`}
              />
              {inStock ? (
                <span className="text-emerald-600 dark:text-emerald-400">
                  In stock{stockNote ? ` · ${stockNote}` : ""}
                </span>
              ) : (
                <span className="text-red-500">Out of stock</span>
              )}
            </div>

            {store.delivery_time_frame && (
              <div className="mt-2 flex items-center gap-2 text-sm text-surface-600 dark:text-surface-300">
                <Truck className="w-4 h-4 shrink-0 text-surface-400" />
                <span>
                  Delivery: <span className="font-semibold text-surface-900 dark:text-white">{store.delivery_time_frame}</span>
                </span>
              </div>
            )}
          </div>

          {/* Services: pick a date + time instead of a quantity */}
          {isBookable && (
            <BookingPicker
              storeSlug={storeSlug}
              productId={product.id}
              durationMinutes={product.duration_minutes ?? null}
              value={booking}
              onChange={setBooking}
            />
          )}

          {soldOutToday && (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              Sold out for today — check back tomorrow.
            </p>
          )}

          {sizeGuide && !isBookable && (
            <div className="-mb-2 flex justify-end">
              <SizeGuideButton guide={sizeGuide} productName={product.name} />
            </div>
          )}

          {/* Variant pickers — one row per option (Size, Colour, …) */}
          {hasSizes && (
            <div className="space-y-4">
              {optionNames.map((name) => (
                <div key={name}>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-sm font-bold text-surface-900 dark:text-white">
                      {name}
                      {picked[name] ? (
                        <span className="font-medium text-surface-500">: {picked[name]}</span>
                      ) : (
                        ""
                      )}
                    </span>
                    {!picked[name] && inStock && (
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        Please choose a {name.toLowerCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {valuesFor(name).map((value) => {
                      const unavailable = !availableWith(name, value);
                      const active = picked[name] === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          disabled={unavailable}
                          aria-pressed={active}
                          onClick={() =>
                            setPicked((p) => {
                              const next = { ...p, [name]: value };
                              // Drop picks that no longer form an in-stock combination
                              for (const other of optionNames) {
                                if (other === name || !next[other]) continue;
                                const ok = sizes.some(
                                  (s) => s.stockQuantity > 0 && optionNames.every((n) => !next[n] || s.options[n] === next[n]),
                                );
                                if (!ok) delete next[other];
                              }
                              return next;
                            })
                          }
                          className={`min-w-[3rem] px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                            unavailable
                              ? "border-surface-100 dark:border-surface-800 text-surface-300 dark:text-surface-700 line-through cursor-not-allowed"
                              : active
                                ? "text-[color:var(--sf-on-accent)]"
                                : "border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:border-surface-400"
                          }`}
                          style={
                            active && !unavailable
                              ? { backgroundColor: "var(--sf-accent)", borderColor: "var(--sf-accent)" }
                              : undefined
                          }
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Back-in-stock sign-up: whole product sold out, or some variants are */}
          {!isBookable && !soldOutToday && (!inStock || (hasSizes && sizes.some((s) => s.stockQuantity <= 0))) && (
            <BackInStockForm
              storeSlug={storeSlug}
              productId={product.id}
              variantLabel={null}
              prompt={inStock ? "Your option sold out? Get a text when it's back" : undefined}
            />
          )}

          {/* Qty + actions (desktop/tablet; mobile uses sticky bar for the add button) */}
          {inStock && (
            <div className="space-y-3">
              {!isBookable && (<div className="flex items-center gap-4">
                <span className="text-sm font-bold text-surface-900 dark:text-white">
                  Quantity
                </span>
                <div className="flex items-center gap-1 bg-surface-100 dark:bg-surface-800 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={needsSize || qty <= 1}
                    aria-label="Decrease quantity"
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-surface-700 dark:text-surface-300 hover:bg-white dark:hover:bg-surface-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-10 text-center font-black text-surface-900 dark:text-white text-sm">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setQty((q) => Math.min(effectiveStock, q + 1))
                    }
                    disabled={needsSize || qty >= effectiveStock}
                    aria-label="Increase quantity"
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-surface-700 dark:text-surface-300 hover:bg-white dark:hover:bg-surface-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {qty > 1 && (
                  <span className="text-sm text-surface-400">
                    = {lineTotal}
                  </span>
                )}
              </div>)}

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={needsSize}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm transition-all active:scale-[0.98] shadow-[0_6px_18px_rgba(0,0,0,0.14)] disabled:opacity-50 disabled:cursor-not-allowed ${
                    added ? "bg-emerald-500 text-white" : "hover:opacity-90"
                  }`}
                  style={
                    added
                      ? {}
                      : { backgroundColor: "var(--sf-accent)", color: "var(--sf-on-accent)" }
                  }
                >
                  {added ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <ShoppingCart className="w-4 h-4" />
                  )}
                  {addLabel}
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="px-4 rounded-xl border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors flex items-center gap-2 text-sm font-semibold"
                  aria-label="Share product"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Share2 className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">
                    {copied ? "Copied" : "Share"}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* WhatsApp CTA */}
          {waNumber &&
            (() => {
              const productUrl = getProductUrl(storeSlug, product.slug);
              const blurb = (
                product.shortDescription ??
                product.short_description ??
                product.description ??
                ""
              ).slice(0, 120);
              const msg = [
                `Hello! I'd like to order from *${store.name}* 🛍️`,
                ``,
                `*${product.name}*`,
                selectedSize ? `📏 ${optionNames.length > 1 ? "Options" : optionNames[0]}: ${selectedSize}` : "",
                `📦 Quantity: ${qty}`,
                `💰 Price: ${formatCurrency(unitPrice)} each`,
                `💳 Total: ${lineTotal}`,
                blurb ? `📝 ${blurb}${blurb.length === 120 ? "…" : ""}` : "",
                ``,
                `🔗 Product: ${productUrl}`,
                ``,
                `Please confirm availability and send payment details. Thank you! 🙏`,
              ]
                .filter(Boolean)
                .join("\n");

              return (
                <a
                  href={waLink(waNumber, msg)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ background: "#25D366" }}
                >
                  <svg
                    className="w-5 h-5 fill-current shrink-0"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.553 4.122 1.52 5.862L.057 23.743l5.994-1.573A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.89 0-3.652-.522-5.157-1.43l-.37-.22-3.56.933.951-3.473-.241-.381A9.963 9.963 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                  </svg>
                  Order on WhatsApp · {lineTotal}
                </a>
              );
            })()}

          {/* Seller card */}
          <Link
            href={homeHref}
            className="group flex items-center gap-3 rounded-2xl border border-surface-100 dark:border-surface-800 bg-white dark:bg-surface-900 p-3.5 transition-shadow hover:shadow-md"
          >
            {store.logo_url ? (
              <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-surface-100 dark:border-surface-800 bg-white">
                <Image
                  src={clLogo(store.logo_url)}
                  alt={store.name}
                  fill
                  sizes="48px"
                  className="object-contain p-1"
                />
              </span>
            ) : (
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-black text-[color:var(--sf-on-accent)]"
                style={{ background: "var(--sf-accent)" }}
              >
                {store.name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                Sold by
              </span>
              <span className="block truncate text-sm font-bold text-surface-900 dark:text-white">
                {store.name}
              </span>
            </span>
            <span
              className="flex items-center gap-1 text-xs font-bold group-hover:underline"
              style={{ color: "var(--sf-accent)" }}
            >
              <StoreIcon className="w-3.5 h-3.5" />
              Visit store
            </span>
          </Link>
        </div>
      </div>

      {/* ═════════════ DETAILS ═════════════ */}
      {product.description && (
        <section className="mt-12 rounded-2xl border border-surface-100 dark:border-surface-800 bg-white dark:bg-surface-900 p-5 sm:p-7">
          <h2 className="text-lg font-black text-surface-900 dark:text-white mb-3">
            Product details
          </h2>
          <p className="text-sm sm:text-[15px] text-surface-600 dark:text-surface-300 whitespace-pre-wrap leading-relaxed">
            {product.description}
          </p>
        </section>
      )}

      {/* ═════════════ REVIEWS ═════════════ */}
      <section id="reviews" className="mt-10 scroll-mt-24">
        <div className="flex items-end justify-between gap-3 mb-5">
          <div>
            <p
              className="text-[11px] font-bold uppercase tracking-widest mb-1"
              style={{ color: "var(--sf-accent)" }}
            >
              Community
            </p>
            <h2 className="text-xl font-black text-surface-900 dark:text-white">
              Customer reviews
            </h2>
          </div>
          {!showReviewForm && !reviewSubmitted && (
            <button
              type="button"
              onClick={() => setShowReviewForm(true)}
              className="text-sm font-bold px-4 py-2.5 rounded-xl text-[color:var(--sf-on-accent)] transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--sf-accent)" }}
            >
              Write a review
            </button>
          )}
        </div>

        {reviewSubmitted && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm font-medium flex items-center gap-2.5">
            <Check className="w-4 h-4 shrink-0" />
            Thanks! Your review is pending approval.
          </div>
        )}

        {showReviewForm && (
          <div className="mb-8 bg-surface-50 dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-5 sm:p-6">
            <h3 className="font-bold text-surface-900 dark:text-white mb-5">
              Share your experience
            </h3>
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-surface-600 dark:text-surface-400 mb-2 uppercase tracking-wide">
                  Rating <span className="text-red-500">*</span>
                </label>
                <StarSelector
                  value={reviewForm.rating}
                  onChange={(v) => setReviewForm((f) => ({ ...f, rating: v }))}
                />
                {reviewForm.rating > 0 && (
                  <p
                    className="text-xs font-semibold mt-1.5"
                    style={{ color: "var(--sf-accent)" }}
                  >
                    {RATING_LABELS[reviewForm.rating]}
                  </p>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-surface-600 dark:text-surface-400 mb-1.5 uppercase tracking-wide">
                    Your name <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={reviewForm.customer_name}
                    onChange={(e) =>
                      setReviewForm((f) => ({
                        ...f,
                        customer_name: e.target.value,
                      }))
                    }
                    required
                    placeholder="Jane Doe"
                    className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-[var(--sf-accent)] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-surface-600 dark:text-surface-400 mb-1.5 uppercase tracking-wide">
                    Email{" "}
                    <span className="font-normal normal-case text-surface-400">
                      (optional)
                    </span>
                  </label>
                  <input
                    value={reviewForm.customer_email}
                    onChange={(e) =>
                      setReviewForm((f) => ({
                        ...f,
                        customer_email: e.target.value,
                      }))
                    }
                    type="email"
                    placeholder="jane@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-[var(--sf-accent)] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-600 dark:text-surface-400 mb-1.5 uppercase tracking-wide">
                  Your review{" "}
                  <span className="font-normal normal-case text-surface-400">
                    (optional)
                  </span>
                </label>
                <textarea
                  value={reviewForm.body}
                  onChange={(e) =>
                    setReviewForm((f) => ({ ...f, body: e.target.value }))
                  }
                  rows={3}
                  maxLength={1000}
                  placeholder="What did you like or dislike?"
                  className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-[var(--sf-accent)] text-sm resize-none"
                />
              </div>

              {reviewError && (
                <p className="text-sm text-red-500">{reviewError}</p>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={
                    submittingReview ||
                    !reviewForm.customer_name ||
                    reviewForm.rating === 0
                  }
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-90 disabled:opacity-50 active:scale-[0.98]"
                  style={{ backgroundColor: "var(--sf-accent)", color: "var(--sf-on-accent)" }}
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
                  onClick={() => {
                    setShowReviewForm(false);
                    setReviewError("");
                  }}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {reviewsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-surface-400" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-surface-200 dark:border-surface-700 text-center py-12 text-surface-400">
            <Star className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No reviews yet. Be the first!</p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
            {/* Summary */}
            <div className="rounded-2xl border border-surface-100 dark:border-surface-800 bg-white dark:bg-surface-900 p-5 lg:sticky lg:top-24">
              <div className="flex items-end gap-3">
                <span className="text-5xl font-black text-surface-900 dark:text-white leading-none">
                  {avgRating.toFixed(1)}
                </span>
                <span className="pb-1 text-sm text-surface-400">out of 5</span>
              </div>
              <div className="mt-2">
                <StarDisplay rating={Math.round(avgRating)} size="md" />
              </div>
              <p className="mt-1 text-xs text-surface-400">
                {reviewTotal} review{reviewTotal !== 1 ? "s" : ""}
              </p>

              <div className="mt-4 space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = distribution[star - 1];
                  const pct = reviews.length
                    ? (count / reviews.length) * 100
                    : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-xs">
                      <span className="w-3 font-semibold text-surface-600 dark:text-surface-300">
                        {star}
                      </span>
                      <Star
                        className="w-3 h-3"
                        style={{ fill: "#f59e0b", stroke: "#f59e0b" }}
                      />
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-100 dark:bg-surface-800">
                        <div
                          className="h-full rounded-full bg-amber-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-6 text-right text-surface-400">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* List */}
            <div className="space-y-3">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-5"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-[color:var(--sf-on-accent)] shrink-0"
                        style={{ backgroundColor: "var(--sf-accent)" }}
                      >
                        {review.customer_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-surface-900 dark:text-white text-sm leading-tight">
                          {review.customer_name}
                        </p>
                        <p className="text-xs text-surface-400">
                          {formatDate(review.created_at)}
                        </p>
                      </div>
                    </div>
                    <StarDisplay rating={review.rating} size="sm" />
                  </div>
                  {review.body && (
                    <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed mt-2">
                      {review.body}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ═════════════ RELATED ═════════════ */}
      {related.length > 0 && (
        <section className="mt-12 border-t border-surface-100 dark:border-surface-800 pt-10">
          <div className="mb-5">
            <p
              className="text-[11px] font-bold uppercase tracking-widest mb-1"
              style={{ color: "var(--sf-accent)" }}
            >
              Explore more
            </p>
            <h2 className="text-xl font-black text-surface-900 dark:text-white">
              You might also like
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} storeSlug={storeSlug} />
            ))}
          </div>
        </section>
      )}

      {/* ═════════════ MOBILE STICKY BUY BAR ═════════════ */}
      {inStock && (
        <div className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-surface-100 dark:border-surface-800 bg-white/95 dark:bg-surface-900/95 backdrop-blur-md p-3">
          <div className="flex items-center gap-3">
            <div className="min-w-0">
              <p className="text-lg font-black leading-tight text-surface-900 dark:text-white">
                {lineTotal}
              </p>
              {hasDiscount && (
                <p className="text-[11px] text-surface-400 line-through leading-tight">
                  {formatCurrency(comparePrice! * qty)}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={needsSize}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-60 ${
                added ? "bg-emerald-500 text-white" : ""
              }`}
              style={
                added
                  ? {}
                  : { backgroundColor: "var(--sf-accent)", color: "var(--sf-on-accent)" }
              }
            >
              {added ? (
                <Check className="w-4 h-4" />
              ) : (
                <ShoppingCart className="w-4 h-4" />
              )}
              {addLabel}
            </button>
          </div>
        </div>
      )}

      {/* ═════════════ LIGHTBOX ═════════════ */}
      {lightbox && images.length > 0 && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Product images"
        >
          <button
            type="button"
            onClick={() => setLightbox(false)}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            <X className="w-5 h-5" />
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImg((i) => (i - 1 + images.length) % images.length);
                }}
                aria-label="Previous image"
                className="absolute left-3 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImg((i) => (i + 1) % images.length);
                }}
                aria-label="Next image"
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <div
            className="relative h-full w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[activeImg]}
              alt={product.name}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
