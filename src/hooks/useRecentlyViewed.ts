"use client";
import { useEffect, useState } from "react";

// Products a shopper opened recently, per store, on this device. Shown as
// "Recently viewed" on product pages.

export interface ViewedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_price: number | null;
  image_url: string | null;
  stock_quantity: number;
  has_sizes?: boolean;
}

const PREFIX = "sf_viewed_";
const MAX = 12;

function read(slug: string): ViewedProduct[] {
  try {
    const list = JSON.parse(localStorage.getItem(PREFIX + slug) ?? "[]");
    return Array.isArray(list) ? list.filter((x) => x && typeof x.id === "string" && typeof x.name === "string") : [];
  } catch {
    return [];
  }
}

/** Records `current` as viewed and returns the others, newest first. */
export function useRecentlyViewed(storeSlug: string, current: ViewedProduct | null): ViewedProduct[] {
  const [others, setOthers] = useState<ViewedProduct[]>([]);
  const currentId = current?.id;
  useEffect(() => {
    const prev = read(storeSlug);
    setOthers(prev.filter((p) => p.id !== currentId));
    if (!current) return;
    try {
      localStorage.setItem(PREFIX + storeSlug, JSON.stringify([current, ...prev.filter((p) => p.id !== current.id)].slice(0, MAX)));
    } catch {
      /* storage blocked: nothing to remember */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeSlug, currentId]);
  return others;
}
