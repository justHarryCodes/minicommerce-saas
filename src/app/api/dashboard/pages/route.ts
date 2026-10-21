import { NextRequest, NextResponse } from "next/server";
import { requireFeature } from "@/lib/plan";
import { z } from "zod";
import { verifySession } from "@/lib/auth";
import { getStoreFor } from "@/lib/access";
import { query, queryOne } from "@/lib/db";
import { clearPagesCache, PAGE_TEMPLATES, templateBody, uniqueSlug, type PageTemplateId } from "@/lib/store-pages";

export const dynamic = "force-dynamic";

const MAX_PAGES = 200;

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = await getStoreFor(user, "pages");
  if (!store) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const pages = await query(
    `SELECT id, kind, slug, title, excerpt, cover_url, is_published, show_in_footer, published_at, updated_at
     FROM store_pages WHERE store_id = $1 ORDER BY kind, sort_order, updated_at DESC`,
    [store.id]
  );
  return NextResponse.json({ pages });
}

const CreateSchema = z.object({
  kind: z.enum(["page", "post"]).default("page"),
  title: z.string().trim().min(1).max(140).optional(),
  template: z.enum(Object.keys(PAGE_TEMPLATES) as [PageTemplateId, ...PageTemplateId[]]).optional(),
});

/** Creates a draft (from a template, or blank) and returns its id for the editor. */
export async function POST(req: NextRequest) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = await getStoreFor(user, "pages");
  if (!store) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 422 });
  const { kind, template } = parsed.data;
  if (kind === "post") {
    const denied = await requireFeature(store.id, "blog");
    if (denied) return denied;
  }

  const count = await queryOne<{ n: number }>("SELECT COUNT(*)::int AS n FROM store_pages WHERE store_id = $1", [store.id]);
  if ((count?.n ?? 0) >= MAX_PAGES) return NextResponse.json({ error: `Up to ${MAX_PAGES} pages and posts per store` }, { status: 400 });

  const seed = template && kind === "page"
    ? templateBody(template, store.name)
    : { title: parsed.data.title ?? (kind === "post" ? "Untitled post" : "Untitled page"), slug: parsed.data.title ?? (kind === "post" ? "post" : "page"), body: "" };
  const slug = await uniqueSlug(store.id, kind, seed.slug);

  const row = await queryOne<{ id: string }>(
    `INSERT INTO store_pages (store_id, kind, slug, title, body)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [store.id, kind, slug, seed.title, seed.body]
  );
  await clearPagesCache(store.id);
  return NextResponse.json({ id: row?.id }, { status: 201 });
}
