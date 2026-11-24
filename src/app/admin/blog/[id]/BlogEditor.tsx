"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowLeft, Bold, Check, ChevronDown, Eye, Heading2, Heading3, ImagePlus, Italic, Lightbulb, Link2, List, ListOrdered, Loader2,
  Minus, PenLine, Quote, Save, Send, Star, Trash2, Upload, X,
} from "lucide-react";
import { BlogBody, CATEGORY_ICON } from "@/components/blog/BlogParts";
import { BLOG_CATEGORIES, blogCategory, blogSlug, parseArticle, readingMinutes, TONE_CLASSES, type BlogCategoryId, type BlogPost, type BlogStatus } from "@/lib/blog-shared";

type Draft = {
  title: string; slug: string; excerpt: string; body: string; cover_url: string; cover_credit: string; category: BlogCategoryId; tags: string[];
  author_name: string; author_role: string; status: BlogStatus; featured: boolean; seo_title: string; seo_description: string;
};

const card = "rounded-2xl border border-zinc-100 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900";
const label = "mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300";
const input = "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white";

async function uploadImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file");
  if (file.size > 8 * 1024 * 1024) throw new Error("Image must be under 8 MB");
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");
  return data.url as string;
}

function Counter({ n, max }: { n: number; max: number }) {
  return <span className={`text-[11px] tabular-nums ${n > max ? "font-bold text-red-600" : n > max * 0.85 ? "text-amber-600" : "text-zinc-400"}`}>{n}/{max}</span>;
}

export default function BlogEditor({ initial, defaultAuthor }: { initial: BlogPost | null; defaultAuthor: string }) {
  const router = useRouter();
  const [id, setId] = useState(initial?.id ?? null);
  const start: Draft = useMemo(() => ({
    title: initial?.title ?? "", slug: initial?.slug ?? "", excerpt: initial?.excerpt ?? "", body: initial?.body ?? "",
    cover_url: initial?.cover_url ?? "", cover_credit: initial?.cover_credit ?? "", category: (initial?.category ?? "guides") as BlogCategoryId, tags: initial?.tags ?? [],
    author_name: initial?.author_name ?? defaultAuthor, author_role: initial?.author_role ?? "", status: initial?.status ?? "draft",
    featured: initial?.featured ?? false, seo_title: initial?.seo_title ?? "", seo_description: initial?.seo_description ?? "",
  }), [initial, defaultAuthor]);
  const [d, setD] = useState<Draft>(start);
  const [saved, setSaved] = useState<Draft>(start);
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [saving, setSaving] = useState<null | "draft" | "publish">(null);
  const [uploading, setUploading] = useState<null | "cover" | "inline">(null);
  const [tagInput, setTagInput] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [publishedAt, setPublishedAt] = useState(initial?.published_at ?? null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const inlineInput = useRef<HTMLInputElement>(null);

  const dirty = JSON.stringify(d) !== JSON.stringify(saved);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const words = d.body.split(/\s+/).filter(Boolean).length;
  const minutes = readingMinutes(d.body);
  const blocks = useMemo(() => (mode === "preview" ? parseArticle(d.body) : []), [mode, d.body]);
  const slug = slugTouched ? d.slug : blogSlug(d.title || "untitled");

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const save = useCallback(async (status: BlogStatus) => {
    if (d.title.trim().length < 3) return toast.error("Give the post a title first");
    setSaving(status === "published" ? "publish" : "draft");
    const payload = { ...d, slug, status };
    try {
      const res = await fetch(id ? `/api/admin/blog/${id}` : "/api/admin/blog", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save");
      const p = data.post as BlogPost;
      const next: Draft = { ...d, status: p.status, slug: p.slug };
      setD(next);
      setSaved(next);
      setSlugTouched(true);
      setPublishedAt(p.published_at);
      toast.success(status === "published" ? (d.status === "published" ? "Changes are live" : "Published 🎉") : "Draft saved");
      if (!id) {
        setId(p.id);
        router.replace(`/admin/blog/${p.id}`);
      }
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(null);
    }
  }, [d, id, router, slug]);

  // Ctrl/Cmd+S saves (keeps the current status)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); void save(d.status); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [save, d.status]);

  async function remove() {
    if (!id || !window.confirm("Delete this post? This can't be undone.")) return;
    const res = await fetch(`/api/admin/blog/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Couldn't delete");
    toast.success("Post deleted");
    setSaved(d);
    router.push("/admin/blog");
    router.refresh();
  }

  /* ── Formatting toolbar ── */
  function apply(kind: "h2" | "h3" | "bold" | "italic" | "link" | "ul" | "ol" | "quote" | "tip" | "hr", insert?: string) {
    const el = bodyRef.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b, value } = el;
    const sel = value.slice(a, b);
    const lineStart = value.lastIndexOf("\n", a - 1) + 1;
    let next = value, cursor = b;
    const prefixLines = (p: string | ((i: number) => string)) => {
      const end = value.indexOf("\n", b) === -1 ? value.length : value.indexOf("\n", b);
      const lines = value.slice(lineStart, end).split("\n").map((l, i) => (typeof p === "string" ? p : p(i)) + l.replace(/^(#{1,4}\s|[-*]\s|\d+\.\s|>\s(?:Tip:\s)?)/, ""));
      next = value.slice(0, lineStart) + lines.join("\n") + value.slice(end);
      cursor = lineStart + lines.join("\n").length;
    };
    const wrap = (l: string, r: string, placeholder: string) => {
      const text = sel || placeholder;
      next = value.slice(0, a) + l + text + r + value.slice(b);
      cursor = a + l.length + text.length;
    };
    switch (kind) {
      case "h2": prefixLines("## "); break;
      case "h3": prefixLines("### "); break;
      case "ul": prefixLines("- "); break;
      case "ol": prefixLines((i) => `${i + 1}. `); break;
      case "quote": prefixLines("> "); break;
      case "tip": prefixLines("> Tip: "); break;
      case "bold": wrap("**", "**", "bold text"); break;
      case "italic": wrap("*", "*", "italic text"); break;
      case "link": {
        const url = window.prompt("Link address (https://…)", "https://");
        if (!url || !/^(https?:\/\/|\/)/.test(url)) return;
        wrap("[", `](${url})`, "link text");
        break;
      }
      case "hr": next = value.slice(0, a) + `${a && value[a - 1] !== "\n" ? "\n" : ""}\n---\n\n` + value.slice(b); cursor = a + 6; break;
    }
    if (insert !== undefined) { next = value.slice(0, a) + insert + value.slice(b); cursor = a + insert.length; }
    set("body", next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(cursor, cursor); });
  }

  async function onInlineImage(file: File | undefined) {
    if (!file) return;
    setUploading("inline");
    try {
      const url = await uploadImage(file);
      const alt = (window.prompt("Describe the image (shown as the caption, helps Google)", "") ?? "").replace(/[[\]]/g, "");
      const el = bodyRef.current;
      const before = el ? el.value.slice(0, el.selectionStart) : d.body;
      const pad = before && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : "";
      apply("hr", `${pad}![${alt}](${url})\n\n`);
      toast.success("Image added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }
  async function onCover(file: File | undefined) {
    if (!file) return;
    setUploading("cover");
    try { set("cover_url", await uploadImage(file)); } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); } finally { setUploading(null); }
  }
  function addTag(raw: string) {
    const t = raw.trim().replace(/^#/, "").slice(0, 30);
    if (!t || d.tags.some((x) => x.toLowerCase() === t.toLowerCase())) return setTagInput("");
    if (d.tags.length >= 10) return toast.error("Up to 10 tags");
    set("tags", [...d.tags, t]);
    setTagInput("");
  }

  const tools: { k: Parameters<typeof apply>[0]; icon: typeof Bold; label: string }[] = [
    { k: "h2", icon: Heading2, label: "Heading" }, { k: "h3", icon: Heading3, label: "Subheading" },
    { k: "bold", icon: Bold, label: "Bold" }, { k: "italic", icon: Italic, label: "Italic" }, { k: "link", icon: Link2, label: "Link" },
    { k: "ul", icon: List, label: "Bullet list" }, { k: "ol", icon: ListOrdered, label: "Numbered list" },
    { k: "quote", icon: Quote, label: "Quote" }, { k: "tip", icon: Lightbulb, label: "Tip box" }, { k: "hr", icon: Minus, label: "Divider" },
  ];
  const seoTitle = d.seo_title || d.title || "Post title";
  const seoDesc = d.seo_description || d.excerpt || "A short summary of the post appears here in Google results.";
  const live = d.status === "published" && !!id;

  return (
    <div className="space-y-5 pb-24">
      {/* Top bar */}
      <div className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-100 bg-white/90 px-3 py-2.5 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
        <Link href="/admin/blog" className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"><ArrowLeft className="h-4 w-4" /> Posts</Link>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${live ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}>{live ? "Published" : "Draft"}</span>
        <span className="text-xs text-zinc-400">{saving ? "Saving…" : dirty ? "Unsaved changes" : id ? "All changes saved" : "Not saved yet"}</span>
        <div className="ml-auto flex items-center gap-2">
          {live && <a href={`/blog/${saved.slug}`} target="_blank" rel="noopener noreferrer" className="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 sm:inline-flex"><Eye className="h-4 w-4" /> View live</a>}
          {!live && (
            <button type="button" onClick={() => save("draft")} disabled={!!saving} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3.5 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800">
              {saving === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save draft
            </button>
          )}
          <button type="button" onClick={() => save("published")} disabled={!!saving} className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-black hover:bg-amber-500 disabled:opacity-50">
            {saving === "publish" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {live ? "Update" : "Publish"}
          </button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* ═════ Main column ═════ */}
        <div className="min-w-0 space-y-5">
          <div className={card}>
            <textarea
              value={d.title}
              onChange={(e) => set("title", e.target.value.replace(/\n/g, ""))}
              placeholder="Post title"
              rows={1}
              maxLength={160}
              className="w-full resize-none border-0 bg-transparent p-0 text-3xl font-bold leading-tight tracking-tight text-zinc-900 outline-none placeholder:text-zinc-300 focus:ring-0 dark:text-white sm:text-4xl"
              style={{ height: "auto", minHeight: 48 }}
              onInput={(e) => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = `${t.scrollHeight}px`; }}
            />
            <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <div className="mb-1 flex items-center justify-between"><span className={label.replace("mb-1.5 ", "")}>Summary <span className="font-normal text-zinc-400">(shown on cards and under the title)</span></span><Counter n={d.excerpt.length} max={300} /></div>
              <textarea value={d.excerpt} onChange={(e) => set("excerpt", e.target.value)} rows={2} maxLength={300} placeholder="One or two sentences that make people want to read on." className="w-full resize-none border-0 bg-transparent p-0 text-[15px] leading-relaxed text-zinc-600 outline-none placeholder:text-zinc-300 focus:ring-0 dark:text-zinc-300" />
            </div>
          </div>

          <div className={`${card} p-0`}>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
              <div className="mr-2 flex gap-1 rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800">
                {(["write", "preview"] as const).map((m) => (
                  <button key={m} type="button" onClick={() => setMode(m)} className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold capitalize ${mode === m ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white" : "text-zinc-500"}`}>
                    {m === "write" ? <PenLine className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} {m}
                  </button>
                ))}
              </div>
              {mode === "write" && tools.map((t) => (
                <button key={t.k} type="button" title={t.label} aria-label={t.label} onClick={() => apply(t.k)} className="grid h-8 w-8 place-items-center rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800">
                  <t.icon className="h-4 w-4" />
                </button>
              ))}
              {mode === "write" && (
                <button type="button" title="Insert image" aria-label="Insert image" onClick={() => inlineInput.current?.click()} disabled={!!uploading} className="grid h-8 w-8 place-items-center rounded-lg text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">
                  {uploading === "inline" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                </button>
              )}
              <input ref={inlineInput} type="file" accept="image/*" hidden onChange={(e) => { void onInlineImage(e.target.files?.[0]); e.target.value = ""; }} />
              <span className="ml-auto text-[11px] text-zinc-400">{words.toLocaleString()} words · {minutes} min read</span>
            </div>

            {mode === "write" ? (
              <textarea
                ref={bodyRef}
                value={d.body}
                onChange={(e) => set("body", e.target.value)}
                placeholder={"Start writing…\n\n## A heading\nA paragraph of helpful advice.\n\n- A bullet point\n> Tip: a highlighted tip for the reader"}
                className="block min-h-[560px] w-full resize-y border-0 bg-transparent px-5 py-4 text-[15px] leading-7 text-zinc-800 outline-none placeholder:text-zinc-300 focus:ring-0 dark:text-zinc-100"
              />
            ) : (
              <div className="min-h-[560px] px-5 py-6 sm:px-10">
                {d.title && <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl" style={{ color: "var(--text-primary)" }}>{d.title}</h1>}
                {d.excerpt && <p className="mt-3 text-lg" style={{ color: "var(--text-secondary)" }}>{d.excerpt}</p>}
                {d.cover_url && <div className="relative mt-6 aspect-[16/8] overflow-hidden rounded-2xl"><Image src={d.cover_url} alt="" fill sizes="720px" className="object-cover" /></div>}
                <div className="mt-8 max-w-[720px]">{d.body.trim() ? <BlogBody blocks={blocks} /> : <p className="text-zinc-400">Nothing to preview yet.</p>}</div>
              </div>
            )}

            {/* Formatting help */}
            <div className="border-t border-zinc-100 px-5 py-3 dark:border-zinc-800">
              <button type="button" onClick={() => setShowHelp((v) => !v)} className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200" aria-expanded={showHelp}>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showHelp ? "rotate-180" : ""}`} /> Formatting guide
              </button>
              {showHelp && (
                <div className="mt-3 grid gap-x-8 gap-y-1.5 text-[12px] text-zinc-600 sm:grid-cols-2 dark:text-zinc-400">
                  {[
                    ["## Heading", "Section heading (shows in the table of contents)"], ["### Subheading", "Smaller heading"],
                    ["**bold**  *italic*", "Emphasis"], ["[text](https://…)", "Link"], ["- item  /  1. item", "Bullet / numbered list"],
                    ["> quote", "Pull quote"], ["> Tip: …  > Note: …  > Warning: …", "Coloured callout box"],
                    ["![caption](https://…)", "Image on its own line (or use the image button)"], ["Photo: [Name](https://…), CC BY 4.0", "Credit line, right under an image"], ["---", "Divider"], ["Blank line", "New paragraph"],
                  ].map(([code, what]) => (
                    <p key={code}><code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">{code}</code> <span className="ml-1">{what}</span></p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═════ Sidebar ═════ */}
        <aside className="space-y-5">
          <div className={card}>
            <p className="mb-3 text-sm font-bold text-zinc-900 dark:text-white">Publishing</p>
            <div className="space-y-2.5 text-sm">
              <p className="flex justify-between"><span className="text-zinc-500">Status</span><span className="font-semibold text-zinc-900 dark:text-white">{live ? "Published" : "Draft"}</span></p>
              {publishedAt && <p className="flex justify-between"><span className="text-zinc-500">Published</span><span className="font-semibold text-zinc-900 dark:text-white">{new Date(publishedAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</span></p>}
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-zinc-50 px-3 py-2.5 dark:bg-zinc-800/60">
                <span className="flex items-center gap-2 font-medium text-zinc-800 dark:text-zinc-100"><Star className={`h-4 w-4 ${d.featured ? "fill-violet-500 text-violet-500" : "text-zinc-400"}`} /> Feature on the blog</span>
                <input type="checkbox" checked={d.featured} onChange={(e) => set("featured", e.target.checked)} className="h-4 w-4 rounded border-zinc-300 text-amber-500 focus:ring-amber-400" />
              </label>
              <p className="text-[11px] text-zinc-400">One featured post shows big at the top of the blog. Featuring this one un-features the last.</p>
              {live && (
                <button type="button" onClick={() => save("draft")} disabled={!!saving} className="w-full rounded-xl border border-zinc-200 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">Unpublish (back to draft)</button>
              )}
            </div>
          </div>

          <div className={card}>
            <p className="mb-3 text-sm font-bold text-zinc-900 dark:text-white">Cover image</p>
            {d.cover_url ? (
              <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-zinc-100 dark:border-zinc-800">
                <Image src={d.cover_url} alt="" fill sizes="320px" className="object-cover" />
                <button type="button" onClick={() => set("cover_url", "")} aria-label="Remove cover" className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <button type="button" onClick={() => coverInput.current?.click()} disabled={!!uploading} className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 text-sm font-semibold text-zinc-500 hover:border-amber-400 hover:text-amber-700 dark:border-zinc-700">
                {uploading === "cover" ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
                {uploading === "cover" ? "Uploading…" : "Upload a cover"}
                <span className="text-[11px] font-normal text-zinc-400">1600 × 900 or larger works best</span>
              </button>
            )}
            <input ref={coverInput} type="file" accept="image/*" hidden onChange={(e) => { void onCover(e.target.files?.[0]); e.target.value = ""; }} />
            {d.cover_url && <button type="button" onClick={() => coverInput.current?.click()} className="mt-2 text-xs font-semibold text-amber-700 hover:underline dark:text-amber-400">Replace image</button>}
            {!d.cover_url && <p className="mt-2 text-[11px] text-zinc-400">No cover? A branded design in the category&apos;s colours is used instead.</p>}
            {d.cover_url && (
              <label className="mt-3 block">
                <span className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Photo credit <span className="font-normal text-zinc-400">(if the photo isn&apos;t yours)</span></span>
                <input value={d.cover_credit} onChange={(e) => set("cover_credit", e.target.value)} maxLength={300} placeholder="Photo: [Name](https://…), CC BY-SA 4.0, via Wikimedia Commons" className={input} />
              </label>
            )}
          </div>

          <div className={card}>
            <p className="mb-3 text-sm font-bold text-zinc-900 dark:text-white">Category</p>
            <div className="grid grid-cols-2 gap-2">
              {BLOG_CATEGORIES.map((c) => {
                const Icon = CATEGORY_ICON[c.id];
                const on = d.category === c.id;
                return (
                  <button key={c.id} type="button" onClick={() => set("category", c.id)} className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs font-semibold transition-colors ${on ? "border-amber-400 bg-amber-50 text-zinc-900 dark:bg-amber-500/10 dark:text-white" : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-300"}`}>
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg ${TONE_CLASSES[c.tone].badge}`}><Icon className="h-3.5 w-3.5" /></span>
                    {c.label}
                    {on && <Check className="ml-auto h-3.5 w-3.5 text-amber-600" />}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-zinc-400">{blogCategory(d.category).blurb}</p>

            <p className="mb-1.5 mt-5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">Tags</p>
            <div className="flex flex-wrap gap-1.5 rounded-xl border border-zinc-200 p-2 focus-within:border-amber-400 dark:border-zinc-700">
              {d.tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                  #{t}<button type="button" aria-label={`Remove ${t}`} onClick={() => set("tags", d.tags.filter((x) => x !== t))}><X className="h-3 w-3" /></button>
                </span>
              ))}
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); } if (e.key === "Backspace" && !tagInput && d.tags.length) set("tags", d.tags.slice(0, -1)); }} onBlur={() => addTag(tagInput)} placeholder={d.tags.length ? "" : "e.g. whatsapp, delivery"} className="min-w-[90px] flex-1 border-0 bg-transparent p-0.5 text-xs outline-none focus:ring-0 dark:text-white" />
            </div>
          </div>

          <div className={card}>
            <p className="mb-3 text-sm font-bold text-zinc-900 dark:text-white">Author</p>
            <label className={label}>Name</label>
            <input value={d.author_name} onChange={(e) => set("author_name", e.target.value)} maxLength={80} className={input} />
            <label className={`${label} mt-3`}>Role <span className="font-normal text-zinc-400">(optional)</span></label>
            <input value={d.author_role} onChange={(e) => set("author_role", e.target.value)} maxLength={80} placeholder="e.g. Growth team, Duka" className={input} />
          </div>

          <div className={card}>
            <p className="mb-3 text-sm font-bold text-zinc-900 dark:text-white">Link &amp; SEO</p>
            <label className={label}>Web address</label>
            <div className="flex items-center rounded-xl border border-zinc-200 focus-within:border-amber-400 dark:border-zinc-700">
              <span className="pl-3 text-xs text-zinc-400">/blog/</span>
              <input value={slug} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 100)); }} className="min-w-0 flex-1 border-0 bg-transparent py-2 pl-0.5 pr-3 text-sm outline-none focus:ring-0 dark:text-white" />
            </div>
            {live && slug !== saved.slug && <p className="mt-1 text-[11px] text-amber-700">Changing the address breaks links people already shared.</p>}
            <div className="mb-1 mt-3 flex items-center justify-between"><label className={label.replace("mb-1.5 ", "")}>SEO title</label><Counter n={d.seo_title.length} max={60} /></div>
            <input value={d.seo_title} onChange={(e) => set("seo_title", e.target.value)} maxLength={70} placeholder={d.title || "Defaults to the post title"} className={input} />
            <div className="mb-1 mt-3 flex items-center justify-between"><label className={label.replace("mb-1.5 ", "")}>SEO description</label><Counter n={d.seo_description.length} max={160} /></div>
            <textarea value={d.seo_description} onChange={(e) => set("seo_description", e.target.value)} maxLength={170} rows={3} placeholder="Defaults to the summary" className={`${input} resize-none`} />
            <p className="mb-1.5 mt-4 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Google preview</p>
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="truncate text-[12px] text-zinc-500">dukanigeria.com › blog › {slug}</p>
              <p className="truncate text-[15px] font-medium text-[#1a0dab] dark:text-[#8ab4f8]">{seoTitle.slice(0, 60)}{seoTitle.length > 60 ? "…" : ""}</p>
              <p className="line-clamp-2 text-[12px] text-zinc-600 dark:text-zinc-400">{seoDesc.slice(0, 160)}</p>
            </div>
          </div>

          {id && (
            <button type="button" onClick={remove} className="flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
              <Trash2 className="h-4 w-4" /> Delete post
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
