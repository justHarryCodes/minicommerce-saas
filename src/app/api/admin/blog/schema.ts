import { z } from "zod";
import { BLOG_CATEGORIES } from "@/lib/blog-shared";

const httpsUrl = z.string().trim().max(1000).refine((u) => u === "" || /^https:\/\/[^\s]+$/.test(u), "The cover image must be an https:// link").optional().nullable();

/** One post as sent by the admin editor. */
export const BlogBody = z.object({
  title: z.string().trim().min(3, "Give the post a title (at least 3 characters)").max(160),
  slug: z.string().trim().max(100).regex(/^[a-z0-9-]*$/, "The link may only use lowercase letters, numbers and dashes").optional(),
  excerpt: z.string().trim().max(300).optional().nullable(),
  body: z.string().max(100_000),
  cover_url: httpsUrl,
  /** Photographer / licence line under the cover; may hold [text](https://…) links. */
  cover_credit: z.string().trim().max(300).optional().nullable(),
  category: z.enum(BLOG_CATEGORIES.map((c) => c.id) as [string, ...string[]]).transform((v) => v as (typeof BLOG_CATEGORIES)[number]["id"]),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
  author_name: z.string().trim().min(1).max(80).default("Duka Team"),
  author_role: z.string().trim().max(80).optional().nullable(),
  status: z.enum(["draft", "published"]),
  featured: z.boolean().default(false),
  seo_title: z.string().trim().max(70).optional().nullable(),
  seo_description: z.string().trim().max(170).optional().nullable(),
}).refine((p) => p.status === "draft" || p.body.trim().length >= 50, { message: "Write at least a few sentences before publishing", path: ["body"] });
