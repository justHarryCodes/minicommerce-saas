"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Check, Loader2, Plus } from "lucide-react";
import { PAGE_TEMPLATES, type PageTemplateId } from "@/lib/store-pages-shared";

export default function NewPageButtons({ existingSlugs, blogEnabled = true }: { existingSlugs: string[]; blogEnabled?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function create(body: { kind: "page" | "post"; template?: PageTemplateId }, key: string) {
    setBusy(key);
    const res = await fetch("/api/dashboard/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      setBusy(null);
      return toast.error(data?.error ?? "Couldn't create");
    }
    router.push(`/dashboard/pages/${data.id}`);
  }

  return (
    <div className="rounded-2xl border border-surface-100 bg-white p-4 dark:border-surface-800 dark:bg-surface-900">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-surface-400">Start from a template</p>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(PAGE_TEMPLATES) as PageTemplateId[]).map((id) => {
          const has = existingSlugs.includes(PAGE_TEMPLATES[id].slug);
          return (
            <button
              key={id}
              type="button"
              disabled={!!busy}
              onClick={() => create({ kind: "page", template: id }, id)}
              className="flex items-center gap-1.5 rounded-full border border-surface-200 px-3.5 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50 disabled:opacity-50 dark:border-surface-700 dark:text-surface-200 dark:hover:bg-surface-800"
            >
              {busy === id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : has ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Plus className="h-3.5 w-3.5" />}
              {PAGE_TEMPLATES[id].title}
            </button>
          );
        })}
        <button
          type="button"
          disabled={!!busy}
          onClick={() => create({ kind: "page" }, "blank")}
          className="flex items-center gap-1.5 rounded-full border border-dashed border-surface-300 px-3.5 py-2 text-sm font-medium text-surface-600 hover:bg-surface-50 disabled:opacity-50 dark:border-surface-600 dark:text-surface-300 dark:hover:bg-surface-800"
        >
          {busy === "blank" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Blank page
        </button>
        {blogEnabled && <button
          type="button"
          disabled={!!busy}
          onClick={() => create({ kind: "post" }, "post")}
          className="flex items-center gap-1.5 rounded-full bg-accent-400 px-3.5 py-2 text-sm font-bold text-black hover:bg-accent-500 disabled:opacity-50"
        >
          {busy === "post" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} New blog post
        </button>}
      </div>
    </div>
  );
}
