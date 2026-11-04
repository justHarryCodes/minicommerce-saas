"use client";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

// Saved ("favourite") products, per store, in localStorage.
//
// One shared list per store: every heart on the page, the nav count and the
// saved-items slider read and write the same copy. (Each component used to
// load its own copy once on mount, so hearting a second product from a
// different card wrote over the first — only one favourite ever stuck.)
// Other tabs stay in sync through the `storage` event.

export interface BookmarkedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_price: number | null;
  image_url: string | null;
}

const PREFIX = "sf_bookmarks_";
const MAX = 200;
const EMPTY: BookmarkedProduct[] = [];

const cache = new Map<string, BookmarkedProduct[]>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function valid(x: unknown): x is BookmarkedProduct {
  const b = x as BookmarkedProduct;
  return !!b && typeof b.id === "string" && typeof b.name === "string";
}

/** The current list for a store (read from storage once, then shared). */
export function readBookmarks(slug: string): BookmarkedProduct[] {
  let list = cache.get(slug);
  if (!list) {
    try {
      const parsed = JSON.parse(localStorage.getItem(PREFIX + slug) ?? "[]");
      list = Array.isArray(parsed) ? parsed.filter(valid) : [];
    } catch {
      list = [];
    }
    cache.set(slug, list);
  }
  return list;
}

function writeBookmarks(slug: string, next: BookmarkedProduct[]) {
  cache.set(slug, next);
  try {
    if (next.length) localStorage.setItem(PREFIX + slug, JSON.stringify(next));
    else localStorage.removeItem(PREFIX + slug);
  } catch {
    /* storage full or blocked — the in-page list still works */
  }
  notify();
}

/** Add or remove one product, always against the latest list. */
export function toggleBookmarkIn(slug: string, product: BookmarkedProduct) {
  const prev = readBookmarks(slug);
  const exists = prev.some((b) => b.id === product.id);
  writeBookmarks(slug, exists ? prev.filter((b) => b.id !== product.id) : [product, ...prev].slice(0, MAX));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === null) cache.clear();
    else if (e.key.startsWith(PREFIX)) cache.delete(e.key.slice(PREFIX.length));
    else return;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useBookmarks(storeSlug: string) {
  const bookmarks = useSyncExternalStore(
    subscribe,
    () => readBookmarks(storeSlug),
    () => EMPTY
  );
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const isBookmarked = useCallback((productId: string) => bookmarks.some((b) => b.id === productId), [bookmarks]);
  const toggleBookmark = useCallback((product: BookmarkedProduct) => toggleBookmarkIn(storeSlug, product), [storeSlug]);
  const clearAll = useCallback(() => writeBookmarks(storeSlug, []), [storeSlug]);

  return { bookmarks, isBookmarked, toggleBookmark, clearAll, count: bookmarks.length, hydrated };
}
