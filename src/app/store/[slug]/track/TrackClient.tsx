"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronLeft, Package, Loader2, Search, ArrowRight,
  ChevronDown, ChevronUp, MapPin, CreditCard, CheckCircle2,
  Clock, Truck, Home, Settings, XCircle, PhoneCall,
} from "lucide-react";
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

interface Props {
  storeSlug: string;
  initialOrder?: string;
  initialPhone?: string;
}

const ORDER_STEPS = [
  { key: "pending",    label: "Placed",     Icon: Clock },
  { key: "confirmed",  label: "Confirmed",  Icon: CheckCircle2 },
  { key: "processing", label: "Processing", Icon: Settings },
  { key: "shipped",    label: "Shipped",    Icon: Truck },
  { key: "delivered",  label: "Delivered",  Icon: Home },
];

const STATUS_META: Record<string, { bg: string; text: string; dot: string }> = {
  pending:    { bg: "bg-amber-50  dark:bg-amber-900/20",  text: "text-amber-700  dark:text-amber-400",  dot: "bg-amber-400" },
  confirmed:  { bg: "bg-blue-50   dark:bg-blue-900/20",   text: "text-blue-700   dark:text-blue-400",   dot: "bg-blue-400" },
  processing: { bg: "bg-violet-50 dark:bg-violet-900/20", text: "text-violet-700 dark:text-violet-400", dot: "bg-violet-400" },
  shipped:    { bg: "bg-indigo-50 dark:bg-indigo-900/20", text: "text-indigo-700 dark:text-indigo-400", dot: "bg-indigo-400" },
  delivered:  { bg: "bg-emerald-50 dark:bg-emerald-900/20",text: "text-emerald-700 dark:text-emerald-400",dot: "bg-emerald-400" },
  cancelled:  { bg: "bg-red-50    dark:bg-red-900/20",    text: "text-red-700    dark:text-red-400",    dot: "bg-red-400" },
};

const PAY_STATUS: Record<string, { label: string; color: string }> = {
  pending:              { label: "Payment pending",       color: "text-amber-600 dark:text-amber-400" },
  pending_confirmation: { label: "Awaiting confirmation", color: "text-orange-600 dark:text-orange-400" },
  paid:                 { label: "Paid",                  color: "text-emerald-600 dark:text-emerald-400" },
  failed:               { label: "Payment failed",        color: "text-red-600 dark:text-red-400" },
  rejected:             { label: "Not received",          color: "text-red-600 dark:text-red-400" },
};

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${m.bg} ${m.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {status}
    </span>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 shadow-[0_2px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.3)] ${className}`}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold text-surface-400 dark:text-surface-500 uppercase tracking-widest mb-4">
      {children}
    </p>
  );
}

export default function TrackClient({ storeSlug, initialOrder, initialPhone }: Props) {
  const { storeBase } = useStore();
  const homeHref = storeBase || "/";

  const [phone,   setPhone]   = useState(initialPhone ?? "");
  const [orderNo, setOrderNo] = useState(initialOrder ?? "");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const [orderList,   setOrderList]   = useState<OrderSummary[] | null>(null);
  const [singleOrder, setSingleOrder] = useState<{ order: Order; items: OrderItem[] } | null>(null);
  const [expanded,    setExpanded]    = useState<string | null>(null);

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
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 pb-16">

      {/* ── Hero banner ── */}
      <div
        className="relative overflow-hidden pt-12 pb-10 px-4"
        style={{ backgroundColor: "var(--sf-accent)" }}
      >
        {/* decorative circles */}
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-12 -left-6 w-32 h-32 rounded-full bg-white/10" />

        <div className="max-w-2xl mx-auto relative z-10">
          <Link
            href={homeHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-black/60 hover:text-black transition-colors mb-6"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back to shop
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-black/15 flex items-center justify-center shrink-0">
              <Package className="w-7 h-7 text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-black leading-tight">Track Your Order</h1>
              <p className="text-sm text-black/60 mt-0.5">
                {singleOrder
                  ? `Order ${singleOrder.order.order_number}`
                  : orderList
                  ? `${orderList.length} order${orderList.length !== 1 ? "s" : ""} found`
                  : "Enter your phone to see your orders"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4 space-y-4">

        {/* ── Search form ── */}
        {!singleOrder && !orderList && (
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-surface-700 dark:text-surface-200">
                  Phone number <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-surface-400 dark:text-surface-500">The phone number you used at checkout</p>
                <div className="relative">
                  <PhoneCall className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    value={phone} onChange={(e) => setPhone(e.target.value)}
                    type="tel" required placeholder="080xxxxxxxx"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-[var(--sf-accent)] focus:border-transparent text-sm transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-surface-700 dark:text-surface-200">
                  Order number <span className="text-surface-400 font-normal text-xs">(optional)</span>
                </label>
                <p className="text-xs text-surface-400 dark:text-surface-500">Leave blank to see all your orders</p>
                <div className="relative">
                  <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    value={orderNo} onChange={(e) => setOrderNo(e.target.value.toUpperCase())}
                    placeholder="e.g. ORD-LK3M9Z"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-900 dark:text-white placeholder:text-surface-400 font-mono focus:outline-none focus:ring-2 focus:ring-[var(--sf-accent)] focus:border-transparent text-sm transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40">
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-black transition-all disabled:opacity-60 hover:opacity-90 active:scale-[0.98] shadow-[0_4px_14px_rgba(0,0,0,0.15)]"
                style={{ backgroundColor: "var(--sf-accent)" }}
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Searching…</>
                  : <><Search className="w-4 h-4" /> Find my orders</>}
              </button>
            </form>
          </Card>
        )}

        {/* ── Loading skeleton ── */}
        {loading && !orderList && !singleOrder && (
          <div className="space-y-3 pt-2">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 w-28 rounded-lg bg-surface-100 dark:bg-surface-800 animate-pulse" />
                    <div className="h-3 w-20 rounded-lg bg-surface-100 dark:bg-surface-800 animate-pulse" />
                  </div>
                  <div className="h-6 w-20 rounded-full bg-surface-100 dark:bg-surface-800 animate-pulse" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ── Order list ── */}
        {orderList && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                Your orders
              </p>
              <button onClick={reset} className="text-xs font-semibold text-surface-400 hover:text-surface-700 dark:hover:text-white transition-colors underline underline-offset-2">
                Search again
              </button>
            </div>

            {orderList.map((o) => (
              <Card key={o.id} className="overflow-hidden hover:shadow-[0_4px_24px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_4px_24px_rgba(0,0,0,0.4)] transition-shadow duration-200">
                <button
                  onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-surface-50/80 dark:hover:bg-surface-800/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-surface-100 dark:bg-surface-800">
                      <Package className="w-5 h-5 text-surface-500 dark:text-surface-400" />
                    </div>
                    <div>
                      <p className="font-bold font-mono text-sm text-surface-900 dark:text-white tracking-wide">
                        {o.order_number}
                      </p>
                      <p className="text-xs text-surface-400 dark:text-surface-500 mt-0.5">
                        {new Date(o.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                        <span className="mx-1.5 opacity-40">·</span>
                        <span className="font-semibold text-surface-600 dark:text-surface-300">{formatCurrency(Number(o.total))}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <StatusBadge status={o.order_status} />
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-surface-100 dark:bg-surface-800">
                      {expanded === o.id
                        ? <ChevronUp className="w-3.5 h-3.5 text-surface-500" />
                        : <ChevronDown className="w-3.5 h-3.5 text-surface-500" />}
                    </div>
                  </div>
                </button>

                {expanded === o.id && (
                  <div className="px-4 pb-4 border-t border-surface-100 dark:border-surface-800 pt-4 space-y-3">
                    <div className="flex items-center justify-between text-sm bg-surface-50 dark:bg-surface-800/50 rounded-xl px-3.5 py-2.5">
                      <span className="text-surface-500 dark:text-surface-400 text-xs font-medium">Payment status</span>
                      <span className={`text-xs font-bold ${PAY_STATUS[o.payment_status]?.color ?? "text-surface-500"}`}>
                        {PAY_STATUS[o.payment_status]?.label ?? o.payment_status}
                      </span>
                    </div>
                    <button
                      onClick={() => { setOrderNo(o.order_number); fetchSingle(o.order_number, phone); }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all text-black hover:opacity-90 active:scale-[0.98]"
                      style={{ backgroundColor: "var(--sf-accent)" }}
                    >
                      View full details <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* ── Single order detail ── */}
        {singleOrder && (
          <div className="space-y-3">
            <button
              onClick={() => { setSingleOrder(null); if (orderList) setOrderNo(""); else reset(); }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-surface-400 hover:text-surface-700 dark:hover:text-white transition-colors px-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              {orderList ? "Back to orders" : "Search again"}
            </button>

            {/* Status card */}
            <Card className="overflow-hidden">
              {/* Colored top strip */}
              <div
                className="h-1.5 w-full"
                style={{ backgroundColor: "var(--sf-accent)" }}
              />
              <div className="p-5">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <p className="text-xs text-surface-400 dark:text-surface-500 font-medium mb-0.5">Order number</p>
                    <p className="font-black text-xl font-mono text-surface-900 dark:text-white tracking-wide">
                      {singleOrder.order.order_number}
                    </p>
                    <p className="text-xs text-surface-400 dark:text-surface-500 mt-1">
                      {new Date(singleOrder.order.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <StatusBadge status={singleOrder.order.order_status} />
                </div>

                {singleOrder.order.order_status === "cancelled" ? (
                  <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40">
                    <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                    <p className="text-sm text-red-700 dark:text-red-400 font-medium">This order was cancelled.</p>
                  </div>
                ) : (
                  /* Progress stepper */
                  <div className="relative flex items-start pt-1">
                    {/* Background connector — spans between first and last dot centers */}
                    <div className="absolute top-4 h-0.5 bg-surface-100 dark:bg-surface-800"
                      style={{ left: `calc(${100 / (ORDER_STEPS.length * 2)}%)`, right: `calc(${100 / (ORDER_STEPS.length * 2)}%)` }}
                    />
                    {/* Active connector */}
                    <div
                      className="absolute top-4 h-0.5 transition-all duration-500"
                      style={{
                        left: `calc(${100 / (ORDER_STEPS.length * 2)}%)`,
                        width: stepIndex <= 0
                          ? "0%"
                          : `calc(${(stepIndex / (ORDER_STEPS.length - 1)) * (100 - 100 / ORDER_STEPS.length)}%)`,
                        backgroundColor: "var(--sf-accent)",
                      }}
                    />
                    {ORDER_STEPS.map((step, i) => {
                      const done    = i <= stepIndex;
                      const current = i === stepIndex;
                      const { Icon } = step;
                      return (
                        <div key={step.key} className="flex-1 flex flex-col items-center relative z-10">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${current ? "scale-110 shadow-[0_0_0_3px_var(--sf-accent)/20]" : ""}`}
                            style={done
                              ? { backgroundColor: "var(--sf-accent)" }
                              : { backgroundColor: "white", border: "2px solid #e5e7eb" }}
                          >
                            <Icon
                              className="w-3.5 h-3.5"
                              style={done ? { color: "black" } : { color: "#9ca3af" }}
                            />
                          </div>
                          <p className={`text-[10px] mt-1.5 text-center leading-tight font-medium ${done ? "text-surface-800 dark:text-surface-200" : "text-surface-400"}`}>
                            {step.label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>

            {/* Payment card */}
            <Card className="p-5">
              <SectionLabel>Payment</SectionLabel>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-surface-500" />
                  </div>
                  <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
                    {singleOrder.order.payment_method === "bank_transfer" || singleOrder.order.payment_method === "transfer"
                      ? "Bank transfer"
                      : "Paystack"}
                  </span>
                </div>
                <span className={`text-sm font-bold ${PAY_STATUS[singleOrder.order.payment_status]?.color ?? "text-surface-500"}`}>
                  {PAY_STATUS[singleOrder.order.payment_status]?.label ?? singleOrder.order.payment_status}
                </span>
              </div>
              {singleOrder.order.payment_status === "rejected" && (
                <div className="mt-3 flex items-start gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40">
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 dark:text-red-400">
                    Your payment was not confirmed. Please contact the store.
                  </p>
                </div>
              )}
              {singleOrder.order.payment_status === "pending_confirmation" && (
                <div className="mt-3 flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40">
                  <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Your transfer is being verified. This usually takes a few hours.
                  </p>
                </div>
              )}
            </Card>

            {/* Items card */}
            <Card className="p-5">
              <SectionLabel>Order items</SectionLabel>
              <div className="space-y-3.5">
                {singleOrder.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3.5 min-w-0">
                    {item.product_image ? (
                      <img
                        src={clThumb(item.product_image)}
                        alt={item.product_name}
                        className="w-14 h-14 rounded-xl object-cover border border-surface-100 dark:border-surface-700 shrink-0 shadow-sm"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-surface-100 dark:bg-surface-800 shrink-0 flex items-center justify-center">
                        <Package className="w-5 h-5 text-surface-300 dark:text-surface-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-surface-900 dark:text-white truncate leading-snug">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-surface-400 mt-0.5">
                        {formatCurrency(Number(item.price))} × {item.quantity}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-surface-900 dark:text-white shrink-0">
                      {formatCurrency(Number(item.subtotal))}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-4 pt-4 border-t border-surface-100 dark:border-surface-800 space-y-2">
                <div className="flex justify-between text-sm text-surface-500 dark:text-surface-400">
                  <span>Subtotal</span>
                  <span>{formatCurrency(Number(singleOrder.order.subtotal))}</span>
                </div>
                {Number(singleOrder.order.discount_amount) > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                    <span>Discount</span>
                    <span>−{formatCurrency(Number(singleOrder.order.discount_amount))}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 mt-1 border-t border-surface-100 dark:border-surface-800">
                  <span className="font-bold text-surface-900 dark:text-white">Total</span>
                  <span className="text-lg font-black text-surface-900 dark:text-white">
                    {formatCurrency(Number(singleOrder.order.total))}
                  </span>
                </div>
              </div>
            </Card>

            {/* Delivery card */}
            <Card className="p-5">
              <SectionLabel>Delivery address</SectionLabel>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-surface-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-surface-900 dark:text-white leading-snug">
                    {singleOrder.order.delivery_address}
                  </p>
                  {(singleOrder.order.delivery_city || singleOrder.order.delivery_state) && (
                    <p className="text-sm text-surface-400 dark:text-surface-500 mt-0.5">
                      {[singleOrder.order.delivery_city, singleOrder.order.delivery_state].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {singleOrder.order.delivery_note && (
                    <p className="text-xs text-surface-400 mt-2 italic bg-surface-50 dark:bg-surface-800 rounded-lg px-3 py-2">
                      📝 {singleOrder.order.delivery_note}
                    </p>
                  )}
                </div>
              </div>
            </Card>

            <p className="text-xs text-surface-400 dark:text-surface-600 text-center pb-2">
              Need help? Contact the store directly.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
