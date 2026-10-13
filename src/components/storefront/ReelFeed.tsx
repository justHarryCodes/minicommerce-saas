"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useSyncExternalStore,
} from "react";
import ReelCard from "./ReelCard";
import type { Reel } from "@/types";

interface Props {
  initialReels: Reel[];
  shareBase: string;
  storeSlug?: string;
}

// How many reels around the active one are actually mounted on mobile.
const MOBILE_WINDOW = 2;

function preloadFor(i: number, active: number): "auto" | "none" {
  return Math.abs(i - active) <= 1 ? "auto" : "none";
}

// Single source of truth for layout: only ONE tree is rendered, so videos
// are never mounted twice (previously mobile + desktop both rendered all cards).
function useIsDesktop(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(min-width: 1024px)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => false,
  );
}

export default function ReelFeed({
  initialReels,
  shareBase,
  storeSlug,
}: Props) {
  const [reels, setReels] = useState<Reel[]>(initialReels);
  const [cursor, setCursor] = useState<string | null>(
    initialReels.length >= 10
      ? (initialReels[initialReels.length - 1]?.id ?? null)
      : null,
  );
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const isDesktop = useIsDesktop();

  const mobileContainerRef = useRef<HTMLDivElement>(null);
  const mobileItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (!storeSlug || !cursor || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/storefront/${storeSlug}/reels?cursor=${cursor}`,
      );
      if (!res.ok) return;
      const data = await res.json();
      setReels((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        return [
          ...prev,
          ...((data.reels ?? []) as Reel[]).filter((r) => !seen.has(r.id)),
        ];
      });
      setCursor(data.nextCursor ?? null);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [storeSlug, cursor]);

  // Mobile snap-scroll: track the active reel and prefetch the next page early.
  useEffect(() => {
    if (isDesktop) return;
    const container = mobileContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const idx = mobileItemRefs.current.findIndex(
              (el) => el === entry.target,
            );
            if (idx !== -1) {
              setActiveIndex(idx);
              if (idx >= reels.length - 3) loadMore();
            }
          }
        }
      },
      { root: container, threshold: 0.6 },
    );

    mobileItemRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [reels.length, loadMore, isDesktop]);

  if (reels.length === 0) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center px-6 text-center">
        <span className="mb-4 text-5xl">🎬</span>
        <p className="text-lg font-semibold text-white">No reels yet</p>
        <p className="mt-1 text-sm text-zinc-400">
          Check back soon for shoppable videos.
        </p>
      </div>
    );
  }

  // ── Desktop: portrait grid, click to activate ───────────────────────────
  if (isDesktop) {
    return (
      <div className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-6 text-xl font-black tracking-tight text-white">
            Reels
            <span className="ml-2 text-sm font-normal text-zinc-500">
              {reels.length} video{reels.length !== 1 ? "s" : ""}
            </span>
          </h2>

          <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
            {reels.map((reel, i) => (
              <div
                key={reel.id}
                onClick={() => setActiveIndex(i)}
                className={`relative aspect-[9/16] cursor-pointer overflow-hidden rounded-2xl transition-all duration-200 ${
                  i === activeIndex
                    ? "scale-[1.01] shadow-[0_0_30px_rgba(255,255,255,0.15)] ring-2 ring-white/60"
                    : "opacity-80 hover:scale-[1.01] hover:opacity-100"
                }`}
              >
                <ReelCard
                  reel={reel}
                  shareBase={shareBase}
                  isActive={i === activeIndex}
                  preloadHint={preloadFor(i, activeIndex)}
                />
              </div>
            ))}
          </div>

          {cursor && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={loadMore}
                disabled={loading}
                className="rounded-xl border border-zinc-700 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
              >
                {loading ? "Loading…" : "Load more reels"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Mobile: full-screen vertical snap scroll, windowed ──────────────────
  // Only reels near the active one are mounted; the rest are empty
  // placeholders of the same height so scroll position and snapping stay intact.
  return (
    <div
      ref={mobileContainerRef}
      className="h-[100dvh] snap-y snap-mandatory overflow-y-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {reels.map((reel, i) => (
        <div
          key={reel.id}
          ref={(el) => {
            mobileItemRefs.current[i] = el;
          }}
          className="relative h-[100dvh] snap-start snap-always bg-black"
        >
          {Math.abs(i - activeIndex) <= MOBILE_WINDOW && (
            <ReelCard
              reel={reel}
              shareBase={shareBase}
              isActive={i === activeIndex}
              preloadHint={preloadFor(i, activeIndex)}
            />
          )}
        </div>
      ))}

      {loading && (
        <div className="flex h-16 snap-start items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      )}
      {!cursor && (
        <div className="flex h-16 snap-start items-center justify-center">
          <p className="text-xs text-white/50">You&apos;ve seen all reels</p>
        </div>
      )}
    </div>
  );
}
