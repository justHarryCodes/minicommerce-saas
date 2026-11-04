"use client";

// Save / unsave a product (favourites). Safe inside a product <Link>.
import { Heart } from "lucide-react";
import { useBookmarks } from "@/hooks/useBookmarks";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

export default function HeartButton({ product, storeSlug, className = "" }: { product: Product; storeSlug: string; className?: string }) {
  const { isBookmarked, toggleBookmark } = useBookmarks(storeSlug);
  const saved = isBookmarked(product.id);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleBookmark({
          id: product.id,
          name: product.name,
          slug: product.slug ?? product.id,
          price: product.price,
          compare_price: product.compare_price ?? product.comparePrice ?? null,
          image_url: product.images?.[0] ?? product.image_url ?? product.imageUrl ?? null,
        });
      }}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${product.name} from saved` : `Save ${product.name}`}
      className={cn(
        "z-[2] flex h-8 w-8 items-center justify-center rounded-full shadow-md transition-all duration-200",
        saved ? "scale-110 bg-red-500 text-white" : "bg-white/90 text-surface-400 hover:scale-110 hover:text-red-500 dark:bg-surface-800/90",
        className,
      )}
    >
      <Heart className={cn("h-3.5 w-3.5", saved && "fill-current")} />
    </button>
  );
}
