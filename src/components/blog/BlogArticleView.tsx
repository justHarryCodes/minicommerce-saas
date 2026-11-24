import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, ChevronRight, Clock, Tag } from "lucide-react";
import HomeNav from "@/app/HomeNav";
import Footer from "@/components/Footer";
import { AuthorAvatar, BlogBody, BlogCard, BlogCover, CategoryBadge, ImageCredit } from "@/components/blog/BlogParts";
import { parseInline } from "@/lib/rich-text";
import { ReadingProgress, ShareBar, TocNav, ViewBeacon } from "@/components/blog/BlogClient";
import { blogCategory, blogExcerpt, formatBlogDate, parseArticle, tableOfContents, type BlogCardPost, type BlogPost } from "@/lib/blog-shared";


/** One article page, drawn from already-loaded data. */
export default function BlogArticleView({ post, related, appUrl }: { post: BlogPost; related: BlogCardPost[]; appUrl: string }) {
  const blocks = parseArticle(post.body);
  const toc = tableOfContents(blocks);
  const cat = blogCategory(post.category);
  const url = `${appUrl}/blog/${post.slug}`;
  const updated = post.published_at && new Date(post.updated_at).getTime() - new Date(post.published_at).getTime() > 86_400_000;

  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: blogExcerpt(post, 160),
      ...(post.cover_url ? { image: [post.cover_url] } : {}),
      datePublished: post.published_at,
      dateModified: post.updated_at,
      author: { "@type": "Person", name: post.author_name },
      publisher: { "@type": "Organization", name: "Duka", logo: { "@type": "ImageObject", url: `${appUrl}/logo.png` } },
      mainEntityOfPage: url,
      articleSection: cat.label,
      keywords: post.tags.join(", "),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Blog", item: `${appUrl}/blog` },
        { "@type": "ListItem", position: 2, name: cat.label, item: `${appUrl}/blog?category=${cat.id}` },
        { "@type": "ListItem", position: 3, name: post.title, item: url },
      ],
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <ReadingProgress />
      <ViewBeacon slug={post.slug} />
      <HomeNav />

      {/* ═════════════ HEADER ═════════════ */}
      <header className="relative overflow-hidden px-4 pb-8 pt-10 sm:pt-16">
        <div className="pointer-events-none absolute left-1/2 top-[-200px] h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-amber-400 opacity-[0.1] blur-3xl" aria-hidden />
        <div className="relative mx-auto max-w-3xl">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] font-medium" style={{ color: "var(--text-muted)" }}>
            <Link href="/blog" className="hover:text-amber-600">Blog</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href={`/blog?category=${cat.id}`} className="hover:text-amber-600">{cat.label}</Link>
          </nav>
          <div className="mt-5"><CategoryBadge id={post.category} link size="md" /></div>
          <h1 className="mt-4 text-[2.1rem] font-bold leading-[1.12] tracking-tight sm:text-5xl" style={{ color: "var(--text-primary)" }}>{post.title}</h1>
          {post.excerpt && <p className="mt-5 text-lg leading-relaxed sm:text-xl" style={{ color: "var(--text-secondary)" }}>{post.excerpt}</p>}
          <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-y py-4" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-3">
              <AuthorAvatar name={post.author_name} size={44} />
              <div>
                <p className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>{post.author_name}</p>
                <p className="flex flex-wrap items-center gap-x-2.5 text-[13px]" style={{ color: "var(--text-muted)" }}>
                  {post.author_role && <span>{post.author_role}</span>}
                  <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {formatBlogDate(post.published_at)}</span>
                  <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {post.reading_minutes} min read</span>
                </p>
              </div>
            </div>
            <div className="lg:hidden"><ShareBar url={url} title={post.title} /></div>
          </div>
        </div>
      </header>

      {/* Cover */}
      <div className="mx-auto max-w-5xl px-4">
        {post.cover_url ? (
          <div className="relative aspect-[16/8] overflow-hidden rounded-[28px] border" style={{ borderColor: "var(--border)" }}>
            <Image src={post.cover_url} alt={post.title} fill priority sizes="(min-width: 1024px) 1024px, 100vw" className="object-cover" />
          </div>
        ) : (
          <BlogCover post={post} sizes="1024px" className="aspect-[16/5] rounded-[28px]" />
        )}
        {post.cover_url && post.cover_credit && <ImageCredit nodes={parseInline(post.cover_credit)} className="mt-2 px-1 text-right" />}
      </div>

      {/* ═════════════ BODY ═════════════ */}
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[56px_minmax(0,720px)_1fr] lg:gap-12">
        <aside className="hidden lg:block">
          <div className="sticky top-28"><ShareBar url={url} title={post.title} vertical /></div>
        </aside>

        <article id="article" className="min-w-0">
          <BlogBody blocks={blocks} />

          {updated && <p className="mt-10 text-sm italic" style={{ color: "var(--text-muted)" }}>Updated {formatBlogDate(post.updated_at)}</p>}

          {post.tags.length > 0 && (
            <div className="mt-10 flex flex-wrap items-center gap-2">
              <Tag className="h-4 w-4" style={{ color: "var(--text-muted)" }} />
              {post.tags.map((t) => (
                <Link key={t} href={`/blog?q=${encodeURIComponent(t)}`} className="rounded-full border px-3 py-1 text-[13px] font-medium hover:border-amber-400" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>#{t}</Link>
              ))}
            </div>
          )}

          {/* Author + share */}
          <div className="mt-10 flex flex-col gap-5 rounded-3xl border p-6 sm:flex-row sm:items-center" style={{ borderColor: "var(--border)" }}>
            <AuthorAvatar name={post.author_name} size={56} />
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Written by</p>
              <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{post.author_name}</p>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{post.author_role || "Helping Nigerian businesses sell online with Duka."}</p>
            </div>
            <div><p className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Share this</p><ShareBar url={url} title={post.title} /></div>
          </div>

          {/* CTA */}
          <div className="relative mt-8 overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 p-7 text-zinc-950 sm:p-9">
            <Image src="/logo-mark.png" alt="" width={100} height={157} className="pointer-events-none absolute -bottom-6 right-6 h-40 w-auto rotate-[-10deg] opacity-25 brightness-0" aria-hidden />
            <p className="relative text-2xl font-bold tracking-tight sm:text-3xl">Ready to start selling?</p>
            <p className="relative mt-2 max-w-md text-zinc-900/80">Your own store link, payments straight to your bank and WhatsApp selling, live in minutes.</p>
            <Link href="/auth/signup" className="relative mt-6 inline-flex items-center gap-2 rounded-full bg-zinc-950 px-6 py-3 text-sm font-bold text-white hover:bg-zinc-800">Create your free store <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </article>

        <aside className="hidden lg:block">
          <div className="sticky top-28"><TocNav items={toc} /></div>
        </aside>
      </div>

      {/* ═════════════ RELATED ═════════════ */}
      {related.length > 0 && (
        <section className="border-t px-4 py-14" style={{ borderColor: "var(--border)" }}>
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex items-end justify-between gap-3">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: "var(--text-primary)" }}>Keep reading</h2>
              <Link href="/blog" className="inline-flex items-center gap-1 text-sm font-semibold text-amber-600 hover:underline">All articles <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{related.map((p) => <BlogCard key={p.id} post={p} />)}</div>
          </div>
        </section>
      )}

      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
    </div>
  );
}
