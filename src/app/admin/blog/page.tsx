import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/lib/admin-auth";
import { adminListPosts } from "@/lib/blog";
import BlogAdminClient from "./BlogAdminClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Blog" };

export default async function AdminBlogPage() {
  const admin = await verifyAdminSession();
  if (!admin) redirect("/admin/login");
  const posts = await adminListPosts();
  return <BlogAdminClient initial={JSON.parse(JSON.stringify(posts))} />;
}
