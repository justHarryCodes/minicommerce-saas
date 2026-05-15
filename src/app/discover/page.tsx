import { query } from "@/lib/db";
import DiscoverClient from "./DiscoverClient";

interface DiscoverPageProps {
  searchParams: Promise<{ category?: string; q?: string }>;
}

export const metadata = {
  title: "Discover Stores",
  description: "Browse verified vendors on Duka across fashion, electronics, food, and more.",
};

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  const { category, q } = await searchParams;

  const params: unknown[] = [];
  let whereClause = "WHERE is_active = true";

  if (category && category !== "all") {
    params.push(category);
    whereClause += ` AND primary_category = $${params.length}`;
  }

  const [stores, categoryCounts] = await Promise.all([
    query<{
      id: string;
      name: string;
      slug: string;
      description: string | null;
      logo_url: string | null;
      primary_category: string | null;
      created_at: string;
    }>(
      `SELECT id, name, slug, description, logo_url, primary_category, created_at
       FROM stores ${whereClause}
       ORDER BY created_at DESC`,
      params
    ),
    query<{ primary_category: string; count: string }>(
      `SELECT primary_category, COUNT(*) as count
       FROM stores
       WHERE is_active = true AND primary_category IS NOT NULL
       GROUP BY primary_category
       ORDER BY count DESC`,
      []
    ),
  ]);

  const totalCount = categoryCounts.reduce((sum, c) => sum + parseInt(c.count), 0);

  return (
    <DiscoverClient
      stores={stores}
      categoryCounts={categoryCounts}
      activeCategory={category ?? "all"}
      initialSearch={q ?? ""}
      totalCount={totalCount}
    />
  );
}
