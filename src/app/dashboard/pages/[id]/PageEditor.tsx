"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft, Eye, Loader2, Pencil, Trash2 } from "lucide-react";
import RichText from "@/components/storefront/RichText";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { slugify } from "@/lib/utils";

interface EditablePage {
  id: string;
  kind: "page" | "post";
  slug: string;
  title: string;
  body: string;
  excerpt: string | null;
  coverUrl: string | null;
  isPublished: boolean;
  showInFooter: boolean;
}

const input =
  "w-full rounded-xl border border-surface-200 bg-white px-3.5 py-2.5 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-accent-400 dark:border-surface-700 dark:bg-surface-900 dark:text-white";

export default function PageEditor({ page, storeUrl }: { page: EditablePage; storeUrl: string }) {
  const router = useRouter();
  const [p, setP] = useState(page);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const isPost = p.kind === "post";
  const path = isPost ? "blog" : "pages";

  const set = <K extends keyof EditablePage>(k: K, v: EditablePage[K]) => {
    setP((cur) => ({ ...cur, [k]: v }));
    setDirty(true);
  };

  async function save(publish?: boolean) {
    setSaving(true);
    const isPublished = publish ?? p.isPublished;
    const res = await fetch(`/api/dashboard/pages/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: p.title,
        slug: p.slug,
        body: p.body,
        excerpt: p.excerpt,
        coverUrl: p.coverUrl,
        isPublished,
        showInFooter: p.showInFooter,
      }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setSaving(false);
    if (!res?.ok) return toast.error(data?.error ?? "Couldn't save");
    setP((cur) => ({ ...cur, slug: data.page.slug, isPublished }));
    setDirty(false);
    toast.success(publish === true ? "Published" : publish === false ? "Moved to drafts" : "Saved");
    router.refresh();
  }

  async function remove() {
    if (!confirm(`Delete “${p.title}”? This can't be undone.`)) return;
    const res = await fetch(`/api/dashboard/pages/${p.id}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) return toast.error("Couldn't delete");
    toast.success("Deleted");
    router.push("/dashboard/pages");
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 pt-4 lg:pt-0">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/dashboard/pages" className="flex items-center gap-1 text-sm text-surface-500 hover:text-surface-900 dark:hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Pages & blog
        </Link>
        <span className="ml-auto flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${p.isPublished ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" : "bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400"}`}>
            {p.isPublished ? "Live" : "Draft"}
          </span>
          {p.isPublished && (
            <a href={`${storeUrl}/${path}/${p.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-accent-600 hover:underline dark:text-accent-400">
              View on store
            </a>
          )}
        </span>
      </div>

      <div className="space-y-4 rounded-2xl border border-surface-100 bg-white p-5 dark:border-surface-800 dark:bg-surface-900">
        <input
          className="w-full bg-transparent text-2xl font-bold text-surface-900 placeholder:text-surface-300 focus:outline-none dark:text-white"
          value={p.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder={isPost ? "Post title" : "Page title"}
          maxLength={140}
        />
        <label className="flex items-center gap-1 text-xs text-surface-500 dark:text-surface-400">
          <span className="shrink-0">Address: …/{path}/</span>
          <input
            className="min-w-0 flex-1 rounded-md border border-transparent bg-surface-50 px-1.5 py-0.5 font-mono text-xs text-surface-700 focus:border-surface-200 focus:outline-none dark:bg-surface-800 dark:text-surface-200"
            value={p.slug}
            onChange={(e) => set("slug", slugify(e.target.value))}
            maxLength={80}
          />
        </label>

        <div className="flex gap-1 border-b border-surface-100 dark:border-surface-800">
          {([
            { id: "write", label: "Write", icon: Pencil },
            { id: "preview", label: "Preview", icon: Eye },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-semibold ${
                tab === id ? "border-accent-500 text-surface-900 dark:text-white" : "border-transparent text-surface-500 hover:text-surface-800 dark:hover:text-surface-200"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        {tab === "write" ? (
          <>
            <textarea
              className={`${input} min-h-[360px] font-mono text-[13px] leading-6`}
              value={p.body}
              onChange={(e) => set("body", e.target.value)}
              placeholder="Write here…"
              maxLength={50_000}
            />
            <p className="text-xs text-surface-400">
              <code># Heading</code> · <code>## Subheading</code> · <code>- bullet</code> · <code>1. numbered</code> · <code>**bold**</code> ·{" "}
              <code>*italic*</code> · <code>[link](https://…)</code> · <code>&gt; quote</code> · blank line = new paragraph
            </p>
          </>
        ) : (
          <div className="min-h-[360px] rounded-xl bg-surface-50 p-5 dark:bg-surface-950">
            <h1 className="mb-5 text-3xl font-bold text-surface-900 dark:text-white">{p.title}</h1>
            {p.body.trim() ? <RichText source={p.body} /> : <p className="text-sm text-surface-400">Nothing written yet.</p>}
          </div>
        )}
      </div>

      <div className="space-y-4 rounded-2xl border border-surface-100 bg-white p-5 dark:border-surface-800 dark:bg-surface-900">
        {isPost ? (
          <>
            <div>
              <p className="mb-1.5 text-sm font-semibold text-surface-900 dark:text-white">Cover image</p>
              <ImageUpload value={p.coverUrl ?? undefined} onChange={(url) => set("coverUrl", url)} onRemove={() => set("coverUrl", null)} />
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-surface-900 dark:text-white">Summary</span>
              <textarea
                className={`${input} min-h-[72px]`}
                value={p.excerpt ?? ""}
                onChange={(e) => set("excerpt", e.target.value)}
                maxLength={300}
                placeholder="One or two sentences for the blog list and link previews (optional)"
              />
            </label>
          </>
        ) : (
          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-semibold text-surface-900 dark:text-white">Show in footer</span>
              <span className="text-xs text-surface-500 dark:text-surface-400">Link to this page from the bottom of every store page.</span>
            </span>
            <input type="checkbox" className="h-5 w-5 accent-accent-500" checked={p.showInFooter} onChange={(e) => set("showInFooter", e.target.checked)} />
          </label>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {p.isPublished ? (
          <>
            <button type="button" disabled={saving} onClick={() => save()} className="flex items-center gap-2 rounded-xl bg-accent-400 px-5 py-2.5 text-sm font-bold text-black hover:bg-accent-500 disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} {dirty ? "Update" : "Saved"}
            </button>
            <button type="button" disabled={saving} onClick={() => save(false)} className="rounded-xl border border-surface-200 px-4 py-2.5 text-sm font-semibold text-surface-700 hover:bg-surface-50 dark:border-surface-700 dark:text-surface-200 dark:hover:bg-surface-800">
              Unpublish
            </button>
          </>
        ) : (
          <>
            <button type="button" disabled={saving} onClick={() => save(true)} className="flex items-center gap-2 rounded-xl bg-accent-400 px-5 py-2.5 text-sm font-bold text-black hover:bg-accent-500 disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Publish
            </button>
            <button type="button" disabled={saving} onClick={() => save()} className="rounded-xl border border-surface-200 px-4 py-2.5 text-sm font-semibold text-surface-700 hover:bg-surface-50 dark:border-surface-700 dark:text-surface-200 dark:hover:bg-surface-800">
              Save draft
            </button>
          </>
        )}
        <button type="button" onClick={remove} className="ml-auto flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      </div>
    </div>
  );
}
