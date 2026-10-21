import { notFound, redirect } from "next/navigation";
import { verifySession } from "@/lib/auth";
import { getPageStore } from "@/lib/access";
import { queryOne } from "@/lib/db";
import { getStoreUrl } from "@/lib/utils";
import type { StorePage } from "@/lib/store-pages-shared";
import PageEditor from "./PageEditor";

export const dynamic = "force-dynamic";

export default async function EditPagePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await verifySession();
  if (!user) redirect("/auth/login");
  const store = await getPageStore(user, "pages");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const page = await queryOne<StorePage>("SELECT * FROM store_pages WHERE id = $1 AND store_id = $2", [id, store.id]);
  if (!page) notFound();

  return (
    <PageEditor
      page={{
        id: page.id,
        kind: page.kind,
        slug: page.slug,
        title: page.title,
        body: page.body,
        excerpt: page.excerpt,
        coverUrl: page.cover_url,
        isPublished: !!page.is_published,
        showInFooter: page.show_in_footer !== false,
      }}
      storeUrl={getStoreUrl(store.slug, store.customDomain ?? store.custom_domain ?? null)}
    />
  );
}
