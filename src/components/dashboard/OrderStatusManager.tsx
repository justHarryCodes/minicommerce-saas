"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { Order, OrderStatus, PaymentStatus } from "@/types";

interface Props {
  order: Order;
  storeWhatsapp?: string | null;
}

const ORDER_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: "confirmed",  label: "Confirm order" },
  { value: "processing", label: "Mark processing" },
  { value: "shipped",    label: "Mark shipped" },
  { value: "delivered",  label: "Mark delivered" },
  { value: "cancelled",  label: "Cancel order" },
];

export default function OrderStatusManager({ order, storeWhatsapp }: Props) {
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

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-surface-400 font-medium mr-1">Update:</span>

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
      </div>
    </div>
  );
}
