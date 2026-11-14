"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { BadgeCheck, Bookmark, Heart, Play, Send, ShoppingBag, Sparkles, Store as StoreIcon } from "lucide-react";
import { formatPrice, getProductUrl } from "@/lib/utils";
import { toggleBookmarkIn, useBookmarks } from "@/hooks/useBookmarks";
import type { FeedPost, ProductPost, ReelPost, StorePost } from "@/lib/discover-feed";

// Discover "For you": products, new stores and reels from every Duka store as
// a scrolling feed. Links stay on dukanigeria.com/store/... (same site, so
// saved items show up in that store's Saved page).

const storeHref = (slug: string) => `/store/${slug}`;
const productHref = (storeSlug: string, slug: string) => `/store/${storeSlug}/products/${slug}`;

/** Same anonymous visitor id the storefront uses for views. */
function visitorId(): string | null {
  try {
    let v = localStorage.getItem("sf_vid");
    if (!v) {
      v = crypto.randomUUID();
      localStorage.setItem("sf_vid", v);
    }
    return v;
  } catch {
    return null;
  }
}

function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d`;
  if (s < 86400 * 365) return `${Math.floor(s / (86400 * 7))}w`;
  return `${Math.floor(s / (86400 * 365))}y`;
}

/** "Workspace Extras/Furniture/Tools" -> "#workspaceextras" */
const hashtag = (c: string) => `#${c.split(/[/,&|]/)[0].toLowerCase().replace(/[^a-z0-9]+/g, "")}`;
/** A store category worth showing ("Other" says nothing) */
const shownCategory = (c: string | null) => (c && c.toLowerCase() !== "other" ? c : null);

const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}k` : String(n));

function Avatar({ name, logo, size = 36 }: { name: string; logo: string | null; size?: number }) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-black"
      style={{ width: size, height: size, background: "var(--bg-tertiary)", color: "var(--text-primary)", fontSize: size * 0.4, boxShadow: "0 0 0 2px var(--bg), 0 0 0 3.5px var(--accent)" }}
    >
      {logo ? <Image src={logo} alt="" fill sizes={`${size}px`} className="object-cover" /> : name.charAt(0).toUpperCase()}
    </span>
  );
}

function PostHeader({ store, meta, action }: { store: { name: string; slug: string; logo: string | null; verified?: boolean }; meta?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 sm:px-0">
      <Link href={storeHref(store.slug)} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={store.name} logo={store.logo} />
        <span className="min-w-0 leading-tight">
          <span className="flex items-center gap-1 text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            <span className="truncate">{store.name}</span>
            {store.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-sky-500" aria-label="Verified seller" />}
          </span>
          {meta && <span className="block truncate text-xs" style={{ color: "var(--text-muted)" }}>{meta}</span>}
        </span>
      </Link>
      {action}
    </div>
  );
}

/* ─────────────────────────────── Product post ─────────────────────────────── */

function Media({ post, onDoubleTap }: { post: ProductPost; onDoubleTap: () => void }) {
  const [i, setI] = useState(0);
  const [burst, setBurst] = useState(0);
  const lastTap = useRef(0);
  const ref = useRef<HTMLDivElement>(null);

  const onScroll = () => {
    const el = ref.current;
    if (el) setI(Math.round(el.scrollLeft / el.clientWidth));
  };
  const tap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      onDoubleTap();
      setBurst((b) => b + 1);
    }
    lastTap.current = now;
  };

  return (
    <div className="relative select-none" onClick={tap}>
      <div
        ref={ref}
        onScroll={onScroll}
        className="flex aspect-[4/5] snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:rounded-lg"
        style={{ background: "var(--bg-tertiary)" }}
      >
        {post.images.map((src, n) => (
          <div key={src} className="relative h-full w-full shrink-0 snap-center">
            <Image src={src} alt={n === 0 ? post.name : `${post.name}, photo ${n + 1}`} fill sizes="(max-width: 640px) 100vw, 470px" className="object-cover" priority={false} draggable={false} />
          </div>
        ))}
      </div>
      {post.compare_price && (
        <span className="absolute left-3 top-3 rounded-full bg-red-600 px-2 py-0.5 text-xs font-black text-white">
          -{Math.round((1 - post.price / post.compare_price) * 100)}%
        </span>
      )}
      {post.images.length > 1 && (
        <>
          <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
            {i + 1}/{post.images.length}
          </span>
          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1">
            {post.images.map((_, n) => (
              <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? "w-3 bg-white" : "w-1.5 bg-white/60"}`} />
            ))}
          </div>
        </>
      )}
      {burst > 0 && (
        <Heart
          key={burst}
          className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 fill-white text-white drop-shadow-lg animate-[feed-heart_.8s_ease-out_forwards]"
        />
      )}
    </div>
  );
}

function ProductPostCard({ post: initial }: { post: ProductPost }) {
  const [post, setPost] = useState(initial);
  const [open, setOpen] = useState(false);
  const { isBookmarked, hydrated } = useBookmarks(post.store.slug);
  const saved = hydrated && isBookmarked(post.id);

  const like = useCallback(
    async (to: boolean) => {
      const v = visitorId();
      if (!v) return;
      setPost((p) => ({ ...p, liked: to, likes: Math.max(0, p.likes + (to ? 1 : -1)) }));
      const res = await fetch("/api/discover/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: post.id, visitorId: v, liked: to }),
      }).catch(() => null);
      const data = res?.ok ? await res.json().catch(() => null) : null;
      if (data?.likes != null) setPost((p) => ({ ...p, likes: data.likes }));
      else setPost((p) => ({ ...p, liked: !to, likes: Math.max(0, p.likes + (to ? -1 : 1)) }));
    },
    [post.id],
  );

  const save = () => {
    toggleBookmarkIn(post.store.slug, { id: post.id, name: post.name, slug: post.slug, price: post.price, compare_price: post.compare_price, image_url: post.images[0] ?? null });
    toast.success(saved ? "Removed from saved" : `Saved to ${post.store.name}`);
  };

  const share = async () => {
    const url = getProductUrl(post.store.slug, post.slug);
    const abs = url.startsWith("http") ? url : `${window.location.origin}${url}`;
    try {
      if (navigator.share) await navigator.share({ title: post.name, text: `${post.name} · ${formatPrice(post.price)} at ${post.store.name}`, url: abs });
      else {
        await navigator.clipboard.writeText(abs);
        toast.success("Link copied");
      }
    } catch {
      /* share sheet closed */
    }
  };

  const href = productHref(post.store.slug, post.slug);
  const lowStock = post.stock != null && post.stock > 0 && post.stock <= 5;

  return (
    <article className="border-b pb-4 sm:rounded-xl sm:border sm:px-4 sm:pb-4" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
      <PostHeader
        store={post.store}
        meta={[shownCategory(post.store.category), ago(post.created_at)].filter(Boolean).join(" · ")}
        action={
          <Link href={storeHref(post.store.slug)} className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)" }}>
            Visit
          </Link>
        }
      />

      <Media post={post} onDoubleTap={() => !post.liked && like(true)} />

      {/* Shop bar */}
      <Link href={href} className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold sm:rounded-b-lg sm:px-3" style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>
        <ShoppingBag className="h-4 w-4" />
        <span className="font-black">{formatPrice(post.price)}</span>
        {post.compare_price && <span className="text-xs line-through" style={{ color: "var(--text-muted)" }}>{formatPrice(post.compare_price)}</span>}
        {lowStock && <span className="text-xs font-bold text-red-600">Only {post.stock} left</span>}
        <span className="ml-auto flex items-center gap-1 text-xs font-bold" style={{ color: "var(--accent-dark, var(--text-primary))" }}>Shop now ›</span>
      </Link>

      {/* Actions */}
      <div className="flex items-center gap-1 px-1.5 pt-1.5 sm:px-0">
        <button type="button" onClick={() => like(!post.liked)} aria-pressed={post.liked} aria-label={post.liked ? "Unlike" : "Like"} className="rounded-full p-2 transition-transform active:scale-90">
          <Heart className={`h-6 w-6 ${post.liked ? "fill-red-500 text-red-500" : ""}`} style={post.liked ? undefined : { color: "var(--text-primary)" }} />
        </button>
        <button type="button" onClick={share} aria-label="Share" className="rounded-full p-2 active:scale-90">
          <Send className="h-6 w-6" style={{ color: "var(--text-primary)" }} />
        </button>
        <button type="button" onClick={save} aria-pressed={saved} aria-label={saved ? "Remove from saved" : "Save"} className="ml-auto rounded-full p-2 active:scale-90">
          <Bookmark className={`h-6 w-6 ${saved ? "fill-current" : ""}`} style={{ color: "var(--text-primary)" }} />
        </button>
      </div>

      <div className="space-y-1 px-3 sm:px-0">
        {post.likes > 0 && (
          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            {post.likes.toLocaleString()} {post.likes === 1 ? "like" : "likes"}
          </p>
        )}
        <p className="text-sm leading-snug" style={{ color: "var(--text-primary)" }}>
          <Link href={storeHref(post.store.slug)} className="mr-1.5 font-bold">{post.store.name}</Link>
          <Link href={href} className="font-semibold">{post.name}</Link>
          {post.caption && (
            <>
              {" "}
              <span className={open ? "" : "line-clamp-2"} style={{ color: "var(--text-secondary)" }}>
                {post.caption}
              </span>
              {!open && post.caption.length > 90 && (
                <button type="button" onClick={() => setOpen(true)} className="text-sm" style={{ color: "var(--text-muted)" }}>
                  more
                </button>
              )}
            </>
          )}
        </p>
        {post.category && <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>{hashtag(post.category)}</p>}
      </div>
    </article>
  );
}

/* ──────────────────────────── Store spotlight ────────────────────────────── */

function StorePostCard({ post }: { post: StorePost }) {
  const s = post.store;
  return (
    <article className="border-b px-3 pb-5 pt-3 sm:rounded-xl sm:border sm:px-4" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        <Sparkles className="h-3.5 w-3.5 text-amber-500" /> New on Duka
      </p>
      <div className="flex items-center gap-3">
        <Avatar name={s.name} logo={s.logo} size={56} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 font-bold" style={{ color: "var(--text-primary)" }}>
            <span className="truncate">{s.name}</span>
            {s.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-sky-500" aria-label="Verified seller" />}
          </p>
          <p className="truncate text-xs" style={{ color: "var(--text-muted)" }}>
            {[shownCategory(s.category), `${s.product_count} products`, `joined ${ago(s.created_at)} ago`].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
      {s.description && <p className="mt-2 line-clamp-2 text-sm" style={{ color: "var(--text-secondary)" }}>{s.description}</p>}
      <div className="mt-3 grid grid-cols-3 gap-1">
        {post.products.map((p) => (
          <Link key={p.id} href={productHref(s.slug, p.slug || p.id)} className="group relative aspect-square overflow-hidden rounded-md" style={{ background: "var(--bg-tertiary)" }}>
            <Image src={p.image} alt={p.name} fill sizes="160px" className="object-cover transition-transform group-hover:scale-105" />
            <span className="absolute bottom-1 left-1 rounded bg-black/65 px-1.5 py-0.5 text-[11px] font-bold text-white">{formatPrice(p.price)}</span>
          </Link>
        ))}
      </div>
      <Link href={storeHref(s.slug)} className="mt-3 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold" style={{ background: "var(--accent)", color: "#000" }}>
        <StoreIcon className="h-4 w-4" /> Visit {s.name}
      </Link>
    </article>
  );
}

/* ──────────────────────────────── Reel post ──────────────────────────────── */

function ReelPostCard({ post }: { post: ReelPost }) {
  const href = `/store/${post.store.slug}/reels/${post.id}`;
  return (
    <article className="border-b pb-4 sm:rounded-xl sm:border sm:px-4" style={{ borderColor: "var(--border)", background: "var(--bg)" }}>
      <PostHeader store={post.store} meta={`Reel${post.views ? ` · ${compact(post.views)} views` : ""}`} />
      <Link href={href} className="relative block aspect-[4/5] overflow-hidden sm:rounded-lg" style={{ background: "#000" }}>
        {post.thumbnail && <Image src={post.thumbnail} alt={post.title ?? `Reel by ${post.store.name}`} fill sizes="(max-width: 640px) 100vw, 470px" className="object-cover opacity-90" />}
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
            <Play className="ml-1 h-8 w-8 fill-white text-white" />
          </span>
        </span>
      </Link>
      {post.title && (
        <p className="px-3 pt-2.5 text-sm sm:px-0" style={{ color: "var(--text-primary)" }}>
          <span className="mr-1.5 font-bold">{post.store.name}</span>
          {post.title}
        </p>
      )}
    </article>
  );
}

/* ─────────────────────────────────── Feed ─────────────────────────────────── */

function PostSkeleton() {
  return (
    <div className="animate-pulse space-y-3 pb-4 sm:rounded-xl sm:border sm:p-4" style={{ borderColor: "var(--border)" }} aria-hidden>
      <div className="flex items-center gap-3 px-3 sm:px-0">
        <div className="h-9 w-9 rounded-full" style={{ background: "var(--bg-tertiary)" }} />
        <div className="h-3 w-32 rounded" style={{ background: "var(--bg-tertiary)" }} />
      </div>
      <div className="aspect-[4/5]" style={{ background: "var(--bg-tertiary)" }} />
      <div className="h-3 w-2/3 rounded mx-3 sm:mx-0" style={{ background: "var(--bg-tertiary)" }} />
    </div>
  );
}

export default function DiscoverFeed({ category, q, onEmptyReset }: { category: string; q: string; onEmptyReset?: () => void }) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const req = useRef(0);
  const sentinel = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (nextPage: number, reset: boolean) => {
      const id = ++req.current;
      setLoading(true);
      setError(false);
      const params = new URLSearchParams({ page: String(nextPage) });
      if (category && category !== "all") params.set("category", category);
      if (q.trim()) params.set("q", q.trim());
      const v = visitorId();
      if (v) params.set("v", v);
      try {
        const res = await fetch(`/api/discover/feed?${params}`);
        if (!res.ok) throw new Error();
        const data: { posts: FeedPost[]; hasMore: boolean } = await res.json();
        if (id !== req.current) return;
        setPosts((prev) => {
          const base = reset ? [] : prev;
          const seen = new Set(base.map((p) => p.key));
          return [...base, ...data.posts.filter((p) => !seen.has(p.key))];
        });
        setPage(nextPage);
        setHasMore(data.hasMore);
      } catch {
        if (id === req.current) setError(true);
      } finally {
        if (id === req.current) setLoading(false);
      }
    },
    [category, q],
  );

  // New filters: start over
  useEffect(() => {
    setPosts([]);
    setHasMore(true);
    load(1, true);
  }, [load]);

  // Infinite scroll
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasMore && !loading && !error && page > 0) load(page + 1, false);
    }, { rootMargin: "1200px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, error, page, load]);

  if (!loading && !error && posts.length === 0 && page > 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-4xl">🛍️</p>
        <p className="mt-3 font-bold" style={{ color: "var(--text-primary)" }}>Nothing here yet</p>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          {q ? `No posts match "${q}".` : "No products in this category yet."}
        </p>
        {onEmptyReset && (
          <button type="button" onClick={onEmptyReset} className="mt-4 rounded-full px-4 py-2 text-sm font-bold" style={{ background: "var(--accent)", color: "#000" }}>
            Show everything
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="-mx-4 space-y-0 sm:mx-0 sm:space-y-5">
      {posts.map((p) =>
        p.type === "product" ? <ProductPostCard key={p.key} post={p} /> : p.type === "store" ? <StorePostCard key={p.key} post={p} /> : <ReelPostCard key={p.key} post={p} />,
      )}
      {loading && (
        <>
          <PostSkeleton />
          {posts.length === 0 && <PostSkeleton />}
        </>
      )}
      {error && (
        <div className="py-8 text-center">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Couldn&apos;t load more posts.</p>
          <button type="button" onClick={() => load(page + 1 || 1, page === 0)} className="mt-2 text-sm font-bold underline" style={{ color: "var(--text-primary)" }}>
            Try again
          </button>
        </div>
      )}
      {!hasMore && posts.length > 0 && (
        <p className="py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          You&apos;re all caught up ✨
        </p>
      )}
      <div ref={sentinel} aria-hidden className="h-px" />
    </div>
  );
}
