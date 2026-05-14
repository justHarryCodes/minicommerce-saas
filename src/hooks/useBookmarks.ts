"use client";
import { useState, useEffect, useCallback } from "react";

export interface BookmarkedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_price: number | null;
  image_url: string | null;
}

function storageKey(storeSlug: string) {
  return `sf_bookmarks_${storeSlug}`;
}

export function useBookmarks(storeSlug: string) {
  const [bookmarks, setBookmarks] = useState<BookmarkedProduct[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(storeSlug));
      if (raw) setBookmarks(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, [storeSlug]);

  const isBookmarked = useCallback(
    (productId: string) => bookmarks.some((b) => b.id === productId),
    [bookmarks]
  );

  const toggleBookmark = useCallback(
    (product: BookmarkedProduct) => {
      setBookmarks((prev) => {
        const exists = prev.some((b) => b.id === product.id);
        const next = exists
          ? prev.filter((b) => b.id !== product.id)
          : [product, ...prev];
        try {
          localStorage.setItem(storageKey(storeSlug), JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    [storeSlug]
  );

  const clearAll = useCallback(() => {
    setBookmarks([]);
    try {
      localStorage.removeItem(storageKey(storeSlug));
    } catch {}
  }, [storeSlug]);

  return { bookmarks, isBookmarked, toggleBookmark, clearAll, count: bookmarks.length, hydrated };
}
