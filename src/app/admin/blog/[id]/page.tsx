import { notFound, redirect } from "next/navigation";
import { verifyAdminSession } from "@/lib/admin-auth";
import { adminGetPost } from "@/lib/blog";
import BlogEditor from "./BlogEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Blog post" };

export default async function AdminBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await verifyAdminSession();
  if (!admin) redirect("/admin/login");
  const { id } = await params;
  if (id === "new") return <BlogEditor initial={null} defaultAuthor={admin.name || "Duka Team"} />;
  const post = await adminGetPost(id);
  if (!post) notFound();
  return <BlogEditor initial={JSON.parse(JSON.stringify(post))} defaultAuthor={admin.name || "Duka Team"} />;
}
