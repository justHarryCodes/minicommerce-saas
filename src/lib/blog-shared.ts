// Duka blog: types, categories and the article format. Client-safe (the admin
// editor's live preview and the public pages share all of this).
//
// Posts are written in the same safe text format as store pages (lib/rich-text):
//   ## Heading / ### Subheading, - bullets, 1. numbers, > quote, **bold**, *italic*, [link](url), ---
// plus, for articles:
//   ![Image description](https://…)      an image on its own line
//   > Tip: …   > Note: …   > Warning: …  a coloured callout box
//   Photo: [Name](https://…), CC BY-SA 4.0   right under an image: its credit line

import { parseInline, parseRichText, plainText, type Block, type Inline } from "./rich-text";
import { slugify } from "./utils";

export type BlogStatus = "draft" | "published";

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  cover_url: string | null;
  /** e.g. "Photo: [Name](https://…), CC BY-SA 4.0, via Wikimedia Commons" */
  cover_credit: string | null;
  category: BlogCategoryId;
  tags: string[];
  author_name: string;
  author_role: string | null;
  status: BlogStatus;
  featured: boolean;
  seo_title: string | null;
  seo_description: string | null;
  reading_minutes: number;
  views: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/** What lists and cards need (no body). */
export type BlogCardPost = Pick<BlogPost, "id" | "slug" | "title" | "excerpt" | "cover_url" | "category" | "author_name" | "author_role" | "reading_minutes" | "published_at" | "featured" | "tags">;

export const BLOG_CATEGORIES = [
  { id: "selling-tips", label: "Selling tips", tone: "amber", blurb: "Practical ways to sell more" },
  { id: "guides", label: "Guides", tone: "blue", blurb: "Step-by-step how-tos on Duka" },
  { id: "marketing", label: "Marketing", tone: "pink", blurb: "WhatsApp, Instagram and beyond" },
  { id: "payments", label: "Payments", tone: "green", blurb: "Getting paid, safely" },
  { id: "success-stories", label: "Success stories", tone: "violet", blurb: "Sellers winning on Duka" },
  { id: "product-news", label: "Product news", tone: "slate", blurb: "What's new on Duka" },
] as const;

export type BlogCategoryId = (typeof BLOG_CATEGORIES)[number]["id"];
export type BlogTone = (typeof BLOG_CATEGORIES)[number]["tone"];

export function blogCategory(id: string | null | undefined) {
  return BLOG_CATEGORIES.find((c) => c.id === id) ?? BLOG_CATEGORIES[1];
}
export function isBlogCategory(id: unknown): id is BlogCategoryId {
  return typeof id === "string" && BLOG_CATEGORIES.some((c) => c.id === id);
}

/** Colour classes per category tone (badges, card accents). */
export const TONE_CLASSES: Record<BlogTone, { badge: string; soft: string; dot: string }> = {
  amber: { badge: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300", soft: "from-amber-100 to-orange-50 dark:from-amber-500/15 dark:to-orange-500/5", dot: "bg-amber-500" },
  blue: { badge: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300", soft: "from-sky-100 to-blue-50 dark:from-sky-500/15 dark:to-blue-500/5", dot: "bg-sky-500" },
  pink: { badge: "bg-pink-100 text-pink-800 dark:bg-pink-500/15 dark:text-pink-300", soft: "from-pink-100 to-rose-50 dark:from-pink-500/15 dark:to-rose-500/5", dot: "bg-pink-500" },
  green: { badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300", soft: "from-emerald-100 to-teal-50 dark:from-emerald-500/15 dark:to-teal-500/5", dot: "bg-emerald-500" },
  violet: { badge: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300", soft: "from-violet-100 to-purple-50 dark:from-violet-500/15 dark:to-purple-500/5", dot: "bg-violet-500" },
  slate: { badge: "bg-zinc-200 text-zinc-800 dark:bg-white/10 dark:text-zinc-200", soft: "from-zinc-100 to-zinc-50 dark:from-white/10 dark:to-white/5", dot: "bg-zinc-500" },
};

/** ~220 words a minute, at least 1. */
export function readingMinutes(body: string): number {
  const words = body.replace(/!\[[^\]]*\]\([^)]*\)/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function blogSlug(title: string): string {
  return slugify(title).slice(0, 80) || "post";
}

export function blogExcerpt(post: Pick<BlogPost, "excerpt" | "body">, max = 180): string {
  return (post.excerpt?.trim() || plainText(post.body.replace(/!\[[^\]]*\]\([^)]*\)/g, " "), max)).slice(0, max);
}

export function formatBlogDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" });
}

/* ───────────────────────── Article blocks ───────────────────────── */

export type ArticleBlock =
  | (Block & { id?: string })
  | { t: "img"; src: string; alt: string; credit?: Inline[] }
  | { t: "callout"; kind: "tip" | "note" | "warning"; c: Inline[][] };

const IMG = /^!\[([^\]]*)\]\((https:\/\/[^)\s]+)\)\s*$/;
const CREDIT = /^\s*(photo|image|credit)s?\s*:/i;
const CALLOUT = /^\s*(tip|note|warning)\s*[:—-]\s*/i;

function inlineText(c: Inline[]): string {
  return c.map((i) => (i.t === "text" ? i.v : inlineText(i.c))).join("");
}

/** Body text → blocks, with images, callouts and heading ids for the table of contents. */
export function parseArticle(body: string): ArticleBlock[] {
  const out: ArticleBlock[] = [];
  let chunk: string[] = [];
  const flush = () => {
    if (!chunk.length) return;
    for (const b of parseRichText(chunk.join("\n"))) {
      // rich-text maps "#"→2, "##"→3, "###"→4 (store pages). In articles "##" is a
      // section (h2) and "###" a subsection (h3), so shift up one, never above h2.
      if (b.t === "h") {
        out.push({ ...b, level: Math.max(2, b.level - 1) as 2 | 3 | 4 });
        continue;
      }
      if (b.t === "quote") {
        const first = inlineText(b.c[0] ?? []);
        const m = first.match(CALLOUT);
        if (m) {
          const lines = b.c.map((l) => l);
          // drop the "Tip:" prefix from the first line
          const firstLine = parseInline(first.replace(CALLOUT, ""));
          out.push({ t: "callout", kind: m[1].toLowerCase() as "tip" | "note" | "warning", c: [firstLine, ...lines.slice(1)] });
          continue;
        }
      }
      out.push(b);
    }
    chunk = [];
  };
  let lastImg: Extract<ArticleBlock, { t: "img" }> | null = null;
  for (const line of body.replace(/\r/g, "").split("\n")) {
    const img = line.match(IMG);
    if (img) {
      flush();
      lastImg = { t: "img", alt: img[1].slice(0, 200), src: img[2] };
      out.push(lastImg);
      continue;
    }
    // "Photo: …" on the line right after an image is that image's credit
    if (lastImg && !chunk.length && CREDIT.test(line)) {
      lastImg.credit = parseInline(line.trim().slice(0, 300));
      lastImg = null;
      continue;
    }
    if (line.trim()) lastImg = null;
    chunk.push(line);
  }
  flush();
  // Stable, unique ids for h2/h3 (table of contents + share links)
  const seen = new Map<string, number>();
  for (const b of out) {
    if (b.t === "h" && b.level <= 3) {
      const base = slugify(inlineText(b.c)).slice(0, 60) || "section";
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      (b as { id?: string }).id = n ? `${base}-${n + 1}` : base;
    }
  }
  return out;
}

export function tableOfContents(blocks: ArticleBlock[]): { id: string; text: string; level: 2 | 3 }[] {
  return blocks
    .filter((b): b is Block & { t: "h"; id: string } => b.t === "h" && (b.level === 2 || b.level === 3) && !!(b as { id?: string }).id)
    .map((b) => ({ id: b.id, text: inlineText(b.c), level: b.level as 2 | 3 }));
}
