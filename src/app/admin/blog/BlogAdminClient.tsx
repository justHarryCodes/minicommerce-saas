"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Eye, ExternalLink, FileText, Loader2, Newspaper, PenLine, Plus, Search, Send, Star, Trash2 } from "lucide-react";
import { BlogCover, CategoryBadge } from "@/components/blog/BlogParts";
import { formatBlogDate, type BlogCardPost, type BlogStatus } from "@/lib/blog-shared";

type Row = BlogCardPost & { status: BlogStatus; views: number; updated_at: string };

const card = "rounded-2xl border border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-900";

export default function BlogAdminClient({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [tab, setTab] = useState<"all" | BlogStatus>("all");
  const [q, setQ] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const stats = useMemo(() => ({
    published: rows.filter((r) => r.status === "published").length,
    drafts: rows.filter((r) => r.status === "draft").length,
    views: rows.reduce((s, r) => s + (r.views || 0), 0),
    featured: rows.find((r) => r.featured && r.status === "published")?.title ?? null,
  }), [rows]);

  const shown = rows.filter((r) => (tab === "all" || r.status === tab) && (!q || `${r.title} ${r.tags.join(" ")}`.toLowerCase().includes(q.toLowerCase())));

  async function remove(r: Row) {
    if (!window.confirm(`Delete "${r.title}"? This can't be undone.`)) return;
    setDeleting(r.id);
    try {
      const res = await fetch(`/api/admin/blog/${r.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Couldn't delete");
      setRows((list) => list.filter((x) => x.id !== r.id));
      toast.success("Post deleted");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Blog</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Articles on <a href="/blog" target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">dukanigeria.com/blog</a>. Teach sellers, rank on Google, bring in new stores.
          </p>
        </div>
        <Link href="/admin/blog/new" className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-black shadow-sm hover:bg-amber-500">
          <Plus className="h-4 w-4" /> New post
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Published", value: stats.published, icon: Send, tone: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" },
          { label: "Drafts", value: stats.drafts, icon: PenLine, tone: "text-amber-600 bg-amber-50 dark:bg-amber-900/20" },
          { label: "Total reads", value: stats.views.toLocaleString("en-NG"), icon: Eye, tone: "text-sky-600 bg-sky-50 dark:bg-sky-900/20" },
          { label: "Featured", value: stats.featured ?? "None yet", icon: Star, tone: "text-violet-600 bg-violet-50 dark:bg-violet-900/20", small: true },
        ].map((s) => (
          <div key={s.label} className={`${card} flex items-center gap-3 p-4`}>
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${s.tone}`}><s.icon className="h-5 w-5" /></span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{s.label}</p>
              <p className={`truncate font-bold text-zinc-900 dark:text-white ${s.small ? "text-sm" : "text-xl"}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-fit gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
          {(["all", "published", "draft"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold capitalize transition-colors ${tab === t ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"}`}>
              {t === "draft" ? "Drafts" : t}
            </button>
          ))}
        </div>
        <label className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search posts or tags" className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-amber-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white" />
        </label>
      </div>

      {/* List */}
      {rows.length === 0 ? (
        <div className={`${card} p-14 text-center`}>
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-900/20"><Newspaper className="h-7 w-7" /></span>
          <p className="mt-4 font-semibold text-zinc-900 dark:text-white">No posts yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">Write your first article. Drafts stay private until you publish them.</p>
          <Link href="/admin/blog/new" className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-black hover:bg-amber-500"><Plus className="h-4 w-4" /> Write a post</Link>
        </div>
      ) : shown.length === 0 ? (
        <div className={`${card} p-10 text-center text-sm text-zinc-500`}><FileText className="mx-auto mb-2 h-8 w-8 text-zinc-300" /> Nothing matches.</div>
      ) : (
        <div className={`${card} divide-y divide-zinc-100 overflow-hidden dark:divide-zinc-800`}>
          {shown.map((r) => (
            <div key={r.id} className="flex items-center gap-4 p-3 sm:p-4">
              <Link href={`/admin/blog/${r.id}`} className="group shrink-0">
                <BlogCover post={r} sizes="112px" className="h-16 w-24 rounded-xl sm:h-[72px] sm:w-28" />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${r.status === "published" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}>
                    {r.status === "published" ? "Published" : "Draft"}
                  </span>
                  {r.featured && <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"><Star className="h-3 w-3 fill-current" /> Featured</span>}
                  <CategoryBadge id={r.category} />
                </div>
                <Link href={`/admin/blog/${r.id}`} className="mt-1 block truncate font-semibold text-zinc-900 hover:text-amber-700 dark:text-white">{r.title}</Link>
                <p className="mt-0.5 truncate text-xs text-zinc-400">
                  /blog/{r.slug} · {r.status === "published" ? `Published ${formatBlogDate(r.published_at)}` : `Edited ${formatBlogDate(r.updated_at)}`} · {r.reading_minutes} min read{r.status === "published" ? ` · ${r.views.toLocaleString("en-NG")} reads` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {r.status === "published" && (
                  <a href={`/blog/${r.slug}`} target="_blank" rel="noopener noreferrer" title="View live" aria-label="View live" className="grid h-9 w-9 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"><ExternalLink className="h-4 w-4" /></a>
                )}
                <Link href={`/admin/blog/${r.id}`} title="Edit" aria-label="Edit" className="grid h-9 w-9 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"><PenLine className="h-4 w-4" /></Link>
                <button type="button" onClick={() => remove(r)} disabled={deleting === r.id} title="Delete" aria-label="Delete" className="grid h-9 w-9 place-items-center rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/20">
                  {deleting === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
