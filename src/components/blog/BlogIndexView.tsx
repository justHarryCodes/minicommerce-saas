import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Newspaper, Search, X } from "lucide-react";
import HomeNav from "@/app/HomeNav";
import Footer from "@/components/Footer";
import { BlogCard, CATEGORY_ICON, FeaturedPost } from "@/components/blog/BlogParts";
import { BLOG_CATEGORIES, blogCategory, type BlogCardPost, type BlogCategoryId } from "@/lib/blog-shared";


const BLOG_PAGE_SIZE = 9;

export interface BlogIndexData {
  posts: BlogCardPost[];
  total: number;
  featured: BlogCardPost | null;
  counts: Record<string, number>;
  category: BlogCategoryId | null;
  q: string | null;
  page: number;
  /** For structured data */
  appUrl: string;
  description: string;
}

/** The blog's home page (dukanigeria.com/blog), drawn from already-loaded data. */
export default function BlogIndexView({ posts, total, featured, counts, category, q, page, appUrl, description }: BlogIndexData) {
  const allCount = Object.values(counts).reduce((a, b) => a + b, 0);
  const pages = Math.max(1, Math.ceil(total / BLOG_PAGE_SIZE));
  const filtered = !!(category || q);
  const cat = category ? blogCategory(category) : null;
  const link = (o: { category?: string | null; q?: string | null; page?: number }) => {
    const u = new URLSearchParams();
    if (o.category) u.set("category", o.category);
    if (o.q) u.set("q", o.q);
    if (o.page && o.page > 1) u.set("page", String(o.page));
    const s = u.toString();
    return s ? `/blog?${s}` : "/blog";
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <HomeNav />

      {/* ═════════════ HERO ═════════════ */}
      <section className="relative overflow-hidden px-4 pb-10 pt-14 sm:pt-20">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute left-1/2 top-[-160px] h-[460px] w-[900px] -translate-x-1/2 rounded-full bg-amber-400 opacity-[0.14] blur-3xl" />
          <div className="absolute inset-0 opacity-[0.5] [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" />
        </div>
        <div className="relative mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[13px] font-semibold" style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "var(--bg)" }}>
            <Newspaper className="h-4 w-4 text-amber-500" /> The Duka Blog
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl" style={{ color: "var(--text-primary)" }}>
            Ideas to grow your <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">business online</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg" style={{ color: "var(--text-secondary)" }}>
            Practical guides, selling tips and real stories for Nigerian sellers. Learn something new, then put it to work in your store.
          </p>
          <form action="/blog" className="mx-auto mt-8 flex max-w-lg items-center gap-2 rounded-2xl border p-1.5 shadow-sm focus-within:border-amber-400" style={{ borderColor: "var(--border)", background: "var(--bg)" }} role="search">
            {category && <input type="hidden" name="category" value={category} />}
            <Search className="ml-2.5 h-5 w-5 shrink-0" style={{ color: "var(--text-muted)" }} />
            <input name="q" defaultValue={q ?? ""} placeholder="Search articles, e.g. WhatsApp, delivery…" aria-label="Search articles" className="min-w-0 flex-1 border-0 bg-transparent px-1 py-2 text-[15px] outline-none focus:ring-0" style={{ color: "var(--text-primary)" }} />
            <button type="submit" className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-zinc-900">Search</button>
          </form>
        </div>
      </section>

      {/* ═════════════ CATEGORIES ═════════════ */}
      <nav aria-label="Categories" className="sticky top-16 z-30 border-y backdrop-blur" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--bg) 88%, transparent)" }}>
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link href={link({ q })} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${!category ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "border hover:border-amber-400"}`} style={category ? { borderColor: "var(--border)", color: "var(--text-secondary)" } : undefined}>
            <BookOpen className="h-4 w-4" /> All {allCount > 0 && <span className="opacity-60">{allCount}</span>}
          </Link>
          {BLOG_CATEGORIES.map((c) => {
            const Icon = CATEGORY_ICON[c.id];
            const on = category === c.id;
            return (
              <Link key={c.id} href={link({ category: c.id, q })} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${on ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "border hover:border-amber-400"}`} style={on ? undefined : { borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                <Icon className="h-4 w-4" /> {c.label} {counts[c.id] ? <span className="opacity-60">{counts[c.id]}</span> : null}
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        {/* Featured */}
        {featured && !filtered && page === 1 && <div className="mb-14"><FeaturedPost post={featured} /></div>}

        {/* Section heading */}
        {(posts.length > 0 || filtered) && (
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: "var(--text-primary)" }}>
                {q ? <>Results for &ldquo;{q}&rdquo;</> : cat ? cat.label : "Latest articles"}
              </h2>
              <p className="mt-1 text-[15px]" style={{ color: "var(--text-muted)" }}>
                {cat && !q ? cat.blurb : `${total} article${total === 1 ? "" : "s"}`}
              </p>
            </div>
            {filtered && (
              <Link href="/blog" className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold hover:border-amber-400" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                <X className="h-4 w-4" /> Clear filters
              </Link>
            )}
          </div>
        )}

        {posts.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => <BlogCard key={p.id} post={p} />)}
          </div>
        ) : filtered ? (
          <div className="rounded-3xl border border-dashed px-6 py-16 text-center" style={{ borderColor: "var(--border)" }}>
            <Search className="mx-auto h-10 w-10 text-amber-500" />
            <p className="mt-4 text-lg font-semibold" style={{ color: "var(--text-primary)" }}>No articles found</p>
            <p className="mt-1" style={{ color: "var(--text-muted)" }}>Try a different word or browse all articles.</p>
            <Link href="/blog" className="mt-6 inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900">See all articles</Link>
          </div>
        ) : !featured ? (
          <div className="relative overflow-hidden rounded-[28px] border px-6 py-16 text-center sm:py-20" style={{ borderColor: "var(--border)" }}>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-50 via-transparent to-orange-50 dark:from-amber-500/10 dark:to-orange-500/5" aria-hidden />
            <div className="relative">
              <span className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-zinc-900 shadow-xl dark:bg-white/10">
                <Image src="/logo-mark.png" alt="" width={30} height={47} className="h-11 w-auto" />
              </span>
              <h2 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: "var(--text-primary)" }}>Our first stories are on the way</h2>
              <p className="mx-auto mt-2 max-w-md" style={{ color: "var(--text-secondary)" }}>We&apos;re writing practical guides on getting paid, WhatsApp selling, delivery and growing your store. Check back soon.</p>
              <div className="mx-auto mt-8 flex max-w-xl flex-wrap justify-center gap-2">
                {BLOG_CATEGORIES.map((c) => {
                  const Icon = CATEGORY_ICON[c.id];
                  return <span key={c.id} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium" style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "var(--bg)" }}><Icon className="h-3.5 w-3.5 text-amber-500" /> {c.label}</span>;
                })}
              </div>
            </div>
          </div>
        ) : null}

        {/* Pagination */}
        {pages > 1 && (
          <nav aria-label="Pages" className="mt-12 flex items-center justify-center gap-2">
            {page > 1 ? (
              <Link href={link({ category, q, page: page - 1 })} className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold hover:border-amber-400" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}><ArrowLeft className="h-4 w-4" /> Newer</Link>
            ) : <span />}
            {Array.from({ length: pages }, (_, i) => i + 1).slice(Math.max(0, page - 3), page + 2).map((n) => (
              <Link key={n} href={link({ category, q, page: n })} aria-current={n === page ? "page" : undefined} className={`grid h-10 w-10 place-items-center rounded-full text-sm font-semibold ${n === page ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "border hover:border-amber-400"}`} style={n === page ? undefined : { borderColor: "var(--border)", color: "var(--text-secondary)" }}>{n}</Link>
            ))}
            {page < pages && (
              <Link href={link({ category, q, page: page + 1 })} className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold hover:border-amber-400" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>Older <ArrowRight className="h-4 w-4" /></Link>
            )}
          </nav>
        )}

        {/* CTA */}
        <section className="relative mt-20 overflow-hidden rounded-[28px] bg-zinc-950 px-6 py-12 text-white sm:px-12">
          <div className="pointer-events-none absolute -right-10 -top-24 h-72 w-72 rounded-full bg-amber-500 opacity-30 blur-3xl" aria-hidden />
          <Image src="/logo-mark.png" alt="" width={140} height={220} className="pointer-events-none absolute -bottom-10 right-8 hidden h-56 w-auto rotate-[-10deg] opacity-20 sm:block" aria-hidden />
          <div className="relative max-w-xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Turn these tips into sales.</h2>
            <p className="mt-3 text-zinc-300">Create your Duka store in minutes: your own link, checkout that collects payment, delivery and WhatsApp selling built in.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/auth/signup" className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-bold text-zinc-950 hover:bg-amber-300">Start free <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/pricing" className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-semibold hover:bg-white/10">See pricing</Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "Blog", name: "The Duka Blog", url: `${appUrl}/blog`, description }).replace(/</g, "\\u003c") }} />
    </div>
  );
}
