-- Duka's own blog (dukanigeria.com/blog), written in the admin.
-- Separate from store_pages, which holds each vendor's own pages and posts.
-- Named platform_blog_posts: "blog_posts" already exists in production for store blogs.
CREATE TABLE IF NOT EXISTS platform_blog_posts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             TEXT NOT NULL UNIQUE,
  title            TEXT NOT NULL,
  excerpt          TEXT,
  body             TEXT NOT NULL DEFAULT '',
  cover_url        TEXT,
  cover_credit     TEXT,
  category         TEXT NOT NULL DEFAULT 'guides',
  tags             TEXT[] NOT NULL DEFAULT '{}',
  author_name      TEXT NOT NULL DEFAULT 'Duka Team',
  author_role      TEXT,
  status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  featured         BOOLEAN NOT NULL DEFAULT false,
  seo_title        TEXT,
  seo_description  TEXT,
  reading_minutes  INTEGER NOT NULL DEFAULT 1,
  views            INTEGER NOT NULL DEFAULT 0,
  published_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_platform_blog_posts_public ON platform_blog_posts(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_blog_posts_category ON platform_blog_posts(category, status, published_at DESC);
-- Photo credit shown under the cover (e.g. photographer and licence)
ALTER TABLE platform_blog_posts ADD COLUMN IF NOT EXISTS cover_credit TEXT;
