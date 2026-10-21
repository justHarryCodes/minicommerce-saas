import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import RichText from "@/components/storefront/RichText";
import StorefrontFooter from "@/components/storefront/StorefrontFooter";
import { loadStoreChrome } from "@/lib/storefront-page";
import { blogEnabled, publishedPage } from "@/lib/store-pages";
import { plainText } from "@/lib/rich-text";

interface Props {
  params: Promise<{ slug: string; postSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, postSlug } = await params;
  const ctx = await loadStoreChrome(slug);
  if (!ctx || !(await blogEnabled(ctx.store.id))) return {};
  const post = await publishedPage(ctx.store.id, "post", postSlug);
  if (!post) return {};
  const description = post.excerpt || plainText(post.body);
  return {
    title: post.title,
    description,
    openGraph: {
      type: "article",
      title: post.title,
      description,
      publishedTime: post.published_at ? new Date(post.published_at).toISOString() : undefined,
      images: post.cover_url ? [post.cover_url] : ctx.store.logo_url ? [ctx.store.logo_url] : [],
    },
    twitter: { card: post.cover_url ? "summary_large_image" : "summary", title: post.title, description },
  };
}

export default async function BlogPost({ params }: Props) {
  const { slug, postSlug } = await params;
  const ctx = await loadStoreChrome(slug);
  if (!ctx || !(await blogEnabled(ctx.store.id))) notFound();
  const post = await publishedPage(ctx.store.id, "post", postSlug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    datePublished: post.published_at ? new Date(post.published_at).toISOString() : undefined,
    image: post.cover_url ?? undefined,
    publisher: { "@type": "Organization", name: ctx.store.name },
  };

  return (
    <>
      <article className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <Link href={`${ctx.storeBase}/blog`} className="inline-flex items-center gap-1 text-sm text-surface-500 hover:text-surface-900 dark:hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Blog
        </Link>
        {post.published_at && <p className="mt-6 text-xs font-medium uppercase tracking-wider text-surface-400">{format(new Date(post.published_at), "d MMMM yyyy")}</p>}
        <h1 className="sf-display mt-2 text-3xl font-bold text-surface-900 dark:text-white sm:text-4xl">{post.title}</h1>
        {post.cover_url && (
          <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-[var(--sf-radius,1rem)] bg-surface-100 dark:bg-surface-800">
            <Image src={post.cover_url} alt="" fill sizes="(min-width: 672px) 672px, 100vw" className="object-cover" priority />
          </div>
        )}
        <RichText source={post.body} className="mt-8" />
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <StorefrontFooter store={ctx.store} theme={ctx.theme} storeBase={ctx.storeBase} categories={ctx.topCategories} pageLinks={ctx.footerLinks} />
    </>
  );
}
