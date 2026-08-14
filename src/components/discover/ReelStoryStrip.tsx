"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { getReelUrl } from "@/lib/utils";
import type { Reel } from "@/types";

const ITEM_W = 76;

interface Props {
  reels: Reel[];
}

export default function ReelStoryStrip({ reels }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  if (reels.length === 0) return null;

  const scroll = (dir: "left" | "right") =>
    ref.current?.scrollBy({ left: dir === "left" ? -ITEM_W * 3 : ITEM_W * 3, behavior: "smooth" });

  return (
    <div className="relative group/reelstrip mb-8">
      <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "var(--text-muted)" }}>
        Latest Reels
      </p>

      {reels.length > 6 && (
        <button
          onClick={() => scroll("left")}
          aria-label="Scroll left"
          className="absolute left-0 top-[58%] -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center shadow-md border opacity-0 group-hover/reelstrip:opacity-100 transition-all hover:scale-110 -ml-3"
          style={{ background: "var(--bg)", borderColor: "var(--border)" }}
        >
          <ChevronLeft className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
        </button>
      )}

      <div
        ref={ref}
        className="flex gap-4 overflow-x-auto pb-1"
        style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none" }}
      >
        {reels.map((reel) => {
          const storeSlug = reel.store_slug ?? "";
          const storeName = reel.store_name ?? "Store";
          return (
            <a
              key={reel.id}
              href={getReelUrl(storeSlug, reel.id)}
              className="group/story shrink-0 flex flex-col items-center gap-1.5"
              style={{ width: ITEM_W, scrollSnapAlign: "start" }}
            >
              <div className="relative">
                <div
                  className="rounded-full p-[2.5px] transition-transform group-hover/story:scale-105"
                  style={{ background: "var(--accent)" }}
                >
                  <div
                    className="w-16 h-16 rounded-full overflow-hidden border-2"
                    style={{ borderColor: "var(--bg)" }}
                  >
                    {reel.thumbnail_url ? (
                      <img
                        src={reel.thumbnail_url}
                        alt={storeName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center font-black text-lg"
                        style={{ background: "var(--accent)", color: "#000" }}
                      >
                        {storeName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2"
                  style={{ background: "var(--accent)", borderColor: "var(--bg)" }}
                >
                  <Play className="w-2.5 h-2.5 fill-current" style={{ color: "#000" }} />
                </div>
              </div>
              <span
                className="text-xs font-semibold text-center truncate w-full"
                style={{ color: "var(--text-primary)" }}
              >
                {storeName}
              </span>
            </a>
          );
        })}
      </div>

      {reels.length > 6 && (
        <button
          onClick={() => scroll("right")}
          aria-label="Scroll right"
          className="absolute right-0 top-[58%] -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center shadow-md border opacity-0 group-hover/reelstrip:opacity-100 transition-all hover:scale-110 -mr-3"
          style={{ background: "var(--bg)", borderColor: "var(--border)" }}
        >
          <ChevronRight className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
        </button>
      )}
    </div>
  );
}
