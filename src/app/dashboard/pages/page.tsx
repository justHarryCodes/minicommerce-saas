import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { FileText, Newspaper } from "lucide-react";
import { verifySession } from "@/lib/auth";
import { getPageStore } from "@/lib/access";
import { query } from "@/lib/db";
import { getStoreUrl } from "@/lib/utils";
import NewPageButtons from "./NewPageButtons";

export const dynamic = "force-dynamic";

interface Row {
  id: string;
  kind: "page" | "post";
  slug: string;
  title: string;
  is_published: boolean;
  show_in_footer: boolean;
  updated_at: string;
}

export default async function PagesPage() {
  const user = await verifySession();
  if (!user) redirect("/auth/login");
  const store = await getPageStore(user, "pages");

  const rows = await query<Row>(
    `SELECT id, kind, slug, title, is_published, show_in_footer, updated_at
     FROM store_pages WHERE store_id = $1 ORDER BY sort_order, updated_at DESC`,
    [store.id]
  );
  const pages = rows.filter((r) => r.kind === "page");
  const posts = rows.filter((r) => r.kind === "post");
  const existing = pages.map((p) => p.slug);
  const base = getStoreUrl(store.slug, store.customDomain ?? store.custom_domain ?? null);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-4 lg:pt-0">
      <div>
        <h1 className="text-xl font-bold text-surface-900 dark:text-white">Pages & blog</h1>
        <p className="text-sm text-surface-500 dark:text-surface-400">
          About, FAQ and policy pages build trust — they appear in your store&apos;s footer. Blog posts help people find you on Google.
        </p>
      </div>

      <NewPageButtons existingSlugs={existing} />

      <Section title="Pages" icon={<FileText className="h-4 w-4" />} rows={pages} base={base} path="pages" empty="No pages yet — start from a template above." />
      <Section title="Blog posts" icon={<Newspaper className="h-4 w-4" />} rows={posts} base={base} path="blog" empty="No posts yet. Share news, new arrivals, recipes or styling tips." />
    </div>
  );
}

function Section({ title, icon, rows, base, path, empty }: { title: string; icon: React.ReactNode; rows: Row[]; base: string; path: string; empty: string }) {
  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-surface-900 dark:text-white">
        {icon} {title}
      </h2>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-surface-200 px-4 py-8 text-center text-sm text-surface-500 dark:border-surface-700 dark:text-surface-400">{empty}</p>
      ) : (
        <ul className="divide-y divide-surface-100 overflow-hidden rounded-2xl border border-surface-100 bg-white dark:divide-surface-800 dark:border-surface-800 dark:bg-surface-900">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-3">
              <Link href={`/dashboard/pages/${r.id}`} className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-surface-900 hover:underline dark:text-white">{r.title}</p>
                <p className="truncate text-xs text-surface-500 dark:text-surface-400">
                  /{path}/{r.slug} · edited {format(new Date(r.updated_at), "d MMM")}
                  {r.kind === "page" && r.is_published && !r.show_in_footer ? " · hidden from footer" : ""}
                </p>
              </Link>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  r.is_published
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                    : "bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400"
                }`}
              >
                {r.is_published ? "Live" : "Draft"}
              </span>
              {r.is_published && (
                <a href={`${base}/${path}/${r.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-accent-600 hover:underline dark:text-accent-400">
                  View
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
