"use client";

// Category + subcategory for a product, with everything a seller needs right
// here: pick, or create a new one without leaving the form, plus a short
// guide and one-tap ideas so new sellers organise their store well.

import { useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { ChevronDown, FolderPlus, Info, Loader2, Plus, Sparkles, X } from "lucide-react";
import { Select } from "@/components/ui/Select";
import type { Category } from "@/types";
import { subcategoryIdeas, STARTER_CATEGORIES } from "@/lib/category-ideas";

type Cat = Category & { subcategories?: Category[] };

interface Props {
  categories: Cat[];
  onCategoriesChange: (next: Cat[]) => void;
  categoryId: string;
  subcategoryId: string;
  onCategoryChange: (id: string) => void;
  onSubcategoryChange: (id: string) => void;
  /** Extra content under the category select (e.g. the AI suggestion chip) */
  categoryExtra?: React.ReactNode;
}

const parentOf = (c: Category) => c.parent_id ?? c.parentId ?? null;
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

const inputClass =
  "min-w-0 flex-1 rounded-xl border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-400/30 dark:border-surface-700 dark:bg-surface-900 dark:text-white";
const labelClass = "mb-1.5 block text-xs font-semibold text-surface-600 dark:text-surface-300";
const chipClass =
  "inline-flex items-center gap-1 rounded-full border border-surface-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-surface-600 transition-colors hover:border-accent-300 hover:bg-accent-50 hover:text-accent-700 disabled:opacity-50 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:bg-surface-800";

export default function ProductCategoryFields({ categories, onCategoriesChange, categoryId, subcategoryId, onCategoryChange, onSubcategoryChange, categoryExtra }: Props) {
  const topCats = useMemo(() => categories.filter((c) => !parentOf(c)), [categories]);
  const subCats = useMemo(() => (categoryId ? categories.filter((c) => parentOf(c) === categoryId) : []), [categories, categoryId]);
  const selectedCat = topCats.find((c) => c.id === categoryId);

  const [adding, setAdding] = useState<"cat" | "sub" | null>(topCats.length === 0 ? "cat" : null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const ideas = useMemo(
    () => (selectedCat ? subcategoryIdeas(selectedCat.name).filter((i) => !subCats.some((s) => same(s.name, i))).slice(0, 6) : []),
    [selectedCat, subCats],
  );
  const starters = STARTER_CATEGORIES.filter((s) => !topCats.some((c) => same(c.name, s))).slice(0, 8);

  async function create(kind: "cat" | "sub", raw: string) {
    const value = raw.trim().replace(/\s+/g, " ");
    if (!value) return;
    if (value.length > 100) return toast.error("Keep the name under 100 characters.");
    // Already there: just pick it
    const pool = kind === "cat" ? topCats : subCats;
    const existing = pool.find((c) => same(c.name, value));
    if (existing) {
      if (kind === "cat") onCategoryChange(existing.id);
      else onSubcategoryChange(existing.id);
      setName("");
      setAdding(null);
      toast.success(`"${existing.name}" already exists, so it's selected.`);
      return;
    }
    if (kind === "sub" && !categoryId) return toast.error("Choose a category first.");
    setSaving(true);
    try {
      const res = await fetch(kind === "cat" ? "/api/categories" : "/api/subcategories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(kind === "cat" ? { name: value } : { categoryId, name: value }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.data?.id) {
        const msg = typeof json.error === "string" ? json.error : json.error?.fieldErrors?.name?.[0] ?? "Couldn't create it. Please try again.";
        throw new Error(msg);
      }
      const created: Cat = { ...json.data, parent_id: kind === "cat" ? null : categoryId };
      onCategoriesChange([...categories, created]);
      if (kind === "cat") onCategoryChange(created.id);
      else onSubcategoryChange(created.id);
      toast.success(kind === "cat" ? `Category "${value}" created` : `Subcategory "${value}" created`);
      setName("");
      setAdding(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create it.");
    } finally {
      setSaving(false);
    }
  }

  const creator = (kind: "cat" | "sub") => (
    <div className="mt-2 rounded-xl border border-dashed border-accent-300 bg-accent-50/50 p-2.5 dark:border-accent-800 dark:bg-accent-950/20">
      <div className="flex gap-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); void create(kind, name); }
            if (e.key === "Escape") { setAdding(null); setName(""); }
          }}
          maxLength={100}
          placeholder={kind === "cat" ? "e.g. Shoes, Wigs, Phones" : `e.g. a type of ${selectedCat?.name ?? "product"}`}
          aria-label={kind === "cat" ? "New category name" : "New subcategory name"}
          className={inputClass}
        />
        <button type="button" disabled={saving || !name.trim()} onClick={() => create(kind, name)} className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-surface-900 px-3 text-xs font-bold text-white disabled:opacity-40 dark:bg-white dark:text-surface-900">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Add
        </button>
        {(topCats.length > 0 || kind === "sub") && (
          <button type="button" onClick={() => { setAdding(null); setName(""); }} aria-label="Cancel" className="grid w-8 shrink-0 place-items-center rounded-xl text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-surface-500">
        {kind === "cat"
          ? "Name it the way shoppers look for it. Short and plural works best: “Shoes”, not “Our Shoe Collection 2025”."
          : `A narrower group inside ${selectedCat?.name ?? "this category"}, so shoppers find things faster.`}
      </p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Guide */}
      <div className="rounded-xl bg-surface-50 px-3 py-2.5 dark:bg-surface-800/50">
        <button type="button" onClick={() => setShowGuide((v) => !v)} className="flex w-full items-center gap-2 text-left text-xs font-semibold text-surface-700 dark:text-surface-200" aria-expanded={showGuide}>
          <Info className="h-4 w-4 shrink-0 text-accent-500" />
          <span className="flex-1">How categories help you sell</span>
          <ChevronDown className={`h-4 w-4 text-surface-400 transition-transform ${showGuide ? "rotate-180" : ""}`} />
        </button>
        {showGuide && (
          <div className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-surface-600 dark:text-surface-300">
            <p><strong className="text-surface-900 dark:text-white">Category</strong> is the aisle in your shop, like <em>Shoes</em> or <em>Bags</em>. It becomes a menu item on your store.</p>
            <p><strong className="text-surface-900 dark:text-white">Subcategory</strong> is a shelf inside that aisle, like <em>Sneakers</em> or <em>Sandals</em>. Optional, but handy once a category has more than ~10 products.</p>
            <ul className="list-disc space-y-0.5 pl-4 marker:text-accent-400">
              <li>Keep it to about 3–8 main categories.</li>
              <li>Use the words customers search for.</li>
              <li>Every product should sit in one category; it also helps Google and WhatsApp catalogs.</li>
            </ul>
            <p>
              You can rename or reorder them anytime in{" "}
              <Link href="/dashboard/categories" className="font-semibold text-accent-600 hover:underline dark:text-accent-400">Categories</Link>.
            </p>
          </div>
        )}
      </div>

      {/* Category */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className={labelClass.replace("mb-1.5 ", "")} htmlFor="pf-cat">Category</label>
          {topCats.length > 0 && adding !== "cat" && (
            <button type="button" onClick={() => { setAdding("cat"); setName(""); }} className="inline-flex items-center gap-1 text-[11px] font-bold text-accent-600 hover:underline dark:text-accent-400">
              <FolderPlus className="h-3.5 w-3.5" /> New category
            </button>
          )}
        </div>
        {topCats.length > 0 && (
          <Select
            id="pf-cat"
            value={categoryId}
            placeholder="Select category"
            onChange={(v) => onCategoryChange(v)}
            options={[{ value: "", label: "No category" }, ...topCats.map((c) => ({ value: c.id, label: c.name }))]}
          />
        )}
        {topCats.length === 0 && (
          <p className="text-[12px] text-surface-500">You don&apos;t have any categories yet. Create your first one here; it takes a second.</p>
        )}
        {adding === "cat" && creator("cat")}
        {adding === "cat" && topCats.length === 0 && starters.length > 0 && (
          <div className="mt-2">
            <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-surface-500"><Sparkles className="h-3 w-3 text-accent-500" /> Popular starting points</p>
            <div className="flex flex-wrap gap-1.5">
              {starters.map((s) => <button key={s} type="button" disabled={saving} onClick={() => create("cat", s)} className={chipClass}><Plus className="h-3 w-3" />{s}</button>)}
            </div>
          </div>
        )}
        {categoryExtra}
      </div>

      {/* Subcategory */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className={labelClass.replace("mb-1.5 ", "")} htmlFor="pf-sub">
            Subcategory <span className="font-normal text-surface-400">(optional)</span>
          </label>
          {categoryId && adding !== "sub" && (
            <button type="button" onClick={() => { setAdding("sub"); setName(""); }} className="inline-flex items-center gap-1 text-[11px] font-bold text-accent-600 hover:underline dark:text-accent-400">
              <Plus className="h-3.5 w-3.5" /> New subcategory
            </button>
          )}
        </div>
        <Select
          id="pf-sub"
          value={subcategoryId}
          placeholder={!categoryId ? "Choose a category first" : subCats.length === 0 ? "None yet" : "Select subcategory"}
          onChange={(v) => onSubcategoryChange(v)}
          disabled={!categoryId || subCats.length === 0}
          options={[{ value: "", label: "None" }, ...subCats.map((c) => ({ value: c.id, label: c.name }))]}
        />
        {adding === "sub" && creator("sub")}
        {categoryId && ideas.length > 0 && adding !== "cat" && (
          <div className="mt-2">
            <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-surface-500">
              <Sparkles className="h-3 w-3 text-accent-500" /> Ideas for {selectedCat?.name}: tap to add
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ideas.map((i) => <button key={i} type="button" disabled={saving} onClick={() => create("sub", i)} className={chipClass}><Plus className="h-3 w-3" />{i}</button>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
