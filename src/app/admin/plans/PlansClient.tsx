"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Plus, Pencil, Check, X, Trash2 } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  max_products: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency", currency: "NGN", maximumFractionDigits: 0,
  }).format(n);
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
      style={{ background: enabled ? "var(--accent)" : "var(--bg-tertiary)" }}
    >
      <span
        className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
        style={{ transform: enabled ? "translateX(22px)" : "translateX(2px)" }}
      />
    </button>
  );
}

const EMPTY = { name: "", description: "", price_monthly: 5000, max_products: 100 };

export default function PlansClient({ initialPlans }: { initialPlans: Plan[] }) {
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Plan>>({});

  async function addPlan() {
    if (!form.name.trim()) { toast.error("Plan name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to create plan"); return; }
      toast.success("Plan created");
      setShowAdd(false);
      setForm(EMPTY);
      // Refresh list
      const r2 = await fetch("/api/admin/plans");
      const d2 = await r2.json();
      if (d2.data) setPlans(d2.data);
    } catch { toast.error("Network error"); }
    finally { setSaving(false); }
  }

  async function toggleActive(plan: Plan) {
    const res = await fetch(`/api/admin/plans/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !plan.is_active }),
    });
    if (res.ok) {
      setPlans((prev) => prev.map((p) => p.id === plan.id ? { ...p, is_active: !p.is_active } : p));
    } else {
      toast.error("Failed to update plan");
    }
  }

  async function saveEdit(id: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/plans/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) { toast.error("Failed to update"); return; }
      toast.success("Plan updated");
      setPlans((prev) => prev.map((p) => p.id === id ? { ...p, ...editForm } as Plan : p));
      setEditId(null);
    } catch { toast.error("Network error"); }
    finally { setSaving(false); }
  }

  async function deletePlan(id: string, name: string) {
    if (!confirm(`Delete plan "${name}"? Vendors currently on this plan won't be affected, but it won't appear for new subscriptions.`)) return;
    const res = await fetch(`/api/admin/plans/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPlans((prev) => prev.filter((p) => p.id !== id));
      toast.success("Plan deleted");
    } else {
      toast.error("Failed to delete");
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black mb-1" style={{ color: "var(--text-primary)" }}>Subscription Plans</h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Plans vendors can subscribe to when plan subscriptions are required. Toggle them in Settings.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-black"
          style={{ background: "var(--accent)" }}
        >
          <Plus className="w-4 h-4" />
          Add Plan
        </button>
      </div>

      {/* Add plan form */}
      {showAdd && (
        <div className="rounded-2xl border p-5 mb-5"
          style={{ background: "var(--bg)", borderColor: "var(--accent)" }}>
          <h3 className="font-bold mb-4" style={{ color: "var(--text-primary)" }}>New Plan</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Plan Name *</label>
              <input
                type="text"
                placeholder="e.g. Basic, Pro, Enterprise"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Description</label>
              <input
                type="text"
                placeholder="Short description (optional)"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Monthly Price (₦)</label>
              <input
                type="number"
                min={0}
                value={form.price_monthly}
                onChange={(e) => setForm((f) => ({ ...f, price_monthly: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Max Products</label>
              <input
                type="number"
                min={1}
                value={form.max_products}
                onChange={(e) => setForm((f) => ({ ...f, max_products: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text-primary)" }}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addPlan}
              disabled={saving}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-black disabled:opacity-60"
              style={{ background: "var(--accent)" }}
            >
              {saving ? "Creating…" : "Create Plan"}
            </button>
            <button
              onClick={() => { setShowAdd(false); setForm(EMPTY); }}
              className="px-5 py-2 rounded-xl text-sm font-semibold border"
              style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Plans list */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
        {plans.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No plans yet. Click "Add Plan" to create one.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs font-semibold uppercase tracking-wide"
                style={{ borderColor: "var(--border)", color: "var(--text-muted)", background: "var(--bg-secondary)" }}>
                <th className="px-6 py-3 text-left">Plan</th>
                <th className="px-6 py-3 text-left">Price / mo</th>
                <th className="px-6 py-3 text-left">Max Products</th>
                <th className="px-6 py-3 text-left">Active</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {plans.map((plan) => (
                <tr key={plan.id}>
                  {editId === plan.id ? (
                    <>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          value={editForm.name ?? plan.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          className="w-full px-2 py-1 rounded border text-sm outline-none"
                          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                        />
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="number"
                          value={editForm.price_monthly ?? plan.price_monthly}
                          onChange={(e) => setEditForm((f) => ({ ...f, price_monthly: Number(e.target.value) }))}
                          className="w-24 px-2 py-1 rounded border text-sm outline-none"
                          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                        />
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="number"
                          value={editForm.max_products ?? plan.max_products}
                          onChange={(e) => setEditForm((f) => ({ ...f, max_products: Number(e.target.value) }))}
                          className="w-20 px-2 py-1 rounded border text-sm outline-none"
                          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                        />
                      </td>
                      <td className="px-6 py-3" colSpan={2}>
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit(plan.id)}
                            disabled={saving}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-black"
                            style={{ background: "var(--accent)" }}
                          >
                            <Check className="w-3.5 h-3.5" />
                            Save
                          </button>
                          <button
                            onClick={() => { setEditId(null); setEditForm({}); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border"
                            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                          >
                            <X className="w-3.5 h-3.5" />
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4">
                        <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{plan.name}</p>
                        {plan.description && (
                          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{plan.description}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold" style={{ color: "var(--text-primary)" }}>
                        {fmt(plan.price_monthly)}<span className="text-xs font-normal ml-0.5" style={{ color: "var(--text-muted)" }}>/mo</span>
                      </td>
                      <td className="px-6 py-4" style={{ color: "var(--text-secondary)" }}>
                        {plan.max_products.toLocaleString()} products
                      </td>
                      <td className="px-6 py-4">
                        <Toggle enabled={plan.is_active} onChange={() => toggleActive(plan)} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setEditId(plan.id); setEditForm({ name: plan.name, description: plan.description ?? "", price_monthly: plan.price_monthly, max_products: plan.max_products }); }}
                            className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
                            style={{ color: "var(--text-muted)" }}
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deletePlan(plan.id, plan.name)}
                            className="p-1.5 rounded-lg hover:opacity-70 transition-opacity text-red-500"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
