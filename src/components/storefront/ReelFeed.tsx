"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ReelCard from "./ReelCard";
import type { Reel } from "@/types";

interface Props {
  initialReels: Reel[];
  shareBase: string;
  storeSlug?: string;
}

function preloadFor(i: number, active: number): "auto" | "none" {
  return Math.abs(i - active) <= 1 ? "auto" : "none";
}

export default function ReelFeed({ initialReels, shareBase, storeSlug }: Props) {
  const [reels, setReels] = useState<Reel[]>(initialReels);
  const [cursor, setCursor] = useState<string | null>(
    initialReels.length >= 10 ? (initialReels[initialReels.length - 1]?.id ?? null) : null
  );
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Mobile-only refs
  const mobileContainerRef = useRef<HTMLDivElement>(null);
  const mobileItemRefs = useRef<(HTMLDivElement | null)[]>([]);

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

  // Mobile snap-scroll: IntersectionObserver scoped to the mobile container
  useEffect(() => {
    const container = mobileContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const idx = mobileItemRefs.current.findIndex((el) => el === entry.target);
            if (idx !== -1) {
              setActiveIndex(idx);
              if (idx >= reels.length - 2) loadMore();
            }
          }
        }
      },
      { root: container, threshold: 0.6 }
    );

    mobileItemRefs.current.forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [reels.length, loadMore]);

  if (reels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
        <span className="text-5xl mb-4">🎬</span>
        <p className="font-semibold text-white text-lg">No reels yet</p>
        <p className="text-zinc-400 text-sm mt-1">Check back soon for shoppable videos.</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Mobile: full-screen vertical snap scroll ─────────────────────── */}
      <div
        ref={mobileContainerRef}
        className="lg:hidden h-[100dvh] overflow-y-scroll snap-y snap-mandatory"
        style={{ scrollbarWidth: "none" }}
      >
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>

        {reels.map((reel, i) => (
          <div
            key={reel.id}
            ref={(el) => { mobileItemRefs.current[i] = el; }}
            className="h-[100dvh] snap-start snap-always relative"
          >
            <ReelCard reel={reel} shareBase={shareBase} isActive={i === activeIndex} preloadHint={preloadFor(i, activeIndex)} />
          </div>
        ))}

        {loading && (
          <div className="h-16 flex items-center justify-center snap-start">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
        {!cursor && reels.length > 0 && (
          <div className="h-16 flex items-center justify-center snap-start">
            <p className="text-white/50 text-xs">You&apos;ve seen all reels</p>
          </div>
        )}
      </div>

      {/* ── Desktop: portrait grid, click to activate ────────────────────── */}
      <div className="hidden lg:block min-h-screen py-10 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-white font-black text-xl mb-6 tracking-tight">
            Reels
            <span className="ml-2 text-sm font-normal text-zinc-500">{reels.length} video{reels.length !== 1 ? "s" : ""}</span>
          </h2>

          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
            {reels.map((reel, i) => (
              <div
                key={reel.id}
                onClick={() => setActiveIndex(i)}
                className={`relative aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 ${
                  i === activeIndex
                    ? "ring-2 ring-white/60 shadow-[0_0_30px_rgba(255,255,255,0.15)] scale-[1.01]"
                    : "opacity-80 hover:opacity-100 hover:scale-[1.01]"
                }`}
              >
                <ReelCard reel={reel} shareBase={shareBase} isActive={i === activeIndex} preloadHint={preloadFor(i, activeIndex)} />
              </div>
            ))}
          </div>

          {/* Load more on desktop */}
          {cursor && (
            <div className="flex justify-center mt-8">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white border border-zinc-700 hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {loading ? "Loading…" : "Load more reels"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
