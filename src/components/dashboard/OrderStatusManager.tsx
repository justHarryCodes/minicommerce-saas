"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2, CheckCircle2, XCircle, MessageCircle, Check } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { whatsappLink } from "@/lib/phone";
import type { Order, OrderStatus, PaymentStatus } from "@/types";
import SocialIcon from "@/components/SocialIcon";

interface Props {
  order: Order;
  storeWhatsapp?: string | null;
  storeName?: string;
  storeSlug?: string;
  /** Absolute app origin for links sent to customers (from the server) */
  appUrl?: string;
}

/** Ready-to-send WhatsApp text for the order's current state. */
function customerMessage(order: Order, storeName: string, receipt: string | null): string {
  const first = (order.customer_name ?? "").trim().split(/\s+/)[0] || "there";
  const num = order.order_number ?? "";
  const link = receipt ? `\n\nReceipt & status: ${receipt}` : "";
  const pickup = order.delivery_method === "pickup";
  switch (order.order_status) {
    case "shipped":
      return pickup
        ? `Hi ${first}, your order ${num} from ${storeName} is ready for pickup! 🎉${link}`
        : `Hi ${first}, your order ${num} from ${storeName} is on its way! 🚚${link}`;
    case "delivered":
      return `Hi ${first}, your order ${num} has been delivered. Thank you for shopping with ${storeName}! 💛${link}`;
    case "cancelled":
      return `Hi ${first}, your order ${num} from ${storeName} has been cancelled. Please reply if you have any questions.${link}`;
    default:
      return `Hi ${first}, thanks for your order ${num} from ${storeName}! We've received it and will keep you updated.${link}`;
  }
}

const ORDER_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: "confirmed",  label: "Confirm order" },
  { value: "processing", label: "Mark processing" },
  { value: "shipped",    label: "Mark shipped" },
  { value: "delivered",  label: "Mark delivered" },
  { value: "cancelled",  label: "Cancel order" },
];

export default function OrderStatusManager({ order, storeWhatsapp, storeName = "our store", storeSlug, appUrl }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function update(payload: { orderStatus?: OrderStatus; paymentStatus?: PaymentStatus }) {
    const key = payload.orderStatus ?? payload.paymentStatus ?? "unknown";
    setLoading(key);
    try {
      const res = await fetch(`/api/merchant/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success("Order updated");
      router.refresh();
    } catch {
      toast.error("Failed to update order");
    } finally {
      setLoading(null);
    }
  }

  const isRejected = order.payment_status === "rejected";
  const awaitingPayment = order.payment_method === "bank_transfer" &&
    order.payment_status === "pending_confirmation";

  const availableStatuses = ORDER_STATUSES.filter((s) => s.value !== order.order_status);

  // Pay on delivery: money still to collect at the door.
  const podBalanceDue =
    order.payment_method === "pay_on_delivery" &&
    order.payment_status !== "paid" &&
    order.payment_status !== "refunded" &&
    order.order_status !== "cancelled";

  const receipt =
    appUrl && storeSlug && order.access_token && order.order_number
      ? `${appUrl}/store/${storeSlug}/receipt/${encodeURIComponent(order.order_number)}?t=${order.access_token}`
      : null;
  const waLink = whatsappLink(order.customer_phone, customerMessage(order, storeName, receipt));

  return (
    <div className="space-y-3">

      {/* Payment not received — rejection notice */}
      {isRejected && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
          <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              Payment not received
            </p>
            <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-0.5">
              Customer was notified. If they believe this is an error, they should contact support
              {storeWhatsapp ? (
                <>
                  {" via "}
                  <a
                    href={`https://wa.me/${storeWhatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium"
                  >
                    WhatsApp
                  </a>
                  {"."}
                </>
              ) : "."}
            </p>
          </div>
        </div>
      )}

      {/* Phones: a delivery tracker and one clear next step */}
      <PhoneActions order={order} loading={loading} update={update} waLink={waLink} awaitingPayment={awaitingPayment} podBalanceDue={podBalanceDue} />

      <div className="hidden flex-wrap items-center gap-2 lg:flex">
        <span className="text-xs text-surface-400 font-medium mr-1">Update:</span>

        {/* Pay on delivery — cash/transfer collected at the door */}
        {podBalanceDue && (
          <button
            onClick={() => update({ paymentStatus: "paid" })}
            disabled={!!loading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-950/40 font-medium transition-all disabled:opacity-50"
          >
            {loading === "paid" ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
            Balance collected
          </button>
        )}

        {/* Confirm payment */}
        {awaitingPayment && (
          <button
            onClick={() => update({ paymentStatus: "paid" })}
            disabled={!!loading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-950/40 font-medium transition-all disabled:opacity-50"
          >
            {loading === "paid"
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <CheckCircle2 className="w-3 h-3" />}
            Payment received
          </button>
        )}

        {/* Payment not received */}
        {awaitingPayment && (
          <button
            onClick={() => update({ paymentStatus: "rejected" })}
            disabled={!!loading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-950/40 font-medium transition-all disabled:opacity-50"
          >
            {loading === "rejected"
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <XCircle className="w-3 h-3" />}
            Payment not received
          </button>
        )}

        {/* Order status buttons */}
        {availableStatuses.map((s) => (
          <button
            key={s.value}
            onClick={() => update({ orderStatus: s.value })}
            disabled={!!loading}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-all disabled:opacity-50 ${
              s.value === "cancelled"
                ? "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-950/40"
                : "bg-surface-50 dark:bg-surface-800 text-surface-700 dark:text-surface-300 border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-700"
            }`}
          >
            {loading === s.value && <Loader2 className="w-3 h-3 animate-spin" />}
            {s.label}
          </button>
        ))}

        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#25D366]/10 text-[#128C7E] dark:text-[#25D366] border border-[#25D366]/30 hover:bg-[#25D366]/20 font-semibold transition-all"
          >
            <SocialIcon name="whatsapp" size={14} label="" className="rounded-[3px]" />
            WhatsApp customer
          </a>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Phones ─────────────────────────
   Like a delivery tracker in a shopping app: where the order is, then one big
   button for what to do next. Rarely used changes sit under "More options". */
const STEPS: { value: OrderStatus; label: string }[] = [
  { value: "pending", label: "New" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Packing" },
  { value: "shipped", label: "On the way" },
  { value: "delivered", label: "Delivered" },
];
const NEXT: Partial<Record<OrderStatus, { value: OrderStatus; label: string }>> = {
  pending: { value: "confirmed", label: "Confirm this order" },
  confirmed: { value: "processing", label: "Start packing" },
  processing: { value: "shipped", label: "Send it out for delivery" },
  shipped: { value: "delivered", label: "Mark as delivered" },
};

function PhoneActions({ order, loading, update, waLink, awaitingPayment, podBalanceDue }: {
  order: Order;
  loading: string | null;
  update: (p: { orderStatus?: OrderStatus; paymentStatus?: PaymentStatus }) => void;
  waLink: string | null;
  awaitingPayment: boolean;
  podBalanceDue: boolean;
}) {
  const status = (order.order_status ?? "pending") as OrderStatus;
  const at = STEPS.findIndex((s) => s.value === status);
  const next = NEXT[status];
  const cancelled = status === "cancelled";
  const total = Number(order.total_amount ?? order.total ?? 0);
  const spin = (k: string) => (loading === k ? <Loader2 className="h-4 w-4 animate-spin" /> : null);
  const others = ORDER_STATUSES.filter((s) => s.value !== status && s.value !== next?.value && s.value !== "cancelled");

  return (
    <div className="space-y-3 lg:hidden">
      {cancelled ? (
        <p className="rounded-2xl bg-zinc-100 px-4 py-3 text-center text-[14px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">This order was cancelled</p>
      ) : (
        <ol className="flex items-start" aria-label="Order progress">
          {STEPS.map((s, i) => {
            const done = i <= at;
            return (
              <li key={s.value} className="relative flex flex-1 flex-col items-center text-center">
                {i > 0 && <span className={`absolute right-1/2 top-[11px] h-[3px] w-full rounded-full ${i <= at ? "bg-amber-400" : "bg-zinc-200 dark:bg-zinc-700"}`} />}
                <span className={`relative z-10 flex h-[24px] w-[24px] items-center justify-center rounded-full border-2 ${done ? "border-amber-400 bg-amber-400 text-black" : "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900"} ${i === at ? "ring-4 ring-amber-400/25" : ""}`}>
                  {done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                <span className={`mt-1 text-[11px] leading-tight ${i === at ? "font-bold text-zinc-900 dark:text-white" : "text-zinc-500"}`}>{s.label}</span>
              </li>
            );
          })}
        </ol>
      )}

      {/* A bank transfer to check */}
      {awaitingPayment && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-3.5 dark:border-orange-900/60 dark:bg-orange-950/20">
          <p className="text-[15px] font-semibold text-zinc-900 dark:text-white">Did {formatCurrency(total)} arrive in your bank?</p>
          <p className="mt-0.5 text-[13px] text-zinc-600 dark:text-zinc-400">Check your bank app first. Never trust a screenshot alone.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => update({ paymentStatus: "paid" })} disabled={!!loading} className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-[14px] font-bold text-white disabled:opacity-50">
              {spin("paid") ?? <CheckCircle2 className="h-4 w-4" />} Yes, it arrived
            </button>
            <button onClick={() => update({ paymentStatus: "rejected" })} disabled={!!loading} className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-red-300 bg-white text-[14px] font-bold text-red-600 disabled:opacity-50 dark:border-red-800 dark:bg-transparent">
              {spin("rejected") ?? <XCircle className="h-4 w-4" />} Not received
            </button>
          </div>
        </div>
      )}

      {podBalanceDue && !awaitingPayment && (
        <button onClick={() => update({ paymentStatus: "paid" })} disabled={!!loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-500 text-[15px] font-bold text-emerald-700 disabled:opacity-50 dark:text-emerald-400">
          {spin("paid") ?? <CheckCircle2 className="h-5 w-5" />} I&apos;ve collected the balance
        </button>
      )}

      {next && (
        <button onClick={() => update({ orderStatus: next.value })} disabled={!!loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 text-[15px] font-bold text-white active:scale-[0.99] disabled:opacity-50 dark:bg-white dark:text-zinc-950">
          {spin(next.value)} {next.label}
        </button>
      )}

      {waLink && (
        <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] text-[15px] font-bold text-white">
          <SocialIcon name="whatsapp" size={22} label="" className="rounded-[6px] ring-1 ring-white/50" /> Message customer on WhatsApp
        </a>
      )}

      {!cancelled && (
        <details className="rounded-xl">
          <summary className="cursor-pointer list-none py-1 text-center text-[13px] font-semibold text-zinc-500">More options</summary>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {others.map((s) => (
              <button key={s.value} onClick={() => update({ orderStatus: s.value })} disabled={!!loading} className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-zinc-100 text-[13px] font-semibold text-zinc-700 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-200">
                {spin(s.value)} {s.label}
              </button>
            ))}
            {status !== "delivered" && (
              <button
                onClick={() => {
                  if (window.confirm("Cancel this order? Its stock goes back automatically.")) update({ orderStatus: "cancelled" });
                }}
                disabled={!!loading}
                className="col-span-2 flex h-10 items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold text-red-600 disabled:opacity-50"
              >
                {spin("cancelled")} Cancel order
              </button>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
