// Duka blog (dukanigeria.com/blog): reading for the public pages, writing for
// the admin. See lib/blog-shared for the post format.
import { query, queryOne } from "./db";
import { blogSlug, readingMinutes, type BlogCardPost, type BlogCategoryId, type BlogPost, type BlogStatus } from "./blog-shared";

export * from "./blog-shared";

/* The table is created by migrations/platform_blog.sql; this makes the blog
   work even before that migration has run on a server (idempotent, once). */
let ready: Promise<void> | null = null;
export function ensureBlogTable(): Promise<void> {
  ready ??= (async () => {
    await query(`CREATE TABLE IF NOT EXISTS platform_blog_posts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, excerpt TEXT,
      body TEXT NOT NULL DEFAULT '', cover_url TEXT, category TEXT NOT NULL DEFAULT 'guides', tags TEXT[] NOT NULL DEFAULT '{}',
      author_name TEXT NOT NULL DEFAULT 'Duka Team', author_role TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')), featured BOOLEAN NOT NULL DEFAULT false,
      seo_title TEXT, seo_description TEXT, reading_minutes INTEGER NOT NULL DEFAULT 1, views INTEGER NOT NULL DEFAULT 0,
      published_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await query(`ALTER TABLE platform_blog_posts ADD COLUMN IF NOT EXISTS cover_credit TEXT`);
    await query(`CREATE INDEX IF NOT EXISTS idx_platform_blog_posts_public ON platform_blog_posts(status, published_at DESC)`);
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

const CARD_COLS = `id, slug, title, excerpt, cover_url, category, author_name, author_role, reading_minutes, published_at, featured, tags`;
const LIVE = `status = 'published' AND published_at <= NOW()`;

export const BLOG_PAGE_SIZE = 9;

/* ───────────────────────── Public ───────────────────────── */

export async function listPublished(opts: { category?: string | null; q?: string | null; page?: number } = {}): Promise<{ posts: BlogCardPost[]; total: number; featured: BlogCardPost | null }> {
  await ensureBlogTable();
  const where = [LIVE];
  const params: unknown[] = [];
  if (opts.category) { params.push(opts.category); where.push(`category = $${params.length}`); }
  if (opts.q) {
    params.push(`%${opts.q.replace(/[%_\\]/g, "").slice(0, 80)}%`);
    where.push(`(title ILIKE $${params.length} OR excerpt ILIKE $${params.length} OR $${params.length} ILIKE ANY(tags))`);
  }
  const page = Math.max(1, Math.min(100, opts.page ?? 1));
  const [rows, count, featured] = await Promise.all([
    query<BlogCardPost>(
      `SELECT ${CARD_COLS} FROM platform_blog_posts WHERE ${where.join(" AND ")} ORDER BY published_at DESC LIMIT ${BLOG_PAGE_SIZE} OFFSET ${(page - 1) * BLOG_PAGE_SIZE}`,
      params,
    ),
    queryOne<{ n: number }>(`SELECT COUNT(*)::int AS n FROM platform_blog_posts WHERE ${where.join(" AND ")}`, params),
    !opts.category && !opts.q && page === 1
      ? queryOne<BlogCardPost>(`SELECT ${CARD_COLS} FROM platform_blog_posts WHERE ${LIVE} ORDER BY featured DESC, published_at DESC LIMIT 1`)
      : Promise.resolve(null),
  ]);
  return { posts: featured ? rows.filter((p) => p.id !== featured.id) : rows, total: count?.n ?? 0, featured };
}

export async function getPublishedPost(slug: string): Promise<BlogPost | null> {
  await ensureBlogTable();
  if (!/^[a-z0-9-]{1,100}$/.test(slug)) return null;
  return queryOne<BlogPost>(`SELECT * FROM platform_blog_posts WHERE slug = $1 AND ${LIVE}`, [slug]);
}

/** Up to 3 others: same category first, then the newest. */
export async function relatedPosts(post: Pick<BlogPost, "id" | "category">): Promise<BlogCardPost[]> {
  return query<BlogCardPost>(
    `SELECT ${CARD_COLS} FROM platform_blog_posts WHERE ${LIVE} AND id <> $1 ORDER BY (category = $2) DESC, published_at DESC LIMIT 3`,
    [post.id, post.category],
  );
}

export async function categoryCounts(): Promise<Record<string, number>> {
  await ensureBlogTable();
  const rows = await query<{ category: string; n: number }>(`SELECT category, COUNT(*)::int AS n FROM platform_blog_posts WHERE ${LIVE} GROUP BY category`);
  return Object.fromEntries(rows.map((r) => [r.category, r.n]));
}

export async function publishedSlugs(): Promise<{ slug: string; updated_at: string }[]> {
  await ensureBlogTable().catch(() => {});
  return query<{ slug: string; updated_at: string }>(`SELECT slug, updated_at FROM platform_blog_posts WHERE ${LIVE} ORDER BY published_at DESC LIMIT 1000`).catch(() => []);
}

export async function countView(slug: string): Promise<void> {
  await query(`UPDATE platform_blog_posts SET views = views + 1 WHERE slug = $1 AND ${LIVE}`, [slug]);
}

/* ───────────────────────── Admin ───────────────────────── */

export async function adminListPosts(): Promise<(BlogCardPost & { status: BlogStatus; views: number; updated_at: string })[]> {
  await ensureBlogTable();
  return query(`SELECT ${CARD_COLS}, status, views, updated_at FROM platform_blog_posts ORDER BY COALESCE(published_at, updated_at) DESC`);
}

export async function adminGetPost(id: string): Promise<BlogPost | null> {
  await ensureBlogTable();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return queryOne<BlogPost>(`SELECT * FROM platform_blog_posts WHERE id = $1`, [id]);
}

export interface BlogInput {
  title: string;
  slug?: string;
  excerpt?: string | null;
  body: string;
  cover_url?: string | null;
  cover_credit?: string | null;
  category: BlogCategoryId;
  tags: string[];
  author_name: string;
  author_role?: string | null;
  status: BlogStatus;
  featured: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
}

/** A slug that isn't used by another post. */
async function uniqueSlug(wanted: string, exceptId?: string): Promise<string> {
  const base = blogSlug(wanted);
  for (let n = 1; n < 50; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const clash = await queryOne(`SELECT 1 FROM platform_blog_posts WHERE slug = $1 AND ($2::uuid IS NULL OR id <> $2::uuid)`, [slug, exceptId ?? null]);
    if (!clash) return slug;
  }
  return `${base}-${Date.now()}`;
}

export async function savePost(input: BlogInput, id?: string): Promise<BlogPost> {
  await ensureBlogTable();
  const slug = await uniqueSlug(input.slug?.trim() || input.title, id);
  const values = [
    input.title, slug, input.excerpt || null, input.body, input.cover_url || null, input.category, input.tags,
    input.author_name, input.author_role || null, input.status, input.featured, input.seo_title || null, input.seo_description || null,
    readingMinutes(input.body), input.cover_credit || null,
  ];
  if (input.featured) await query(`UPDATE platform_blog_posts SET featured = false WHERE featured = true AND ($1::uuid IS NULL OR id <> $1::uuid)`, [id ?? null]);
  if (id) {
    const row = await queryOne<BlogPost>(
      `UPDATE platform_blog_posts SET title=$1, slug=$2, excerpt=$3, body=$4, cover_url=$5, category=$6, tags=$7, author_name=$8, author_role=$9,
         status=$10, featured=$11, seo_title=$12, seo_description=$13, reading_minutes=$14, cover_credit=$15,
         published_at = CASE WHEN $10 = 'published' THEN COALESCE(published_at, NOW()) ELSE published_at END,
         updated_at = NOW()
       WHERE id = $16 RETURNING *`,
      [...values, id],
    );
    if (!row) throw new Error("Post not found");
    return row;
  }
  const row = await queryOne<BlogPost>(
    `INSERT INTO platform_blog_posts (title, slug, excerpt, body, cover_url, category, tags, author_name, author_role, status, featured, seo_title, seo_description, reading_minutes, cover_credit, published_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, CASE WHEN $10 = 'published' THEN NOW() END) RETURNING *`,
    values,
  );
  return row!;
}

export async function deletePost(id: string): Promise<{ slug: string } | null> {
  return queryOne<{ slug: string }>(`DELETE FROM platform_blog_posts WHERE id = $1 RETURNING slug`, [id]);
}
