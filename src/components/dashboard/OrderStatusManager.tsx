"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import type { Order, OrderStatus, PaymentStatus } from "@/types";

interface Props {
  order: Order;
}

const ORDER_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: "confirmed", label: "Confirm order" },
  { value: "processing", label: "Mark processing" },
  { value: "shipped", label: "Mark shipped" },
  { value: "delivered", label: "Mark delivered" },
  { value: "cancelled", label: "Cancel order" },
];

export default function OrderStatusManager({ order }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function updateOrderStatus(status: OrderStatus | PaymentStatus, field: string) {
    setLoading(status);
    try {
      const res = await fetch(`/api/merchant/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: status }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success("Order updated!");
      router.refresh();
    } catch {
      toast.error("Failed to update order");
    } finally {
      setLoading(null);
    }
  }

  const availableStatuses = ORDER_STATUSES.filter(
    (s) => s.value !== order.order_status
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-surface-400 font-medium mr-1">Update:</span>

      {/* Payment confirmation for bank transfers */}
      {order.payment_method === "bank_transfer" &&
        order.payment_status === "pending_confirmation" && (
          <button
            onClick={() => updateOrderStatus("paid", "payment_status")}
            disabled={!!loading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-950/30 font-medium transition-all disabled:opacity-50"
          >
            {loading === "paid" && <Loader2 className="w-3 h-3 animate-spin" />}
            ✓ Confirm payment
          </button>
        )}

      {availableStatuses.map((s) => (
        <button
          key={s.value}
          onClick={() => updateOrderStatus(s.value, "order_status")}
          disabled={!!loading}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-all disabled:opacity-50 ${
            s.value === "cancelled"
              ? "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-950/30"
              : "bg-surface-50 dark:bg-surface-800 text-surface-700 dark:text-surface-300 border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-700"
          }`}
        >
          {loading === s.value && <Loader2 className="w-3 h-3 animate-spin" />}
          {s.label}
        </button>
      ))}
    </div>
  );
}
