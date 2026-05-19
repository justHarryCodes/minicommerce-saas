"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ReelCard from "./ReelCard";
import type { Reel } from "@/types";

interface Props {
  initialReels: Reel[];
  shareBase: string;
  storeSlug?: string; // if provided, loads more via pagination
}

export default function ReelFeed({ initialReels, shareBase, storeSlug }: Props) {
  const [reels, setReels] = useState<Reel[]>(initialReels);
  const [cursor, setCursor] = useState<string | null>(
    initialReels.length >= 10 ? (initialReels[initialReels.length - 1]?.id ?? null) : null
  );
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Load more reels when cursor is available and user is near the end
  const loadMore = useCallback(async () => {
    if (!storeSlug || !cursor || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/storefront/${storeSlug}/reels?cursor=${cursor}`);
      if (!res.ok) return;
      const data = await res.json();
      setReels((prev) => [...prev, ...(data.reels ?? [])]);
      setCursor(data.nextCursor ?? null);
    } finally {
      setLoading(false);
    }
  }, [storeSlug, cursor, loading]);

  // IntersectionObserver: track which reel is snapped into view
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const idx = itemRefs.current.findIndex((el) => el === entry.target);
            if (idx !== -1) {
              setActiveIndex(idx);
              // Load more when 2 reels away from the end
              if (idx >= reels.length - 2) {
                loadMore();
              }
            }
          }
        }
      },
      { root: container, threshold: 0.6 }
    );

    itemRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [reels.length, loadMore]);

  if (reels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
        <span className="text-5xl mb-4">🎬</span>
        <p className="font-semibold text-zinc-900 dark:text-white text-lg">No reels yet</p>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
          Check back soon for shoppable videos.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-[100dvh] overflow-y-scroll snap-y snap-mandatory"
      style={{ scrollbarWidth: "none" }}
    >
      <style>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>

      {reels.map((reel, i) => (
        <div
          key={reel.id}
          ref={(el) => { itemRefs.current[i] = el; }}
          className="h-[100dvh] snap-start snap-always relative"
        >
          <ReelCard
            reel={reel}
            shareBase={shareBase}
            isActive={i === activeIndex}
          />
        </div>
      ))}

      {/* Loading indicator */}
      {loading && (
        <div className="h-16 flex items-center justify-center snap-start">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* End of feed */}
      {!cursor && reels.length > 0 && (
        <div className="h-16 flex items-center justify-center snap-start">
          <p className="text-white/50 text-xs">You&apos;ve seen all reels</p>
        </div>
      )}
    </div>
  );
}
