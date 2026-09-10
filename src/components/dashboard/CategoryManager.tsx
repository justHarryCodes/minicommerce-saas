"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Loader2,
  Tag,
  FolderOpen,
  Sparkles,
  X,
} from "lucide-react";
import type { Category } from "@/types";

interface CategoryWithSubs extends Category {
  subcategories: Category[];
}

interface Props {
  storeId: string;
  categories: CategoryWithSubs[];
}

export default function CategoryManager({ storeId, categories }: Props) {
  const router = useRouter();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Add category modal state
  const [addModal, setAddModal] = useState<{ parentId?: string } | null>(null);
  const [addName, setAddName] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // AI suggest-categories modal state
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiDescription, setAiDescription] = useState("");
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiCreating, setAiCreating] = useState(false);
  const [aiSuggested, setAiSuggested] = useState<
    { name: string; subcategories: string[] }[]
  >([]);

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
      toast.error(err instanceof Error ? err.message : "Couldn't generate suggestions");
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
          : c
      )
    );
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
              })
            )
          );
        })
      );
      toast.success("Categories created!");
      setAiModalOpen(false);
      setAiDescription("");
      setAiSuggested([]);
      router.refresh();
    } catch {
      toast.error("Some categories may not have been created");
    } finally {
      setAiCreating(false);
    }
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleAdd() {
    if (!addName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          
          name: addName.trim(),
          parentId: addModal?.parentId ?? null,
        }),
      });
      if (!res.ok) throw new Error("Failed to create category");
      toast.success("Category created!");
      setAddModal(null);
      setAddName("");
      router.refresh();
    } catch {
      toast.error("Failed to create category");
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

  return (
    <div className="space-y-4">
      {/* Add top-level category / AI suggest */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setAddModal({})}
          className="flex items-center gap-2 text-sm font-semibold text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add category
        </button>
        <button
          onClick={() => setAiModalOpen(true)}
          className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Suggest with AI
        </button>
      </div>

      {/* Categories list */}
      {categories.length === 0 ? (
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-12 text-center">
          <Tag className="w-10 h-10 text-surface-200 dark:text-surface-700 mx-auto mb-3" />
          <h3 className="font-semibold text-surface-900 dark:text-white mb-1">
            No categories yet
          </h3>
          <p className="text-sm text-surface-400">
            Add categories to organize your products
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => {
            const isExpanded = expandedIds.has(cat.id);
            const isEditing = editId === cat.id;

            return (
              <div
                key={cat.id}
                className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 overflow-hidden"
              >
                {/* Category row */}
                <div className="flex items-center gap-2 p-4">
                  <button
                    onClick={() => toggleExpand(cat.id)}
                    className="text-surface-400 hover:text-surface-600 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  <FolderOpen className="w-4 h-4 text-accent-500 shrink-0" />

                  {isEditing ? (
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleEdit(cat.id);
                        if (e.key === "Escape") setEditId(null);
                      }}
                      className="flex-1 px-2 py-1 text-sm rounded border border-accent-400 focus:outline-none bg-white dark:bg-surface-800 text-surface-900 dark:text-white"
                    />
                  ) : (
                    <span className="flex-1 font-medium text-sm text-surface-900 dark:text-white">
                      {cat.name}
                    </span>
                  )}

                  <span className="text-xs text-surface-400 shrink-0">
                    {cat.subcategories.length > 0
                      ? `${cat.subcategories.length} sub`
                      : ""}
                  </span>

                  {isEditing ? (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleEdit(cat.id)}
                        disabled={saving}
                        className="text-xs px-2 py-1 bg-accent-400 text-black rounded font-semibold"
                      >
                        {saving ? "…" : "Save"}
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        className="text-xs px-2 py-1 bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditId(cat.id);
                          setEditName(cat.name);
                        }}
                        className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-all"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="p-1.5 rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Subcategories */}
                {isExpanded && (
                  <div className="border-t border-surface-50 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/30">
                    {cat.subcategories.map((sub) => {
                      const isSubEditing = editId === sub.id;
                      return (
                        <div
                          key={sub.id}
                          className="flex items-center gap-2 px-4 py-3 border-b border-surface-100 dark:border-surface-800 last:border-0"
                        >
                          <div className="w-6 shrink-0" />
                          <Tag className="w-3.5 h-3.5 text-surface-400 shrink-0" />

                          {isSubEditing ? (
                            <input
                              autoFocus
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleEdit(sub.id);
                                if (e.key === "Escape") setEditId(null);
                              }}
                              className="flex-1 px-2 py-1 text-sm rounded border border-accent-400 focus:outline-none bg-white dark:bg-surface-800 text-surface-900 dark:text-white"
                            />
                          ) : (
                            <span className="flex-1 text-sm text-surface-700 dark:text-surface-300">
                              {sub.name}
                            </span>
                          )}

                          {isSubEditing ? (
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleEdit(sub.id)}
                                className="text-xs px-2 py-1 bg-accent-400 text-black rounded font-semibold"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditId(null)}
                                className="text-xs px-2 py-1 bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 rounded"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditId(sub.id);
                                  setEditName(sub.name);
                                }}
                                className="p-1.5 rounded text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-700 transition-all"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDelete(sub.id)}
                                className="p-1.5 rounded text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Add subcategory */}
                    <button
                      onClick={() => setAddModal({ parentId: cat.id })}
                      className="flex items-center gap-2 w-full px-4 py-3 text-sm text-accent-600 dark:text-accent-400 hover:bg-accent-50 dark:hover:bg-accent-950/20 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add subcategory
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add modal */}
      {addModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-bold text-surface-900 dark:text-white mb-4">
              {addModal.parentId ? "Add subcategory" : "Add category"}
            </h3>
            <input
              autoFocus
              type="text"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") setAddModal(null);
              }}
              placeholder="Category name…"
              className="w-full px-3.5 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent-400 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setAddModal(null); setAddName(""); }}
                className="flex-1 py-2.5 rounded-lg bg-surface-100 dark:bg-surface-800 text-surface-900 dark:text-white text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={saving || !addName.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-accent-400 hover:bg-accent-500 disabled:opacity-50 text-black text-sm font-bold transition-all"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {saving ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI suggest modal */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 p-6 w-full max-w-md shadow-xl max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold text-surface-900 dark:text-white mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Suggest categories with AI
            </h3>
            <p className="text-xs text-surface-400 mb-4">
              Describe what your store sells — the more specific, the better the suggestions.
            </p>
            <textarea
              autoFocus
              rows={3}
              value={aiDescription}
              onChange={(e) => setAiDescription(e.target.value)}
              placeholder="e.g. I sell handmade leather bags, wallets, and belts for men and women"
              className="w-full px-3.5 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent-400 mb-3 resize-none"
            />

            {aiSuggested.length === 0 ? (
              <button
                onClick={handleAiSuggest}
                disabled={aiSuggesting || aiDescription.trim().length < 10}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-black text-sm font-bold transition-all mb-3"
              >
                {aiSuggesting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {aiSuggesting ? "Organizing your store…" : "Generate suggestions"}
              </button>
            ) : (
              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                <p className="text-xs font-semibold text-surface-500">
                  Remove anything you don&apos;t want, then create:
                </p>
                {aiSuggested.map((cat) => (
                  <div key={cat.name} className="bg-surface-50 dark:bg-surface-800 rounded-lg p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-surface-900 dark:text-white">
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
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {cat.subcategories.map((sub) => (
                          <span
                            key={sub}
                            className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md bg-white dark:bg-surface-900 text-xs text-surface-600 dark:text-surface-400"
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
                onClick={() => {
                  setAiModalOpen(false);
                  setAiDescription("");
                  setAiSuggested([]);
                }}
                className="flex-1 py-2.5 rounded-lg bg-surface-100 dark:bg-surface-800 text-surface-900 dark:text-white text-sm font-medium"
              >
                Cancel
              </button>
              {aiSuggested.length > 0 && (
                <button
                  onClick={handleAiCreateAll}
                  disabled={aiCreating}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-accent-400 hover:bg-accent-500 disabled:opacity-50 text-black text-sm font-bold transition-all"
                >
                  {aiCreating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {aiCreating ? "Creating…" : `Create ${aiSuggested.length} categories`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
