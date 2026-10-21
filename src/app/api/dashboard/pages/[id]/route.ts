import { NextRequest, NextResponse } from "next/server";
import { requireFeature } from "@/lib/plan";
import { z } from "zod";
import { verifySession } from "@/lib/auth";
import { getStoreFor } from "@/lib/access";
import { queryOne } from "@/lib/db";
import { safeHref } from "@/lib/rich-text";
import { clearPagesCache, uniqueSlug } from "@/lib/store-pages";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  title: z.string().trim().min(1).max(140),
  slug: z.string().trim().max(80),
  body: z.string().max(50_000),
  excerpt: z.string().trim().max(300).nullable().optional(),
  coverUrl: z.string().trim().max(500).nullable().optional(),
  isPublished: z.boolean(),
  showInFooter: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = await getStoreFor(user, "pages");
  if (!store) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const { id } = await params;

  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid page" }, { status: 422 });
  }
  const d = parsed.data;
  const current = await queryOne<{ kind: "page" | "post" }>("SELECT kind FROM store_pages WHERE id = $1 AND store_id = $2", [id, store.id]);
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Drafts can still be edited; publishing a post needs the blog feature
  if (current.kind === "post" && d.isPublished) {
    const denied = await requireFeature(store.id, "blog");
    if (denied) return denied;
  }

  const cover = d.coverUrl && /^https:\/\//i.test(d.coverUrl) && safeHref(d.coverUrl) ? d.coverUrl : null;
  const slug = await uniqueSlug(store.id, current.kind, d.slug || d.title, id);

  const row = await queryOne(
    `UPDATE store_pages SET
       title = $3, slug = $4, body = $5, excerpt = $6, cover_url = $7,
       is_published = $8, show_in_footer = COALESCE($9, show_in_footer),
       published_at = CASE WHEN $8 AND published_at IS NULL THEN NOW() ELSE published_at END,
       updated_at = NOW()
     WHERE id = $1 AND store_id = $2
     RETURNING id, slug, is_published, published_at`,
    [id, store.id, d.title, slug, d.body, d.excerpt || null, cover, d.isPublished, d.showInFooter ?? null]
  );
  await clearPagesCache(store.id);
  return NextResponse.json({ page: row });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const store = await getStoreFor(user, "pages");
  if (!store) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const { id } = await params;
  const row = await queryOne("DELETE FROM store_pages WHERE id = $1 AND store_id = $2 RETURNING id", [id, store.id]);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await clearPagesCache(store.id);
  return NextResponse.json({ ok: true });
}
