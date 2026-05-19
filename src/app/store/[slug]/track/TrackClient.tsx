"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Package, Loader2, Search, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { formatCurrency } from "@/lib/utils";
import { clThumb } from "@/lib/cloudinary";

interface OrderItem {
  product_name: string;
  product_image: string | null;
  price: number;
  quantity: number;
  subtotal: number;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  delivery_address: string;
  delivery_city: string | null;
  delivery_state: string | null;
  delivery_note: string | null;
  subtotal: number;
  total: number;
  discount_amount: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
  created_at: string;
}

interface OrderSummary {
  id: string;
  order_number: string;
  total: number;
  payment_status: string;
  order_status: string;
  created_at: string;
}

const ORDER_STEPS = [
  { key: "pending",    label: "Placed" },
  { key: "confirmed",  label: "Confirmed" },
  { key: "processing", label: "Processing" },
  { key: "shipped",    label: "Shipped" },
  { key: "delivered",  label: "Delivered" },
];

const STATUS_COLORS: Record<string, string> = {
  pending:    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  confirmed:  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  processing: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  shipped:    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  delivered:  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled:  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const PAY_STATUS: Record<string, { label: string; color: string }> = {
  pending:              { label: "Payment pending",       color: "text-yellow-600 dark:text-yellow-400" },
  pending_confirmation: { label: "Awaiting confirmation", color: "text-orange-600 dark:text-orange-400" },
  paid:                 { label: "Paid",                  color: "text-green-600 dark:text-green-400" },
  failed:               { label: "Payment failed",        color: "text-red-600 dark:text-red-400" },
  rejected:             { label: "Payment not received",  color: "text-red-600 dark:text-red-400" },
};

interface Props {
  storeSlug: string;
  initialOrder?: string;
  initialPhone?: string;
}

export default function TrackClient({ storeSlug, initialOrder, initialPhone }: Props) {
  const { storeBase } = useStore();
  const homeHref = storeBase || "/";

  const [phone,   setPhone]   = useState(initialPhone ?? "");
  const [orderNo, setOrderNo] = useState(initialOrder ?? "");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Results
  const [orderList,   setOrderList]   = useState<OrderSummary[] | null>(null);
  const [singleOrder, setSingleOrder] = useState<{ order: Order; items: OrderItem[] } | null>(null);
  const [expanded,    setExpanded]    = useState<string | null>(null);

  // Auto-search from URL params
  useEffect(() => {
    if (initialPhone && initialOrder) fetchSingle(initialOrder, initialPhone);
    else if (initialPhone)            fetchList(initialPhone);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchList(ph = phone) {
    const cleanPh = ph.trim();
    if (!cleanPh) { setError("Please enter your phone number."); return; }
    setLoading(true); setError(null); setOrderList(null); setSingleOrder(null);
    try {
      const res  = await fetch(`/api/storefront/${storeSlug}/track?phone=${encodeURIComponent(cleanPh)}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "No orders found."); return; }
      setOrderList(data.orders);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchSingle(num: string, ph: string) {
    setLoading(true); setError(null); setSingleOrder(null);
    try {
      const res  = await fetch(`/api/storefront/${storeSlug}/track?orderNumber=${encodeURIComponent(num.trim().toUpperCase())}&phone=${encodeURIComponent(ph.trim())}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Order not found."); return; }
      setSingleOrder(data);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (orderNo.trim()) fetchSingle(orderNo, phone);
    else                fetchList(phone);
  }

  function reset() {
    setOrderList(null); setSingleOrder(null); setError(null); setOrderNo(""); setExpanded(null);
  }

  const stepIndex = singleOrder
    ? ORDER_STEPS.findIndex((s) => s.key === singleOrder.order.order_status)
    : -1;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link href={homeHref} className="inline-flex items-center gap-1.5 text-sm text-surface-400 hover:text-surface-900 dark:hover:text-white mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back to shop
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--sf-accent)" }}>
          <Package className="w-5 h-5 text-black" />
        </div>
        <div>
          <h1 className="text-xl font-black text-surface-900 dark:text-white">Track your order</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400">Enter your phone to see all orders — or add an order number for details</p>
        </div>
      </div>

      {/* ── Search form ── */}
      {!singleOrder && !orderList && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-5 mb-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              Phone number used at checkout <span className="text-red-500">*</span>
            </label>
            <input
              value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" required
              placeholder="080xxxxxxxx"
              className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-[var(--sf-accent)] text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              Order number <span className="text-surface-400 font-normal">(optional — leave blank to see all orders)</span>
            </label>
            <input
              value={orderNo} onChange={(e) => setOrderNo(e.target.value.toUpperCase())}
              placeholder="e.g. ORD-LK3M9Z"
              className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-transparent text-surface-900 dark:text-white placeholder:text-surface-400 font-mono focus:outline-none focus:ring-2 focus:ring-[var(--sf-accent)] text-sm"
            />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-black hover:opacity-90 transition-all disabled:opacity-60"
            style={{ backgroundColor: "var(--sf-accent)" }}
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Searching…</> : <><Search className="w-4 h-4" /> Find my orders</>}
          </button>
        </form>
      )}

      {/* ── Loading state ── */}
      {loading && !orderList && !singleOrder && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-surface-400" />
        </div>
      )}

      {/* ── Order list (phone-only lookup) ── */}
      {orderList && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-surface-900 dark:text-white">{orderList.length} order{orderList.length !== 1 ? "s" : ""} found</p>
            <button onClick={reset} className="text-xs text-surface-400 hover:text-surface-700 dark:hover:text-white transition-colors">
              Search again
            </button>
          </div>

          {orderList.map((o) => (
            <div key={o.id} className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div>
                    <p className="font-bold font-mono text-sm text-surface-900 dark:text-white">{o.order_number}</p>
                    <p className="text-xs text-surface-400 mt-0.5">
                      {new Date(o.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                      {" · "}{formatCurrency(Number(o.total))}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[o.order_status] ?? STATUS_COLORS.pending}`}>
                    {o.order_status}
                  </span>
                  {expanded === o.id ? <ChevronUp className="w-4 h-4 text-surface-400" /> : <ChevronDown className="w-4 h-4 text-surface-400" />}
                </div>
              </button>

              {expanded === o.id && (
                <div className="px-4 pb-4 border-t border-surface-100 dark:border-surface-800 pt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-surface-500 dark:text-surface-400">Payment</span>
                    <span className={`font-semibold ${PAY_STATUS[o.payment_status]?.color ?? "text-surface-500"}`}>
                      {PAY_STATUS[o.payment_status]?.label ?? o.payment_status}
                    </span>
                  </div>
                  <button
                    onClick={() => { setOrderNo(o.order_number); fetchSingle(o.order_number, phone); }}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border transition-colors border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800"
                  >
                    View full details <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Single order detail ── */}
      {singleOrder && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => { setSingleOrder(null); if (orderList) setOrderNo(""); else reset(); }}
              className="inline-flex items-center gap-1 text-sm text-surface-400 hover:text-surface-900 dark:hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              {orderList ? "Back to orders" : "Search again"}
            </button>
          </div>

          {/* Status + progress */}
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-xs text-surface-400 mb-0.5">Order number</p>
                <p className="font-black text-lg font-mono text-surface-900 dark:text-white">{singleOrder.order.order_number}</p>
              </div>
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full capitalize shrink-0 ${STATUS_COLORS[singleOrder.order.order_status] ?? STATUS_COLORS.pending}`}>
                {singleOrder.order.order_status}
              </span>
            </div>

            {singleOrder.order.order_status !== "cancelled" && (
              <div className="flex items-start gap-0">
                {ORDER_STEPS.map((step, i) => {
                  const done    = i <= stepIndex;
                  const current = i === stepIndex;
                  return (
                    <div key={step.key} className="flex-1 flex flex-col items-center relative">
                      {i > 0 && (
                        <div
                          className="absolute top-3 right-1/2 w-full h-0.5 -translate-y-px"
                          style={{ background: done ? "var(--sf-accent)" : undefined }}
                          {...(!done ? { className: "absolute top-3 right-1/2 w-full h-0.5 -translate-y-px bg-surface-200 dark:bg-surface-700" } : {})}
                        />
                      )}
                      <div
                        className={`w-6 h-6 rounded-full border-2 z-10 flex items-center justify-center text-xs font-black transition-colors ${current ? "scale-110" : ""} ${done ? "" : "border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-900 text-transparent"}`}
                        style={done ? { background: "var(--sf-accent)", borderColor: "var(--sf-accent)", color: "black" } : undefined}
                      >
                        {done ? "✓" : ""}
                      </div>
                      <p className={`text-xs mt-1.5 text-center leading-tight ${done ? "font-semibold text-surface-900 dark:text-white" : "text-surface-400"}`}>
                        {step.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {singleOrder.order.order_status === "cancelled" && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">This order was cancelled.</p>
            )}
          </div>

          {/* Payment */}
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-5">
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Payment</p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-surface-600 dark:text-surface-400">
                {singleOrder.order.payment_method === "bank_transfer" ? "Bank transfer" : "Paystack"}
              </span>
              <span className={`text-sm font-bold ${PAY_STATUS[singleOrder.order.payment_status]?.color ?? "text-surface-500"}`}>
                {PAY_STATUS[singleOrder.order.payment_status]?.label ?? singleOrder.order.payment_status}
              </span>
            </div>
            {singleOrder.order.payment_status === "rejected" && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">Your payment was not confirmed. Please contact the store.</p>
            )}
          </div>

          {/* Items */}
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-5">
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Items</p>
            <div className="space-y-3">
              {singleOrder.items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 min-w-0">
                  {item.product_image ? (
                    <img src={clThumb(item.product_image)} alt={item.product_name} className="w-12 h-12 rounded-lg object-cover border border-surface-100 dark:border-surface-700 shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-surface-100 dark:bg-surface-800 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-900 dark:text-white truncate">{item.product_name}</p>
                    <p className="text-xs text-surface-400">{formatCurrency(Number(item.price))} × {item.quantity}</p>
                  </div>
                  <span className="text-sm font-bold text-surface-900 dark:text-white shrink-0">{formatCurrency(Number(item.subtotal))}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-surface-100 dark:border-surface-800 mt-4 pt-4 space-y-1.5 text-sm">
              <div className="flex justify-between text-surface-500 dark:text-surface-400">
                <span>Subtotal</span><span>{formatCurrency(Number(singleOrder.order.subtotal))}</span>
              </div>
              {Number(singleOrder.order.discount_amount) > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Discount</span><span>-{formatCurrency(Number(singleOrder.order.discount_amount))}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-base text-surface-900 dark:text-white pt-1">
                <span>Total</span><span>{formatCurrency(Number(singleOrder.order.total))}</span>
              </div>
            </div>
          </div>

          {/* Delivery */}
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-5">
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Delivery</p>
            <p className="text-sm text-surface-900 dark:text-white">{singleOrder.order.delivery_address}</p>
            {(singleOrder.order.delivery_city || singleOrder.order.delivery_state) && (
              <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
                {[singleOrder.order.delivery_city, singleOrder.order.delivery_state].filter(Boolean).join(", ")}
              </p>
            )}
            {singleOrder.order.delivery_note && (
              <p className="text-sm text-surface-400 mt-2 italic">Note: {singleOrder.order.delivery_note}</p>
            )}
          </div>

          <p className="text-xs text-surface-400 text-center">
            Ordered {new Date(singleOrder.order.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      )}
    </div>
  );
}
