import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyAdminSession } from "@/lib/admin-auth";
import { adminGetPost, deletePost, savePost } from "@/lib/blog";
import { BlogBody } from "../schema";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const post = await adminGetPost((await params).id);
  return post ? NextResponse.json({ post }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const before = await adminGetPost(id);
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = BlogBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the post details" }, { status: 422 });
  const post = await savePost(parsed.data, id);
  revalidatePath("/blog");
  revalidatePath(`/blog/${post.slug}`);
  if (before.slug !== post.slug) revalidatePath(`/blog/${before.slug}`);
  return NextResponse.json({ post });
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  if (!(await verifyAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const gone = await deletePost((await params).id);
  if (!gone) return NextResponse.json({ error: "Not found" }, { status: 404 });
  revalidatePath("/blog");
  revalidatePath(`/blog/${gone.slug}`);
  return NextResponse.json({ ok: true });
}
