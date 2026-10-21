"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { AlertTriangle, Bell, CheckCircle2, History, Loader2, PackageOpen } from "lucide-react";
import { clThumb } from "@/lib/cloudinary";

export interface Movement {
  id: string;
  product_id: string | null;
  product_name: string;
  variant_label: string | null;
  change: number;
  stock_after: number | null;
  reason: "order" | "order_cancelled" | "manual" | "created";
  created_at: string;
  order_number: string | null;
}

interface LowItem {
  product_id: string;
  name: string;
  slug: string;
  image_url: string | null;
  variant_label: string | null;
  stock: number;
  threshold: number;
  /** Shoppers waiting for a back-in-stock message */
  waiting?: number;
}

const REASON: Record<Movement["reason"], { label: string; tone: string }> = {
  order: { label: "Sold", tone: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300" },
  order_cancelled: { label: "Order cancelled", tone: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300" },
  manual: { label: "Edited", tone: "bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300" },
  created: { label: "Opening stock", tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" },
};

export default function InventoryClient({
  storeId,
  threshold,
  lowStock,
  movements,
}: {
  storeId: string;
  threshold: number;
  lowStock: LowItem[];
  movements: Movement[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"low" | "history">(lowStock.length ? "low" : "history");
  const [reason, setReason] = useState<Movement["reason"] | "all">("all");
  const [search, setSearch] = useState("");
  const [defaultThreshold, setDefaultThreshold] = useState(String(threshold));
  const [saving, setSaving] = useState(false);

  const soldOut = lowStock.filter((l) => l.stock === 0).length;
  const shown = useMemo(
    () =>
      movements.filter(
        (m) =>
          (reason === "all" || m.reason === reason) &&
          (!search.trim() || `${m.product_name} ${m.variant_label ?? ""} ${m.order_number ?? ""}`.toLowerCase().includes(search.trim().toLowerCase())),
      ),
    [movements, reason, search],
  );

  async function saveThreshold() {
    setSaving(true);
    try {
      const res = await fetch(`/api/stores/${storeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lowStockThreshold: Number(defaultThreshold) }),
      });
      if (!res.ok) throw new Error();
      toast.success("Alert level saved");
      router.refresh();
    } catch {
      toast.error("Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Summary + default alert level */}
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1.4fr]">
        <div className="rounded-2xl border border-surface-100 bg-white p-4 dark:border-surface-800 dark:bg-surface-900">
          <p className="text-xs text-surface-500 dark:text-surface-400">Running low</p>
          <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">{lowStock.length - soldOut}</p>
        </div>
        <div className="rounded-2xl border border-surface-100 bg-white p-4 dark:border-surface-800 dark:bg-surface-900">
          <p className="text-xs text-surface-500 dark:text-surface-400">Sold out</p>
          <p className="mt-1 text-2xl font-bold text-red-500">{soldOut}</p>
        </div>
        <div className="rounded-2xl border border-surface-100 bg-white p-4 dark:border-surface-800 dark:bg-surface-900">
          <p className="flex items-center gap-1.5 text-xs text-surface-500 dark:text-surface-400">
            <Bell className="h-3.5 w-3.5" /> Alert me when stock drops to
          </p>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={defaultThreshold}
              onChange={(e) => setDefaultThreshold(e.target.value)}
              className="w-24 rounded-lg border border-surface-200 bg-transparent px-3 py-1.5 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-accent-400 dark:border-surface-700 dark:text-white"
            />
            <button
              type="button"
              onClick={saveThreshold}
              disabled={saving || String(threshold) === defaultThreshold}
              className="flex items-center gap-1.5 rounded-lg bg-accent-400 px-3 py-1.5 text-xs font-bold text-black disabled:opacity-40"
            >
              {saving && <Loader2 className="h-3 w-3 animate-spin" />} Save
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-surface-400">Store default — each product can override it.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([
          { id: "low", label: `Low stock (${lowStock.length})`, icon: AlertTriangle },
          { id: "history", label: "Stock history", icon: History },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              tab === id
                ? "bg-surface-900 text-white dark:bg-white dark:text-black"
                : "bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "low" ? (
        lowStock.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-surface-200 py-16 text-center dark:border-surface-700">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
            <p className="mt-3 font-semibold text-surface-900 dark:text-white">Everything is well stocked</p>
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">You&apos;ll get a notification when something runs low.</p>
          </div>
        ) : (
          <ul className="divide-y divide-surface-100 overflow-hidden rounded-2xl border border-surface-100 bg-white dark:divide-surface-800 dark:border-surface-800 dark:bg-surface-900">
            {lowStock.map((l) => (
              <li key={`${l.product_id}:${l.variant_label ?? ""}`} className="flex items-center gap-3 px-4 py-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface-100 dark:bg-surface-800">
                  {l.image_url ? <Image src={clThumb(l.image_url)} alt="" fill sizes="40px" className="object-cover" /> : <PackageOpen className="m-2.5 h-5 w-5 text-surface-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-surface-900 dark:text-white">{l.name}</p>
                  {l.variant_label && <p className="text-xs text-surface-500 dark:text-surface-400">{l.variant_label}</p>}
                </div>
                {!!l.waiting && (
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300" title="Shoppers who asked to be told when it's back">
                    {l.waiting} waiting
                  </span>
                )}
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${l.stock === 0 ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400" : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"}`}>
                  {l.stock === 0 ? "Sold out" : `${l.stock} left`}
                </span>
                <Link
                  href={`/dashboard/products/${l.product_id}/edit`}
                  className="rounded-lg border border-surface-200 px-3 py-1.5 text-xs font-semibold text-surface-700 hover:bg-surface-50 dark:border-surface-700 dark:text-surface-200 dark:hover:bg-surface-800"
                >
                  Restock
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product or order number"
              className="min-w-[200px] flex-1 rounded-xl border border-surface-200 bg-white px-3.5 py-2 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-accent-400 dark:border-surface-700 dark:bg-surface-900 dark:text-white"
            />
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as typeof reason)}
              className="rounded-xl border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-900 dark:text-white"
            >
              <option value="all">All changes</option>
              <option value="order">Sold</option>
              <option value="order_cancelled">Cancelled orders</option>
              <option value="manual">Edited by you</option>
              <option value="created">Opening stock</option>
            </select>
          </div>

          {shown.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-surface-200 py-12 text-center text-sm text-surface-500 dark:border-surface-700 dark:text-surface-400">
              No stock changes recorded yet. Sales, cancellations and edits will appear here.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-surface-100 bg-white dark:border-surface-800 dark:bg-surface-900">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-100 text-left text-xs uppercase tracking-wider text-surface-400 dark:border-surface-800">
                    <th className="px-4 py-2.5 font-semibold">When</th>
                    <th className="px-4 py-2.5 font-semibold">Product</th>
                    <th className="px-4 py-2.5 font-semibold">Reason</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Change</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Stock after</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-50 dark:divide-surface-800/60">
                  {shown.map((m) => (
                    <tr key={m.id}>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-surface-500 dark:text-surface-400">{format(new Date(m.created_at), "d MMM, HH:mm")}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-surface-900 dark:text-white">{m.product_name}</p>
                        {m.variant_label && <p className="text-xs text-surface-500 dark:text-surface-400">{m.variant_label}</p>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${REASON[m.reason].tone}`}>{REASON[m.reason].label}</span>
                        {m.order_number && <span className="ml-1.5 font-mono text-xs text-surface-400">{m.order_number}</span>}
                      </td>
                      <td className={`px-4 py-2.5 text-right font-bold ${m.change > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-surface-900 dark:text-white"}`}>
                        {m.change > 0 ? `+${m.change}` : m.change}
                      </td>
                      <td className="px-4 py-2.5 text-right text-surface-600 dark:text-surface-300">{m.stock_after ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
