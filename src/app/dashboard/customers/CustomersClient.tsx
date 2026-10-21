"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { format, formatDistanceToNow } from "date-fns";
import { ChevronDown, Copy, Download, Loader2, MessageCircle, Search, Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { whatsappLink } from "@/lib/phone";
import { segmentsOf, toCsv, topSpendCutoff, type CustomerRow, type Segment } from "@/lib/customers-shared";

type Order = { id: string; order_number: string; created_at: string; total: number; order_status: string; payment_status: string; items: number };

const SEGMENTS: { id: Segment; label: string; hint: string }[] = [
  { id: "all", label: "All", hint: "" },
  { id: "repeat", label: "Repeat buyers", hint: "2+ orders" },
  { id: "top", label: "Top spenders", hint: "Top 10% by spend" },
  { id: "new", label: "New", hint: "First order in the last 30 days" },
  { id: "lapsed", label: "Lapsed", hint: "No order in 60+ days — worth a nudge" },
];

const SORTS = {
  recent: { label: "Most recent", fn: (a: CustomerRow, b: CustomerRow) => +new Date(b.last_order_at) - +new Date(a.last_order_at) },
  spend: { label: "Top spend", fn: (a: CustomerRow, b: CustomerRow) => b.total_spent - a.total_spent },
  orders: { label: "Most orders", fn: (a: CustomerRow, b: CustomerRow) => b.orders - a.orders },
};

export default function CustomersClient({ customers, storeName }: { customers: CustomerRow[]; storeName: string }) {
  const [segment, setSegment] = useState<Segment>("all");
  const [sort, setSort] = useState<keyof typeof SORTS>("recent");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [orders, setOrders] = useState<Record<string, Order[] | "loading">>({});

  const cutoff = useMemo(() => topSpendCutoff(customers.map((c) => c.total_spent)), [customers]);
  const withSegments = useMemo(() => customers.map((c) => ({ ...c, segments: segmentsOf(c, cutoff) })), [customers, cutoff]);
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of withSegments) for (const s of c.segments) m[s] = (m[s] ?? 0) + 1;
    return m;
  }, [withSegments]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return withSegments
      .filter((c) => c.segments.includes(segment))
      .filter((c) => !q || `${c.name} ${c.phone} ${c.email ?? ""} ${c.last_city ?? ""}`.toLowerCase().includes(q))
      .sort(SORTS[sort].fn);
  }, [withSegments, segment, search, sort]);

  const totalRevenue = customers.reduce((s, c) => s + c.total_spent, 0);
  const repeatRate = customers.length ? Math.round(((counts.repeat ?? 0) / customers.length) * 100) : 0;

  function exportCsv() {
    const csv = toCsv([
      ["Name", "Phone", "Email", "Orders", "Total spent (NGN)", "First order", "Last order", "City"],
      ...shown.map((c) => [c.name, c.phone, c.email, c.orders, Math.round(c.total_spent), c.first_order_at.slice(0, 10), c.last_order_at.slice(0, 10), c.last_city]),
    ]);
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-${segment}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function toggle(key: string) {
    if (open === key) return setOpen(null);
    setOpen(key);
    if (orders[key]) return;
    setOrders((o) => ({ ...o, [key]: "loading" }));
    try {
      const res = await fetch(`/api/dashboard/customers/orders?key=${key}`);
      const json = await res.json();
      setOrders((o) => ({ ...o, [key]: json.data ?? [] }));
    } catch {
      setOrders((o) => ({ ...o, [key]: [] }));
    }
  }

  if (!customers.length) {
    return (
      <div className="rounded-2xl border border-dashed border-surface-200 py-16 text-center dark:border-surface-700">
        <Users className="mx-auto h-8 w-8 text-surface-300" />
        <p className="mt-3 font-semibold text-surface-900 dark:text-white">No customers yet</p>
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">Once people order from your store, they&apos;ll appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Customers", value: customers.length.toLocaleString() },
          { label: "Repeat buyers", value: `${repeatRate}%` },
          { label: "Avg. spend per customer", value: formatCurrency(totalRevenue / customers.length) },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-surface-100 bg-white p-4 dark:border-surface-800 dark:bg-surface-900">
            <p className="text-xs text-surface-500 dark:text-surface-400">{s.label}</p>
            <p className="mt-1 text-lg font-bold text-surface-900 dark:text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {SEGMENTS.map((s) => (
          <button
            key={s.id}
            title={s.hint}
            onClick={() => setSegment(s.id)}
            className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              segment === s.id ? "bg-surface-900 text-white dark:bg-white dark:text-black" : "bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300"
            }`}
          >
            {s.label} <span className="opacity-60">{counts[s.id] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, email or city"
            className="w-full rounded-xl border border-surface-200 bg-white py-2 pl-9 pr-3 text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-accent-400 dark:border-surface-700 dark:bg-surface-900 dark:text-white"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as keyof typeof SORTS)}
          className="rounded-xl border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 dark:border-surface-700 dark:bg-surface-900 dark:text-white"
        >
          {Object.entries(SORTS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <button
          onClick={() => navigator.clipboard.writeText(shown.map((c) => c.phone).join("\n")).then(() => toast.success(`${shown.length} numbers copied`))}
          className="flex items-center gap-1.5 rounded-xl border border-surface-200 px-3 py-2 text-sm font-semibold text-surface-700 hover:bg-surface-50 dark:border-surface-700 dark:text-surface-200 dark:hover:bg-surface-800"
        >
          <Copy className="h-4 w-4" /> Copy numbers
        </button>
        <button
          onClick={exportCsv}
          className="flex items-center gap-1.5 rounded-xl bg-surface-900 px-3 py-2 text-sm font-semibold text-white dark:bg-white dark:text-black"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <ul className="divide-y divide-surface-100 overflow-hidden rounded-2xl border border-surface-100 bg-white dark:divide-surface-800 dark:border-surface-800 dark:bg-surface-900">
        {shown.map((c) => {
          const first = c.name.trim().split(/\s+/)[0] || "there";
          const wa = whatsappLink(c.phone, `Hi ${first}! 👋 It's ${storeName}. `);
          const isOpen = open === c.key;
          const list = orders[c.key];
          return (
            <li key={c.key}>
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-100 text-sm font-bold text-surface-600 dark:bg-surface-800 dark:text-surface-300">
                  {c.name.charAt(0).toUpperCase()}
                </span>
                <button onClick={() => toggle(c.key)} className="min-w-0 flex-1 text-left">
                  <p className="flex items-center gap-2 truncate text-sm font-semibold text-surface-900 dark:text-white">
                    {c.name}
                    {c.segments.includes("top") && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">TOP</span>}
                  </p>
                  <p className="truncate text-xs text-surface-500 dark:text-surface-400">
                    {c.phone}
                    {c.last_city ? ` · ${c.last_city}` : ""} · last order {formatDistanceToNow(new Date(c.last_order_at), { addSuffix: true })}
                  </p>
                </button>
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-bold text-surface-900 dark:text-white">{formatCurrency(c.total_spent)}</p>
                  <p className="text-xs text-surface-400">{c.orders} order{c.orders !== 1 ? "s" : ""}</p>
                </div>
                {wa && (
                  <a href={wa} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${c.name}`} className="rounded-lg p-2 text-[#128C7E] hover:bg-[#25D366]/10 dark:text-[#25D366]">
                    <MessageCircle className="h-4 w-4" />
                  </a>
                )}
                <button onClick={() => toggle(c.key)} aria-label="Show orders" className="rounded-lg p-2 text-surface-400 hover:text-surface-900 dark:hover:text-white">
                  <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
              </div>
              {isOpen && (
                <div className="border-t border-surface-50 bg-surface-50/60 px-4 py-3 dark:border-surface-800 dark:bg-surface-800/30">
                  <p className="mb-2 text-xs text-surface-500 dark:text-surface-400">
                    {c.email ? `${c.email} · ` : ""}Customer since {format(new Date(c.first_order_at), "d MMM yyyy")} · {formatCurrency(c.total_spent / c.orders)} average order
                  </p>
                  {list === "loading" || !list ? (
                    <Loader2 className="h-4 w-4 animate-spin text-surface-400" />
                  ) : (
                    <ul className="space-y-1.5">
                      {list.map((o) => (
                        <li key={o.id} className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-mono text-xs text-surface-500">{o.order_number}</span>
                          <span className="flex-1 text-xs text-surface-500 dark:text-surface-400">
                            {format(new Date(o.created_at), "d MMM yyyy")} · {o.items} item{o.items !== 1 ? "s" : ""} · <span className="capitalize">{o.order_status}</span>
                          </span>
                          <span className="font-semibold text-surface-900 dark:text-white">{formatCurrency(o.total)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          );
        })}
        {shown.length === 0 && <li className="px-4 py-10 text-center text-sm text-surface-500">No customers match.</li>}
      </ul>
    </div>
  );
}
