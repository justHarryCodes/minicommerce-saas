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
      ...(post.cover_url ? { images: [{ url: post.cover_url, width: 1200, height: 630, alt: post.title }] } : {}),
    },
    twitter: { card: "summary_large_image", title, description, ...(post.cover_url ? { images: [post.cover_url] } : {}) },
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
