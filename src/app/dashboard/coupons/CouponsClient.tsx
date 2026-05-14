"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Tag, Plus, Trash2, ToggleLeft, ToggleRight, X, Loader2 } from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface Props {
  initialCoupons: Coupon[];
}

const emptyForm = {
  code: "",
  discount_type: "percentage" as "percentage" | "fixed",
  discount_value: "",
  min_order_amount: "",
  max_uses: "",
  expires_at: "",
};

export default function CouponsClient({ initialCoupons }: Props) {
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]: name === "code" ? value.toUpperCase() : value,
    }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code || !form.discount_value) {
      toast.error("Code and discount value are required");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        code: form.code,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : 0,
      };
      if (form.max_uses) body.max_uses = Number(form.max_uses);
      if (form.expires_at) body.expires_at = new Date(form.expires_at).toISOString();

      const res = await fetch("/api/stores/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Failed to create coupon");

      const newCoupon: Coupon = {
        id: data.id,
        code: form.code,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : 0,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        uses_count: 0,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      setCoupons((prev) => [newCoupon, ...prev]);
      setForm(emptyForm);
      setShowForm(false);
      toast.success("Coupon created!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create coupon");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(coupon: Coupon) {
    setTogglingId(coupon.id);
    try {
      const res = await fetch(`/api/stores/coupons/${coupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !coupon.is_active }),
      });
      if (!res.ok) throw new Error("Failed to update coupon");
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, is_active: !c.is_active } : c))
      );
      toast.success(coupon.is_active ? "Coupon deactivated" : "Coupon activated");
    } catch {
      toast.error("Failed to update coupon");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this coupon? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/stores/coupons/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete coupon");
      setCoupons((prev) => prev.filter((c) => c.id !== id));
      toast.success("Coupon deleted");
    } catch {
      toast.error("Failed to delete coupon");
    } finally {
      setDeletingId(null);
    }
  }

  function formatExpiry(dateStr: string | null) {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function formatValue(coupon: Coupon) {
    if (coupon.discount_type === "percentage") return `${coupon.discount_value}%`;
    return `₦${Number(coupon.discount_value).toLocaleString()}`;
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-surface-900 dark:text-white flex items-center gap-2">
            <Tag className="w-6 h-6" />
            Coupons
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
            Create discount codes for your customers
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-400 hover:bg-accent-500 text-black font-bold text-sm transition-all"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Cancel" : "New Coupon"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-6">
          <h2 className="font-bold text-surface-900 dark:text-white mb-5">Create new coupon</h2>
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                  Coupon code <span className="text-red-500">*</span>
                </label>
                <input
                  name="code"
                  value={form.code}
                  onChange={handleFormChange}
                  required
                  placeholder="e.g. SAVE20"
                  maxLength={30}
                  className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white placeholder:text-surface-300 dark:placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-accent-400 text-sm font-mono uppercase"
                />
              </div>

              {/* Discount value */}
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                  Discount value <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    name="discount_value"
                    value={form.discount_value}
                    onChange={handleFormChange}
                    required
                    type="number"
                    min="0.01"
                    step="any"
                    placeholder={form.discount_type === "percentage" ? "e.g. 20" : "e.g. 500"}
                    className="flex-1 px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white placeholder:text-surface-300 dark:placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-accent-400 text-sm"
                  />
                  <span className="text-sm font-semibold text-surface-500 shrink-0">
                    {form.discount_type === "percentage" ? "%" : "₦"}
                  </span>
                </div>
              </div>
            </div>

            {/* Discount type */}
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                Discount type
              </label>
              <div className="flex gap-4">
                {(["percentage", "fixed"] as const).map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="discount_type"
                      value={type}
                      checked={form.discount_type === type}
                      onChange={handleFormChange}
                      className="w-4 h-4 accent-accent-500"
                    />
                    <span className="text-sm text-surface-700 dark:text-surface-300 capitalize">
                      {type === "percentage" ? "Percentage (%)" : "Fixed amount (₦)"}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              {/* Min order */}
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                  Min order amount (₦)
                </label>
                <input
                  name="min_order_amount"
                  value={form.min_order_amount}
                  onChange={handleFormChange}
                  type="number"
                  min="0"
                  placeholder="0 (no minimum)"
                  className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white placeholder:text-surface-300 dark:placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-accent-400 text-sm"
                />
              </div>

              {/* Max uses */}
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                  Max uses
                </label>
                <input
                  name="max_uses"
                  value={form.max_uses}
                  onChange={handleFormChange}
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Unlimited"
                  className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white placeholder:text-surface-300 dark:placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-accent-400 text-sm"
                />
              </div>

              {/* Expires at */}
              <div>
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                  Expires on
                </label>
                <input
                  name="expires_at"
                  value={form.expires_at}
                  onChange={handleFormChange}
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-400 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent-400 hover:bg-accent-500 text-black font-bold text-sm transition-all disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create coupon
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Coupons table */}
      {coupons.length === 0 ? (
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-16 text-center">
          <Tag className="w-10 h-10 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
          <p className="font-semibold text-surface-900 dark:text-white mb-1">No coupons yet</p>
          <p className="text-sm text-surface-400">
            Create your first coupon to offer discounts to customers.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-50 dark:bg-surface-800/50 border-b border-surface-100 dark:border-surface-800">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide">
                    Code
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide">
                    Discount
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide">
                    Min Order
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide">
                    Uses
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide">
                    Expires
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide">
                    Active
                  </th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {coupons.map((coupon) => (
                  <tr
                    key={coupon.id}
                    className="hover:bg-surface-50 dark:hover:bg-surface-800/40 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <span className="font-mono font-bold text-surface-900 dark:text-white bg-surface-100 dark:bg-surface-800 px-2.5 py-1 rounded-lg text-xs tracking-widest">
                        {coupon.code}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-bold text-surface-900 dark:text-white">
                        {formatValue(coupon)}
                      </span>
                      <span className="text-xs text-surface-400 ml-1.5">
                        {coupon.discount_type === "percentage" ? "off" : "fixed"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-surface-600 dark:text-surface-400">
                      {coupon.min_order_amount > 0
                        ? `₦${Number(coupon.min_order_amount).toLocaleString()}`
                        : <span className="text-surface-300 dark:text-surface-600">None</span>}
                    </td>
                    <td className="px-5 py-4 text-surface-600 dark:text-surface-400">
                      {coupon.uses_count}
                      {coupon.max_uses !== null && (
                        <span className="text-surface-400"> / {coupon.max_uses}</span>
                      )}
                      {coupon.max_uses === null && (
                        <span className="text-xs text-surface-400 ml-1">unlimited</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-surface-600 dark:text-surface-400">
                      {formatExpiry(coupon.expires_at)}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleToggle(coupon)}
                        disabled={togglingId === coupon.id}
                        className="flex items-center gap-1.5 text-sm font-medium transition-colors disabled:opacity-50"
                        title={coupon.is_active ? "Deactivate coupon" : "Activate coupon"}
                      >
                        {togglingId === coupon.id ? (
                          <Loader2 className="w-5 h-5 animate-spin text-surface-400" />
                        ) : coupon.is_active ? (
                          <ToggleRight className="w-5 h-5 text-green-500" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-surface-400" />
                        )}
                        <span className={coupon.is_active ? "text-green-600 dark:text-green-400" : "text-surface-400"}>
                          {coupon.is_active ? "On" : "Off"}
                        </span>
                      </button>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleDelete(coupon.id)}
                        disabled={deletingId === coupon.id}
                        className="p-2 rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                        title="Delete coupon"
                      >
                        {deletingId === coupon.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
