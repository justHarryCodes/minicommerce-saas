"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Plus,
  ChevronRight,
  Pencil,
  Trash2,
  Loader2,
  Tag,
  FolderOpen,
  Sparkles,
  X,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import type { Category } from "@/types";

interface CategoryWithSubs extends Category {
  subcategories: Category[];
}

interface Props {
  storeId: string;
  categories: CategoryWithSubs[];
}

type Suggested = { name: string; subcategories: string[] };

export default function CategoryManager({ storeId, categories }: Props) {
  const router = useRouter();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Add top-level category modal
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [saving, setSaving] = useState(false);

  // Inline add subcategory
  const [subParentId, setSubParentId] = useState<string | null>(null);
  const [subName, setSubName] = useState("");

  // Inline edit
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // AI modal
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiDescription, setAiDescription] = useState("");
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiCreating, setAiCreating] = useState(false);
  const [aiSuggested, setAiSuggested] = useState<Suggested[]>([]);

  const totalSubs = categories.reduce((n, c) => n + c.subcategories.length, 0);
  const allExpanded =
    categories.length > 0 && expandedIds.size === categories.length;

  /* ───────────────────────────── AI ───────────────────────────── */

  async function handleAiSuggest() {
    if (aiDescription.trim().length < 10) {
      toast.error("Add a bit more detail first");
      return;
    }
    setAiSuggesting(true);
    try {
      const res = await fetch("/api/ai/suggest-store-structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: aiDescription.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Suggestion failed");
      setAiSuggested(data.categories ?? []);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't generate suggestions",
      );
    } finally {
      setAiSuggesting(false);
    }
  }

  function removeAiCategory(name: string) {
    setAiSuggested((prev) => prev.filter((c) => c.name !== name));
  }

  function removeAiSubcategory(categoryName: string, sub: string) {
    setAiSuggested((prev) =>
      prev.map((c) =>
        c.name === categoryName
          ? { ...c, subcategories: c.subcategories.filter((s) => s !== sub) }
          : c,
      ),
    );
  }

  function closeAiModal() {
    setAiModalOpen(false);
    setAiDescription("");
    setAiSuggested([]);
  }

  async function handleAiCreateAll() {
    setAiCreating(true);
    try {
      await Promise.allSettled(
        aiSuggested.map(async (cat) => {
          const res = await fetch("/api/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: cat.name }),
          });
          const json = await res.json();
          const parentId = json?.data?.id;
          if (!parentId) return;
          await Promise.allSettled(
            cat.subcategories.map((sub) =>
              fetch("/api/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: sub, parentId }),
              }),
            ),
          );
        }),
      );
      toast.success("Categories created!");
      closeAiModal();
      router.refresh();
    } catch {
      toast.error("Some categories may not have been created");
    } finally {
      setAiCreating(false);
    }
  }

  /* ─────────────────────────── Actions ─────────────────────────── */

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setExpandedIds(
      allExpanded ? new Set() : new Set(categories.map((c) => c.id)),
    );
  }

  async function createCategory(name: string, parentId: string | null) {
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, parentId }),
    });
    if (!res.ok) throw new Error("Failed to create category");
  }

  async function handleAdd() {
    if (!addName.trim()) return;
    setSaving(true);
    try {
      await createCategory(addName.trim(), null);
      toast.success("Category created!");
      setAddOpen(false);
      setAddName("");
      router.refresh();
    } catch {
      toast.error("Failed to create category");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddSub(parentId: string) {
    if (!subName.trim()) return;
    setSaving(true);
    try {
      await createCategory(subName.trim(), parentId);
      toast.success("Subcategory added!");
      setSubName(""); // keep the field open so several can be added in a row
      router.refresh();
    } catch {
      toast.error("Failed to add subcategory");
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(id: string) {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Category updated!");
      setEditId(null);
      router.refresh();
    } catch {
      toast.error("Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this category? Products won't be deleted.")) return;
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Category deleted");
      router.refresh();
    } catch {
      toast.error("Delete failed");
    }
  }

  /* ───────────────────────── Shared bits ───────────────────────── */

  const inputCls =
    "w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-white text-sm placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-accent-400";

  const iconBtn =
    "p-2 rounded-lg text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors";

  function EditControls({ id }: { id: string }) {
    return (
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => handleEdit(id)}
          disabled={saving}
          aria-label="Save"
          className="p-2 rounded-lg bg-accent-400 hover:bg-accent-500 text-black transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
        </button>
        <button
          onClick={() => setEditId(null)}
          aria-label="Cancel"
          className={iconBtn}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  /* ───────────────────────────── Render ───────────────────────────── */

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-surface-500 dark:text-surface-400">
          {categories.length === 0
            ? "No categories yet"
            : `${categories.length} categor${categories.length === 1 ? "y" : "ies"} · ${totalSubs} subcategor${totalSubs === 1 ? "y" : "ies"}`}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {categories.length > 1 && (
            <button
              onClick={toggleAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-surface-500 hover:text-surface-800 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
            >
              <ChevronsUpDown className="w-4 h-4" />
              {allExpanded ? "Collapse all" : "Expand all"}
            </button>
          )}
          <button
            onClick={() => setAiModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Suggest with AI
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-accent-400 hover:bg-accent-500 text-black transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add category
          </button>
        </div>
      </div>

      {/* List / empty state */}
      {categories.length === 0 ? (
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-dashed border-surface-200 dark:border-surface-700 px-6 py-14 text-center">
          <div className="w-14 h-14 rounded-2xl bg-accent-50 dark:bg-accent-950/30 flex items-center justify-center mx-auto mb-4">
            <Tag className="w-6 h-6 text-accent-500" />
          </div>
          <h3 className="font-bold text-surface-900 dark:text-white mb-1">
            Organize your products
          </h3>
          <p className="text-sm text-surface-500 dark:text-surface-400 max-w-sm mx-auto mb-6">
            Categories help shoppers find things fast. Let AI build a structure
            from a short description, or add your own.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={() => setAiModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-amber-400 hover:bg-amber-500 text-black transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Suggest with AI
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-surface-100 dark:bg-surface-800 text-surface-900 dark:text-white hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add manually
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => {
            const isExpanded = expandedIds.has(cat.id);
            const isEditing = editId === cat.id;
            const subCount = cat.subcategories.length;

            return (
              <div
                key={cat.id}
                className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 overflow-hidden"
              >
                {/* Category row */}
                <div className="group flex items-center gap-3 px-4 py-3.5">
                  <button
                    onClick={() => toggleExpand(cat.id)}
                    aria-label={isExpanded ? "Collapse" : "Expand"}
                    aria-expanded={isExpanded}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    disabled={isEditing}
                  >
                    <ChevronRight
                      className={`w-4 h-4 text-surface-400 shrink-0 transition-transform duration-200 ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    />
                    <span className="w-9 h-9 rounded-xl bg-accent-50 dark:bg-accent-950/30 flex items-center justify-center shrink-0">
                      <FolderOpen className="w-4 h-4 text-accent-600 dark:text-accent-400" />
                    </span>
                    {!isEditing && (
                      <span className="min-w-0">
                        <span className="block font-semibold text-sm text-surface-900 dark:text-white truncate">
                          {cat.name}
                        </span>
                        <span className="block text-xs text-surface-400">
                          {subCount === 0
                            ? "No subcategories"
                            : `${subCount} subcategor${subCount === 1 ? "y" : "ies"}`}
                        </span>
                      </span>
                    )}
                  </button>

                  {isEditing ? (
                    <>
                      <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleEdit(cat.id);
                          if (e.key === "Escape") setEditId(null);
                        }}
                        className={`${inputCls} flex-1 !py-2`}
                      />
                      <EditControls id={cat.id} />
                    </>
                  ) : (
                    <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditId(cat.id);
                          setEditName(cat.name);
                        }}
                        aria-label={`Rename ${cat.name}`}
                        className={iconBtn}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        aria-label={`Delete ${cat.name}`}
                        className="p-2 rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Subcategories */}
                {isExpanded && (
                  <div className="border-t border-surface-100 dark:border-surface-800 bg-surface-50/60 dark:bg-surface-800/20 px-4 py-3 space-y-1">
                    {cat.subcategories.map((sub) => {
                      const isSubEditing = editId === sub.id;
                      return (
                        <div
                          key={sub.id}
                          className="group flex items-center gap-2.5 pl-7 py-1"
                        >
                          <Tag className="w-3.5 h-3.5 text-surface-300 dark:text-surface-600 shrink-0" />
                          {isSubEditing ? (
                            <>
                              <input
                                autoFocus
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleEdit(sub.id);
                                  if (e.key === "Escape") setEditId(null);
                                }}
                                className={`${inputCls} flex-1 !py-1.5`}
                              />
                              <EditControls id={sub.id} />
                            </>
                          ) : (
                            <>
                              <span className="flex-1 text-sm text-surface-700 dark:text-surface-300 truncate">
                                {sub.name}
                              </span>
                              <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                <button
                                  onClick={() => {
                                    setEditId(sub.id);
                                    setEditName(sub.name);
                                  }}
                                  aria-label={`Rename ${sub.name}`}
                                  className={iconBtn}
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDelete(sub.id)}
                                  aria-label={`Delete ${sub.name}`}
                                  className="p-2 rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}

                    {/* Inline add subcategory */}
                    {subParentId === cat.id ? (
                      <div className="flex items-center gap-2 pl-7 pt-1">
                        <input
                          autoFocus
                          value={subName}
                          onChange={(e) => setSubName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddSub(cat.id);
                            if (e.key === "Escape") {
                              setSubParentId(null);
                              setSubName("");
                            }
                          }}
                          placeholder="Subcategory name, then press Enter"
                          className={`${inputCls} flex-1 !py-2`}
                        />
                        <button
                          onClick={() => handleAddSub(cat.id)}
                          disabled={saving || !subName.trim()}
                          className="px-3.5 py-2 rounded-xl bg-accent-400 hover:bg-accent-500 disabled:opacity-50 text-black text-sm font-bold"
                        >
                          {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Add"
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setSubParentId(null);
                            setSubName("");
                          }}
                          aria-label="Done"
                          className={iconBtn}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSubParentId(cat.id);
                          setSubName("");
                        }}
                        className="flex items-center gap-2 pl-7 py-1.5 text-sm font-semibold text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add subcategory
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ───────── Add category modal ───────── */}
      {addOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => {
            setAddOpen(false);
            setAddName("");
          }}
        >
          <div
            className="bg-white dark:bg-surface-900 rounded-t-3xl sm:rounded-2xl border border-surface-200 dark:border-surface-700 p-6 w-full sm:max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-lg text-surface-900 dark:text-white mb-1">
              New category
            </h3>
            <p className="text-xs text-surface-400 mb-4">
              You can add subcategories after it&apos;s created.
            </p>
            <input
              autoFocus
              type="text"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") {
                  setAddOpen(false);
                  setAddName("");
                }
              }}
              placeholder="e.g. Handbags"
              className={`${inputCls} mb-5`}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setAddOpen(false);
                  setAddName("");
                }}
                className="flex-1 py-2.5 rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-900 dark:text-white text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={saving || !addName.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent-400 hover:bg-accent-500 disabled:opacity-50 text-black text-sm font-bold transition-all"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {saving ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────── AI suggest modal ───────── */}
      {aiModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm"
          onClick={closeAiModal}
        >
          <div
            className="bg-white dark:bg-surface-900 rounded-t-3xl sm:rounded-2xl border border-surface-200 dark:border-surface-700 p-6 w-full sm:max-w-md shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <span className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </span>
              <div>
                <h3 className="font-bold text-lg text-surface-900 dark:text-white leading-tight">
                  Suggest categories with AI
                </h3>
                <p className="text-xs text-surface-400 mt-0.5">
                  Describe what you sell. The more specific, the better.
                </p>
              </div>
            </div>

            <textarea
              autoFocus
              rows={3}
              value={aiDescription}
              onChange={(e) => setAiDescription(e.target.value)}
              placeholder="e.g. I sell handmade leather bags, wallets, and belts for men and women"
              className={`${inputCls} mb-3 resize-none`}
            />

            {aiSuggested.length === 0 ? (
              <button
                onClick={handleAiSuggest}
                disabled={aiSuggesting || aiDescription.trim().length < 10}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-black text-sm font-bold transition-all mb-3"
              >
                {aiSuggesting && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                {aiSuggesting
                  ? "Organizing your store…"
                  : "Generate suggestions"}
              </button>
            ) : (
              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto pr-1">
                <p className="text-xs font-semibold text-surface-500">
                  Remove anything you don&apos;t want, then create:
                </p>
                {aiSuggested.map((cat) => (
                  <div
                    key={cat.name}
                    className="bg-surface-50 dark:bg-surface-800 rounded-xl p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm font-semibold text-surface-900 dark:text-white">
                        <FolderOpen className="w-3.5 h-3.5 text-accent-500" />
                        {cat.name}
                      </span>
                      <button
                        onClick={() => removeAiCategory(cat.name)}
                        className="text-surface-400 hover:text-red-500 transition-colors shrink-0"
                        aria-label={`Remove ${cat.name}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {cat.subcategories.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {cat.subcategories.map((sub) => (
                          <span
                            key={sub}
                            className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full bg-white dark:bg-surface-900 border border-surface-100 dark:border-surface-700 text-xs text-surface-600 dark:text-surface-400"
                          >
                            {sub}
                            <button
                              onClick={() => removeAiSubcategory(cat.name, sub)}
                              className="text-surface-400 hover:text-red-500 transition-colors"
                              aria-label={`Remove ${sub}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={closeAiModal}
                className="flex-1 py-2.5 rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-900 dark:text-white text-sm font-medium"
              >
                Cancel
              </button>
              {aiSuggested.length > 0 && (
                <button
                  onClick={handleAiCreateAll}
                  disabled={aiCreating}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent-400 hover:bg-accent-500 disabled:opacity-50 text-black text-sm font-bold transition-all"
                >
                  {aiCreating && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  {aiCreating
                    ? "Creating…"
                    : `Create ${aiSuggested.length} categor${aiSuggested.length === 1 ? "y" : "ies"}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
