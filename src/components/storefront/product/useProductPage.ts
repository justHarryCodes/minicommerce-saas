"use client";

// Everything a product page does, independent of how it looks. Every
// product layout (./layouts) renders from this one hook, so cart, stock,
// variants, booking and reviews behave identically in every theme.

import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/storefront/CartProvider";
import { useStore } from "@/lib/store-context";
import { formatCurrency } from "@/lib/utils";
import { optionNamesOf, optionsOf } from "@/lib/variants-shared";
import { lagosParts } from "@/lib/hours";
import { formatAppointment } from "@/lib/booking";
import { parseSizeGuide } from "@/lib/size-guide";
import { parseProductDetails } from "@/lib/product-details";
import type { BookingSelection } from "@/components/storefront/BookingPicker";
import type { Product, Store } from "@/types";

export interface Review {
  id: string;
  customer_name: string;
  rating: number;
  body: string | null;
  created_at: string;
}

export type PageProduct = Product & { category_name?: string; category_slug?: string };

export interface ProductPageProps {
  product: PageProduct;
  related: Product[];
  store: Store;
  storeSlug: string;
  bookingsEnabled?: boolean;
  stockAlertsEnabled?: boolean;
}

export function useProductPage({ product, storeSlug }: ProductPageProps) {
  const { addItem } = useCart();
  const { storeBase, theme } = useStore();
  const homeHref = storeBase || "/";

  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  // Variants: one picker per option (legacy size-only products → "Size").
  const rawOptionNames = product.option_names ?? product.optionNames;
  const optionNames = optionNamesOf(rawOptionNames);
  const sizes = useMemo(
    () =>
      (product.sizes ?? []).map((s) => ({
        label: s.label,
        stockQuantity: s.stockQuantity ?? s.stock_quantity ?? 0,
        options: optionsOf(rawOptionNames, s),
        price: s.price != null ? Number(s.price) : null,
        imageUrl: s.imageUrl ?? s.image_url ?? null,
      })),
    [product.sizes, rawOptionNames],
  );
  const hasSizes = sizes.length > 0;
  const [picked, setPicked] = useState<Record<string, string>>({});
  const selectedVariant =
    hasSizes && optionNames.every((n) => picked[n])
      ? sizes.find((s) => optionNames.every((n) => s.options[n] === picked[n])) ?? null
      : null;
  const selectedSize = selectedVariant?.label ?? null;
  const valuesFor = (name: string) => Array.from(new Set(sizes.map((s) => s.options[name]).filter(Boolean))) as string[];
  const availableWith = (name: string, value: string) =>
    sizes.some(
      (s) => s.options[name] === value && s.stockQuantity > 0 && optionNames.every((n) => n === name || !picked[n] || s.options[n] === picked[n]),
    );
  /** Pick a value; drops other picks that no longer form an in-stock combination. */
  const pick = (name: string, value: string) =>
    setPicked((p) => {
      const next = { ...p, [name]: value };
      for (const other of optionNames) {
        if (other === name || !next[other]) continue;
        const ok = sizes.some((s) => s.stockQuantity > 0 && optionNames.every((n) => !next[n] || s.options[n] === next[n]));
        if (!ok) delete next[other];
      }
      return next;
    });

  const unitPrice = selectedVariant?.price ?? product.price;
  const priceRange = useMemo(() => {
    const prices = sizes.map((s) => s.price ?? product.price);
    return prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null;
  }, [sizes, product.price]);

  const baseImages = product.images?.length ? product.images : product.image_url ? [product.image_url] : product.imageUrl ? [product.imageUrl] : [];
  // A chosen variant's own photo leads the gallery
  const images = selectedVariant?.imageUrl && !baseImages.includes(selectedVariant.imageUrl) ? [selectedVariant.imageUrl, ...baseImages] : baseImages;
  useEffect(() => {
    if (selectedVariant?.imageUrl) setActiveImg(Math.max(0, images.indexOf(selectedVariant.imageUrl)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVariant?.imageUrl]);

  const stockQty = product.stock_quantity ?? product.stockQuantity ?? 0;
  const selectedSizeStock = selectedSize ? (sizes.find((s) => s.label === selectedSize)?.stockQuantity ?? 0) : 0;
  const isBookable = Boolean(product.is_bookable);
  const sizeGuide = parseSizeGuide(product.size_guide);
  const details = parseProductDetails((product as { details?: unknown }).details);
  const soldOutToday = !!product.sold_out_until && String(product.sold_out_until).slice(0, 10) >= lagosParts(new Date()).date;
  const [booking, setBooking] = useState<BookingSelection | null>(null);
  const effectiveStock = isBookable ? 1 : hasSizes ? selectedSizeStock : stockQty;
  const comparePrice = product.compare_price ?? product.comparePrice;
  const hasDiscount = !!comparePrice && comparePrice > unitPrice;
  const discountPct = hasDiscount ? Math.round((1 - unitPrice / comparePrice!) * 100) : 0;
  const savings = hasDiscount ? comparePrice! - unitPrice : 0;
  const needsSize = (hasSizes && !selectedSize) || (isBookable && !booking);
  const inStock = isBookable || (stockQty > 0 && !soldOutToday);

  // Reviews
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setReviewsLoading(true);
    fetch(`/api/storefront/${storeSlug}/reviews?product_id=${product.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive || !data) return;
        setReviews(data.data ?? []);
        setAvgRating(data.avg_rating ?? 0);
        setReviewTotal(data.total ?? 0);
      })
      .catch(() => {})
      .finally(() => alive && setReviewsLoading(false));
    return () => {
      alive = false;
    };
  }, [product.id, storeSlug]);
  const distribution = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    reviews.forEach((r) => r.rating >= 1 && r.rating <= 5 && counts[r.rating - 1]++);
    return counts;
  }, [reviews]);

  useEffect(() => setQty(1), [selectedSize]);

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
    } else {
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
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  async function handleShare() {
    try {
      if (navigator.share) await navigator.share({ title: product.name, url: window.location.href });
      else {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      /* cancelled */
    }
  }

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
            : theme.copy.addToCart || "Add to cart";
  const stockNote =
    !inStock || (hasSizes && selectedSize && selectedSizeStock <= 0) ? null : effectiveStock > 0 && effectiveStock <= 10 ? `Only ${effectiveStock} left` : null;
  const priceLabel =
    !selectedVariant && priceRange && priceRange.min !== priceRange.max
      ? `${formatCurrency(priceRange.min)} – ${formatCurrency(priceRange.max)}`
      : formatCurrency(unitPrice);

  return {
    homeHref,
    theme,
    images,
    activeImg,
    setActiveImg,
    lightbox,
    setLightbox,
    optionNames,
    sizes,
    hasSizes,
    picked,
    pick,
    valuesFor,
    availableWith,
    selectedVariant,
    selectedSize,
    unitPrice,
    priceLabel,
    comparePrice,
    hasDiscount,
    discountPct,
    savings,
    qty,
    setQty,
    effectiveStock,
    inStock,
    soldOutToday,
    stockNote,
    needsSize,
    isBookable,
    booking,
    setBooking,
    sizeGuide,
    details,
    added,
    copied,
    addLabel,
    lineTotal,
    handleAdd,
    handleShare,
    reviews,
    setReviews,
    avgRating,
    reviewTotal,
    reviewsLoading,
    distribution,
  };
}

export type ProductPageState = ReturnType<typeof useProductPage>;
