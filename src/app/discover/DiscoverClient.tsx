"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { getStoreUrl } from "@/lib/utils";

interface StoreRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  primary_category: string | null;
  created_at: string;
}

interface CategoryCount {
  primary_category: string;
  count: string;
}

interface Props {
  stores: StoreRow[];
  categoryCounts: CategoryCount[];
  activeCategory: string;
  initialSearch: string;
  totalCount: number;
}

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  "Fashion and Clothing":    { icon: "👗", color: "#ec4899" },
  "Shoes and Sneakers":      { icon: "👟", color: "#f97316" },
  "Bags and Accessories":    { icon: "👜", color: "#a855f7" },
  "Beauty and Makeup":       { icon: "💄", color: "#f43f5e" },
  "Hair and Wigs":           { icon: "💇", color: "#06b6d4" },
  "Food and Catering":       { icon: "🍽️", color: "#22c55e" },
  "Electronics and Gadgets": { icon: "⚡", color: "#3b82f6" },
  "Phones and Accessories":  { icon: "📱", color: "#6366f1" },
  "Laptops and Computing":   { icon: "💻", color: "#0ea5e9" },
  "Furniture and Home":      { icon: "🛋️", color: "#84cc16" },
  "Artwork and Paintings":   { icon: "🎨", color: "#f59e0b" },
  "Jewelry and Watches":     { icon: "💎", color: "#14b8a6" },
  "Books and Stationery":    { icon: "📚", color: "#8b5cf6" },
  "Other":                   { icon: "📦", color: "#71717a" },
};

export default function DiscoverClient({
  stores,
  categoryCounts,
  activeCategory,
  initialSearch,
  totalCount,
}: Props) {
  const [search, setSearch] = useState(initialSearch);
  const router = useRouter();

  const filteredStores = useMemo(() => {
    if (!search.trim()) return stores;
    const q = search.toLowerCase();
    return stores.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q))
    );
  }, [stores, search]);

  const handleCategoryChange = (cat: string) => {
    const params = new URLSearchParams();
    if (cat !== "all") params.set("category", cat);
    router.push(`/discover${params.toString() ? "?" + params.toString() : ""}`);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Navbar */}
      <nav
        className="sticky top-0 z-50 border-b backdrop-blur-sm"
        style={{ background: "var(--bg)", borderColor: "var(--border)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm text-black"
                style={{ background: "var(--accent)" }}
              >
                SF
              </div>
              <span className="font-black text-lg" style={{ color: "var(--text-primary)" }}>
                ShopForge
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/auth/login"
                className="text-sm font-medium px-4 py-2 rounded-lg transition-opacity hover:opacity-70"
                style={{ color: "var(--text-primary)" }}
              >
                Login
              </Link>
              <Link
                href="/auth/signup"
                className="text-sm font-semibold px-4 py-2 rounded-lg text-black transition-opacity hover:opacity-90"
                style={{ background: "var(--accent)" }}
              >
                Start Selling
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Page header */}
        <div className="mb-8">
          <h1
            className="text-4xl font-black mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            Discover Stores
          </h1>
          <p className="text-lg" style={{ color: "var(--text-secondary)" }}>
            {totalCount > 0
              ? `${totalCount} vendor${totalCount === 1 ? "" : "s"} and growing`
              : "Browse vendors on ShopForge"}
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
            style={{ color: "var(--text-muted)" }}
          />
          <input
            type="text"
            placeholder="Search stores by name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 rounded-xl border text-sm font-medium outline-none transition-all"
            style={{
              background: "var(--bg)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        {/* Category filter tabs */}
        <div
          className="flex gap-2 overflow-x-auto pb-3 mb-8"
          style={{ scrollbarWidth: "none" }}
        >
          <button
            onClick={() => handleCategoryChange("all")}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all"
            style={{
              background: activeCategory === "all" ? "var(--accent)" : "var(--bg-tertiary)",
              color: activeCategory === "all" ? "#000" : "var(--text-secondary)",
            }}
          >
            All
            <span className="text-xs opacity-60">({totalCount})</span>
          </button>

          {categoryCounts.map(({ primary_category, count }) => {
            const meta = CATEGORY_META[primary_category] ?? CATEGORY_META["Other"];
            const isActive = activeCategory === primary_category;
            return (
              <button
                key={primary_category}
                onClick={() => handleCategoryChange(primary_category)}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all"
                style={{
                  background: isActive ? "var(--accent)" : "var(--bg-tertiary)",
                  color: isActive ? "#000" : "var(--text-secondary)",
                }}
              >
                <span>{meta.icon}</span>
                {primary_category}
                <span className="text-xs opacity-60">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Results count when searching */}
        {search.trim() && (
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            {filteredStores.length === 0
              ? `No results for "${search}"`
              : `${filteredStores.length} result${filteredStores.length === 1 ? "" : "s"} for "${search}"`}
          </p>
        )}

        {/* Store grid */}
        {filteredStores.length === 0 ? (
          <div className="py-32 text-center">
            <p className="text-5xl mb-4">🏪</p>
            <p className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
              No stores found
            </p>
            <p className="text-base" style={{ color: "var(--text-secondary)" }}>
              {search
                ? `No stores match "${search}"`
                : activeCategory !== "all"
                ? "No stores in this category yet"
                : "No stores listed yet"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredStores.map((store) => {
              const meta =
                store.primary_category
                  ? (CATEGORY_META[store.primary_category] ?? CATEGORY_META["Other"])
                  : CATEGORY_META["Other"];

              return (
                <a
                  key={store.id}
                  href={getStoreUrl(store.slug)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col rounded-2xl border overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5"
                  style={{ background: "var(--bg)", borderColor: "var(--border)" }}
                >
                  {/* Store banner / avatar area */}
                  <div
                    className="h-24 flex items-center justify-center"
                    style={{ background: `${meta.color}18` }}
                  >
                    {store.logo_url ? (
                      <img
                        src={store.logo_url}
                        alt={store.name}
                        className="h-16 w-16 object-cover rounded-xl shadow-sm"
                      />
                    ) : (
                      <div
                        className="h-16 w-16 rounded-xl flex items-center justify-center text-3xl font-black text-white shadow-sm"
                        style={{ background: meta.color }}
                      >
                        {store.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Store info */}
                  <div className="flex-1 p-4">
                    <h3
                      className="font-bold text-base leading-tight mb-1 group-hover:underline"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {store.name}
                    </h3>
                    {store.description && (
                      <p
                        className="text-xs leading-relaxed mb-3 line-clamp-2"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {store.description}
                      </p>
                    )}
                    {store.primary_category && (
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{
                          background: `${meta.color}18`,
                          color: meta.color,
                        }}
                      >
                        {meta.icon} {store.primary_category}
                      </span>
                    )}
                  </div>

                  {/* CTA */}
                  <div className="px-4 pb-4">
                    <div
                      className="w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-opacity group-hover:opacity-90"
                      style={{ background: "var(--accent)", color: "#000" }}
                    >
                      Visit Store →
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer
        className="py-10 px-4 mt-16 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="max-w-7xl mx-auto text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center font-black text-xs text-black"
              style={{ background: "var(--accent)" }}
            >
              SF
            </div>
            <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
              ShopForge
            </span>
          </Link>
          <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
            © {new Date().getFullYear()} ShopForge. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
