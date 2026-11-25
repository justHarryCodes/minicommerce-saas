import { notFound } from "next/navigation";
import type { Metadata } from "next";
import BlogArticleView from "@/components/blog/BlogArticleView";
import { blogCategory, blogExcerpt, getPublishedPost, relatedPosts } from "@/lib/blog";
import { getAppUrl } from "@/lib/paystack";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const post = await getPublishedPost((await params).slug).catch(() => null);
  if (!post) return { title: "Article not found · Duka Blog" };
  const title = post.seo_title || post.title;
  const description = post.seo_description || blogExcerpt(post, 160);
  const url = `/blog/${post.slug}`;
  // The branded share card (title, category, cover photo, Duka logo), 1200x630 JPEG.
  // ?v changes when the post is edited, so apps fetch the new card instead of a cached one.
  const card = {
    url: `/api/og/blog/${post.slug}?v=${encodeURIComponent(new Date(post.updated_at).getTime().toString(36))}`,
    width: 1200,
    height: 630,
    type: "image/jpeg",
    alt: post.title,
  };
  return {
    title: `${title} · Duka Blog`,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
      authors: [post.author_name],
      section: blogCategory(post.category).label,
      tags: post.tags,
      siteName: "Duka",
      locale: "en_NG",
      images: [card],
    },
    twitter: { card: "summary_large_image", title, description, images: [{ url: card.url, alt: card.alt }] },
  };
}

export default async function BlogArticle({ params }: { params: Params }) {
  // A database error throws (error page, retried on reload) rather than
  // answering 404, so a brief outage never tells Google the article is gone.
  const post = await getPublishedPost((await params).slug);
  if (!post) notFound();
  const related = await relatedPosts(post).catch(() => []);
  return <BlogArticleView post={post} related={related} appUrl={getAppUrl()} />;
}
