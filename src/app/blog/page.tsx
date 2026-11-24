import type { Metadata } from "next";
import BlogIndexView from "@/components/blog/BlogIndexView";
import { categoryCounts, isBlogCategory, listPublished } from "@/lib/blog";
import { getAppUrl } from "@/lib/paystack";

export const dynamic = "force-dynamic";

const TITLE = "The Duka Blog: tips to sell more online in Nigeria";
const DESCRIPTION = "Practical guides, selling tips and stories for Nigerian businesses selling online with Duka: payments, WhatsApp marketing, delivery and growing your store.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/blog" },
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website", url: "/blog" },
};

type SP = Promise<{ category?: string; q?: string; page?: string }>;

export default async function BlogIndex({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const category = isBlogCategory(sp.category) ? sp.category : null;
  const q = (sp.q ?? "").trim().slice(0, 80) || null;
  const page = Math.max(1, Number(sp.page) || 1);
  const [{ posts, total, featured }, counts] = await Promise.all([
    listPublished({ category, q, page }).catch(() => ({ posts: [], total: 0, featured: null })),
    categoryCounts().catch(() => ({} as Record<string, number>)),
  ]);
  return <BlogIndexView posts={posts} total={total} featured={featured} counts={counts} category={category} q={q} page={page} appUrl={getAppUrl()} description={DESCRIPTION} />;
}
