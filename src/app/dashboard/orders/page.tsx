import Image from "next/image";
import { verifySession } from "@/lib/auth";
import { getPageStore } from "@/lib/access";
import { queryMany } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getAppUrl } from "@/lib/paystack";
import { formatAppointment } from "@/lib/booking";
import OrderStatusManager from "@/components/dashboard/OrderStatusManager";
import { ShoppingBag } from "lucide-react";
import type { Order, OrderItem } from "@/types";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-400 dark:border-yellow-800",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800",
  processing: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-800",
  shipped: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-800",
  delivered: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800",
  cancelled: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800",
};

const PAYMENT_LABEL: Record<string, string> = {
  paystack: "Paid online",
  bank_transfer: "Bank transfer",
  transfer: "Bank transfer",
  pay_on_delivery: "Pay on delivery",
  cash: "Cash (in store)",
  card_terminal: "Card (in store)",
  gift_card: "Gift card",
};

const PAY_STATUS_STYLES: Record<string, string> = {
  pending:              "text-yellow-600",
  pending_confirmation: "text-orange-600",
  paid:                 "text-green-600",
  failed:               "text-red-500",
  rejected:             "text-red-600 font-semibold",
  deposit_paid:         "text-green-600",
};

export default async function OrdersPage() {
  const user = await verifySession();
  const store = await getPageStore(user!, "orders");
  const appUrl = getAppUrl();

  const orders = await queryMany<Order>(
    `SELECT o.*, 
       json_agg(
         json_build_object(
           'id', oi.id,
           'product_name', oi.product_name,
           'product_image', oi.product_image,
           'size', oi.size,
           'price', oi.price,
           'quantity', oi.quantity,
           'subtotal', oi.subtotal
         )
       ) AS items,
       (SELECT json_agg(json_build_object('starts_at', b.starts_at, 'status', b.status, 'staff', sm.name) ORDER BY b.starts_at)
          FROM bookings b LEFT JOIN staff_members sm ON sm.id = b.staff_id
         WHERE b.order_id = o.id) AS bookings
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.store_id = $1
     GROUP BY o.id
     ORDER BY o.created_at DESC`,
    [store!.id]
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pt-4 lg:pt-0">
      <div>
        <h1 className="text-xl font-bold text-surface-900 dark:text-white">Orders</h1>
        <p className="text-sm text-surface-500 dark:text-surface-400">
          {orders.length} total order{orders.length !== 1 ? "s" : ""}
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 p-16 text-center">
          <ShoppingBag className="w-12 h-12 text-surface-200 dark:text-surface-700 mx-auto mb-4" />
          <h3 className="font-semibold text-surface-900 dark:text-white mb-2">
            No orders yet
          </h3>
          <p className="text-sm text-surface-400">
            Orders from customers will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-100 dark:border-surface-800 overflow-hidden"
            >
              {/* Order header */}
              <div className="p-5 border-b border-surface-50 dark:border-surface-800 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-surface-900 dark:text-white text-sm">
                      {order.order_number}
                    </span>
                    {(order as { channel?: string }).channel === "pos" && (
                      <span className="text-xs px-2 py-1 rounded-full bg-surface-900 text-white dark:bg-white dark:text-black font-semibold">In store</span>
                    )}
                    <span
                      className={`text-xs px-2 py-1 rounded-full border font-medium ${
                        STATUS_STYLES[order.order_status ?? "pending"]
                      }`}
                    >
                      {order.order_status}
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        PAY_STATUS_STYLES[order.payment_status ?? "pending"] ?? "text-surface-500"
                      }`}
                    >
                      {order.payment_status === "pending_confirmation"
                        ? "⏳ Awaiting confirmation"
                        : order.payment_status === "rejected"
                        ? "❌ Payment not received"
                        : order.payment_status === "deposit_paid"
                        ? "Deposit paid"
                        : order.payment_status}
                    </span>
                  </div>
                  <div className="text-xs text-surface-400 mt-1">
                    {formatDate(order.created_at ?? "")} · {PAYMENT_LABEL[order.payment_method ?? ""] ?? order.payment_method}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-lg text-surface-900 dark:text-white">
                    {formatCurrency(order.total_amount ?? order.total ?? 0)}
                  </div>
                </div>
              </div>

              {/* Customer info */}
              <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm border-b border-surface-50 dark:border-surface-800">
                <div>
                  <div className="text-xs text-surface-400 font-medium uppercase tracking-wider mb-1">
                    Customer
                  </div>
                  <div className="font-medium text-surface-900 dark:text-white">
                    {order.customer_name}
                  </div>
                  <div className="text-surface-500 dark:text-surface-400">
                    {order.customer_phone}
                  </div>
                  {order.customer_email && (
                    <div className="text-surface-500 dark:text-surface-400">
                      {order.customer_email}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-surface-400 font-medium uppercase tracking-wider mb-1">
                    {order.delivery_method === "appointment" ? "Appointment" : order.delivery_method === "pickup" ? "Customer pickup" : "Delivery"}
                    {order.delivery_zone && ` · ${order.delivery_zone}`}
                  </div>
                  <div className="text-surface-700 dark:text-surface-300">
                    {[order.delivery_address, order.delivery_city, order.delivery_state].filter(Boolean).join(", ")}
                  </div>
                  {(order as { bookings?: { starts_at: string; status: string; staff: string | null }[] | null }).bookings?.map((b, i) => (
                    <div key={i} className={`text-sm font-medium text-surface-900 dark:text-white ${b.status === "cancelled" ? "line-through opacity-50" : ""}`}>
                      📅 {formatAppointment(b.starts_at)}{b.staff ? ` · ${b.staff}` : ""}
                    </div>
                  ))}
                  {order.scheduled_for && (
                    <div className="text-xs font-medium text-amber-600 dark:text-amber-400 mt-1">Placed while closed — prepare from {formatAppointment(order.scheduled_for)}</div>
                  )}
                  {order.delivery_note && (
                    <div className="text-xs italic text-surface-500 mt-1">“{order.delivery_note}”</div>
                  )}
                </div>
              </div>

              {/* Order items */}
              {order.items && order.items.length > 0 && (
                <div className="px-5 py-4 border-b border-surface-50 dark:border-surface-800">
                  <div className="text-xs text-surface-400 font-medium uppercase tracking-wider mb-3">
                    Items ordered
                  </div>
                  <div className="space-y-2">
                    {(order.items as OrderItem[]).map((item, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        {item.product_image && (
                          <Image
                            src={item.product_image}
                            alt={item.product_name ?? "Product"}
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-lg object-cover border border-surface-100 dark:border-surface-700 shrink-0"
                          />
                        )}
                        <span className="flex-1 text-surface-900 dark:text-white">
                          {item.product_name}
                          {item.size && (
                            <span className="text-surface-400 font-normal"> · {item.size}</span>
                          )}
                        </span>
                        <span className="text-surface-500 dark:text-surface-400">
                          ×{item.quantity}
                        </span>
                        <span className="font-semibold text-surface-900 dark:text-white">
                          {formatCurrency(item.subtotal)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <OrderMoney order={order} />
                </div>
              )}

              {/* Status management */}
              <div className="px-5 py-4">
                <OrderStatusManager
                  order={order}
                  storeWhatsapp={store!.whatsapp}
                  storeName={store!.name}
                  storeSlug={store!.slug}
                  appUrl={appUrl}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Subtotal → discount → delivery → total, plus what's still to collect. */
function OrderMoney({ order }: { order: Order }) {
  const total = Number(order.total_amount ?? order.total ?? 0);
  const fee = Number(order.delivery_fee ?? 0);
  const discount = Number(order.discount_amount ?? 0);
  const deposit = Number(order.deposit_amount ?? 0);
  const pod = order.payment_method === "pay_on_delivery";
  const collected = order.payment_status === "paid" ? total : order.payment_status === "deposit_paid" ? deposit : 0;
  const due = pod && order.order_status !== "cancelled" ? Math.max(0, total - collected) : 0;
  const row = "flex justify-between gap-4";
  return (
    <div className="mt-3 pt-3 border-t border-surface-50 dark:border-surface-800 ml-auto max-w-xs space-y-1 text-sm text-surface-500 dark:text-surface-400">
      <div className={row}><span>Subtotal</span><span>{formatCurrency(Number(order.subtotal ?? 0))}</span></div>
      {discount > 0 && (
        <div className={row}><span>Discount{order.coupon_code ? ` (${order.coupon_code})` : ""}</span><span>−{formatCurrency(discount)}</span></div>
      )}
      <div className={row}>
        <span>{order.delivery_method === "pickup" ? "Pickup" : "Delivery"}</span>
        <span>{fee > 0 ? formatCurrency(fee) : order.delivery_method === "pickup" || order.delivery_zone ? "Free" : "To be arranged"}</span>
      </div>
      <div className={`${row} font-bold text-surface-900 dark:text-white`}><span>Total</span><span>{formatCurrency(total)}</span></div>
      {pod && deposit > 0 && (
        <div className={row}><span>Deposit (online)</span><span>{formatCurrency(deposit)}{order.payment_status === "deposit_paid" || order.payment_status === "paid" ? " ✓" : ""}</span></div>
      )}
      {due > 0 && (
        <div className={`${row} font-semibold text-amber-600 dark:text-amber-400`}><span>Collect on delivery</span><span>{formatCurrency(due)}</span></div>
      )}
    </div>
  );
}
