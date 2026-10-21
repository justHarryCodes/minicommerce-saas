import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { format } from "date-fns";
import StorefrontFooter from "@/components/storefront/StorefrontFooter";
import { loadStoreChrome } from "@/lib/storefront-page";
import { publishedPosts } from "@/lib/store-pages";
import { plainText } from "@/lib/rich-text";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const ctx = await loadStoreChrome(slug);
  if (!ctx) return {};
  return { title: "Blog", description: `News and stories from ${ctx.store.name}` };
}

export default async function BlogIndex({ params }: Props) {
  const { slug } = await params;
  const ctx = await loadStoreChrome(slug);
  if (!ctx) notFound();
  const posts = await publishedPosts(ctx.store.id);

  return (
    <>
      <section className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
        <h1 className="sf-display text-3xl font-bold text-surface-900 dark:text-white sm:text-4xl">Blog</h1>
        <p className="mt-2 text-surface-500 dark:text-surface-400">News and stories from {ctx.store.name}</p>

        {posts.length === 0 ? (
          <p className="mt-12 text-surface-500 dark:text-surface-400">No posts yet — check back soon.</p>
        ) : (
          <div className="mt-10 grid gap-[var(--sf-gap,1.5rem)] sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <Link key={p.id} href={`${ctx.storeBase}/blog/${p.slug}`} className="group block">
                <div className="relative aspect-[16/10] overflow-hidden rounded-[var(--sf-radius,1rem)] bg-surface-100 dark:bg-surface-800">
                  {p.cover_url ? (
                    <Image src={p.cover_url} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center sf-display text-4xl text-surface-300 dark:text-surface-600">{p.title.slice(0, 1)}</div>
                  )}
                </div>
                {p.published_at && <p className="mt-3 text-xs font-medium uppercase tracking-wider text-surface-400">{format(new Date(p.published_at), "d MMMM yyyy")}</p>}
                <h2 className="sf-display mt-1 text-lg font-bold text-surface-900 group-hover:underline dark:text-white">{p.title}</h2>
                <p className="mt-1 line-clamp-3 text-sm text-surface-600 dark:text-surface-400">{p.excerpt || plainText(p.body, 180)}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
      <StorefrontFooter store={ctx.store} theme={ctx.theme} storeBase={ctx.storeBase} categories={ctx.topCategories} pageLinks={ctx.footerLinks} />
    </>
  );
}
