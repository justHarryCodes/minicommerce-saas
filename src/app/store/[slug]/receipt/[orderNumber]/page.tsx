import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, Circle, Clock, Package, Truck, XCircle } from "lucide-react";
import { query, queryOne } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import PrintButton from "./PrintButton";
import { formatAppointment } from "@/lib/booking";
import ClearCart from "./ClearCart";

interface Props {
  params: Promise<{ slug: string; orderNumber: string }>;
  searchParams: Promise<{ t?: string; paid?: string }>;
}

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Receipt", robots: { index: false, follow: false } };

interface ReceiptOrder {
  id: string;
  order_number: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  delivery_method: string;
  delivery_zone: string | null;
  delivery_address: string;
  delivery_city: string | null;
  delivery_state: string | null;
  delivery_note: string | null;
  subtotal: number;
  discount_amount: number;
  coupon_code: string | null;
  loyalty_discount?: number | null;
  gift_card_code?: string | null;
  gift_card_amount?: number | null;
  delivery_fee: number;
  total: number;
  total_amount: number | null;
  deposit_amount: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
  store_name: string;
  store_phone: string | null;
  store_whatsapp: string | null;
  delivery_time_frame: string | null;
  scheduled_for: string | null;
}

const PAYMENT_LABEL: Record<string, string> = {
  paystack: "Paid online (Paystack)",
  bank_transfer: "Bank transfer",
  transfer: "Bank transfer",
  pay_on_delivery: "Pay on delivery",
  cash: "Cash (in store)",
  card_terminal: "Card (in store)",
  gift_card: "Gift card",
};

const PAYMENT_STATUS: Record<string, { label: string; tone: string }> = {
  paid: { label: "Paid", tone: "text-emerald-600 dark:text-emerald-400" },
  deposit_paid: { label: "Deposit paid", tone: "text-emerald-600 dark:text-emerald-400" },
  pending: { label: "Awaiting payment", tone: "text-amber-600 dark:text-amber-400" },
  pending_confirmation: { label: "Payment being confirmed", tone: "text-amber-600 dark:text-amber-400" },
  failed: { label: "Payment failed", tone: "text-red-500" },
  rejected: { label: "Payment not received", tone: "text-red-500" },
  refunded: { label: "Refunded", tone: "text-surface-500" },
};

const STEPS = ["pending", "confirmed", "processing", "shipped", "delivered"] as const;
const STEP_LABEL: Record<string, string> = {
  pending: "Order placed",
  confirmed: "Confirmed",
  processing: "Preparing",
  shipped: "On the way",
  delivered: "Delivered",
};

export default async function ReceiptPage({ params, searchParams }: Props) {
  const { slug, orderNumber } = await params;
  const { t, paid } = await searchParams;
  if (!t || !/^[a-f0-9]{16,64}$/i.test(t)) notFound();

  const order = await queryOne<ReceiptOrder>(
    `SELECT o.*, s.name AS store_name, s.phone AS store_phone, s.whatsapp AS store_whatsapp, s.delivery_time_frame
     FROM orders o JOIN stores s ON s.id = o.store_id
     WHERE s.slug = $1 AND o.order_number = $2 AND o.access_token = $3`,
    [slug, decodeURIComponent(orderNumber).toUpperCase(), t]
  );
  if (!order) notFound();

  const bookings = await query<{ product_name: string; starts_at: string; status: string; staff_name: string | null }>(
    `SELECT b.product_name, b.starts_at, b.status, sm.name AS staff_name
     FROM bookings b LEFT JOIN staff_members sm ON sm.id = b.staff_id
     WHERE b.order_id = $1 ORDER BY b.starts_at`,
    [order.id]
  );
  const appointmentOnly = order.delivery_method === "appointment";

  const items = await query<{ product_name: string; size: string | null; price: number; quantity: number; subtotal: number }>(
    "SELECT product_name, size, price, quantity, subtotal FROM order_items WHERE order_id = $1",
    [order.id]
  );

  const h = await headers();
  const storeBase = h.get("x-is-subdomain") === "1" ? "" : `/store/${slug}`;

  const total = Number(order.total_amount ?? order.total);
  const deposit = Number(order.deposit_amount ?? 0);
  const pod = order.payment_method === "pay_on_delivery";
  const paidSoFar =
    order.payment_status === "paid" ? total : order.payment_status === "deposit_paid" ? deposit : 0;
  const balance = Math.max(0, total - paidSoFar);
  const cancelled = order.order_status === "cancelled";
  const stepIndex = STEPS.indexOf(order.order_status as (typeof STEPS)[number]);
  const pickup = order.delivery_method === "pickup";
  const payStatus = PAYMENT_STATUS[order.payment_status] ?? { label: order.payment_status, tone: "" };
  const date = new Date(order.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 print:max-w-none print:p-0">
      {paid === "1" && <ClearCart />}
      {paid === "1" && (order.payment_status === "paid" || order.payment_status === "deposit_paid") && (
        <div className="mb-4 flex items-center gap-3 rounded-[var(--sf-radius)] border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 print:hidden">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <p className="text-sm font-semibold">
            {order.payment_status === "deposit_paid" ? "Deposit received — your order is confirmed!" : "Payment successful — your order is confirmed!"}
          </p>
        </div>
      )}
      <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
        <Link href={storeBase || "/"} className="text-sm font-semibold text-surface-500 hover:text-surface-900 dark:hover:text-white">
          ← Back to store
        </Link>
        <PrintButton />
      </div>

      <article className="overflow-hidden rounded-[var(--sf-radius)] border border-surface-200 bg-white text-surface-900 dark:border-surface-800 dark:bg-surface-900 dark:text-white print:rounded-none print:border-0">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-surface-100 p-6 dark:border-surface-800">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-surface-400">Receipt</p>
            <h1 className="mt-1 text-2xl">{order.store_name}</h1>
            <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">{[order.store_phone, order.store_whatsapp && order.store_whatsapp !== order.store_phone ? `WhatsApp ${order.store_whatsapp}` : null].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm font-bold">{order.order_number}</p>
            <p className="text-xs text-surface-500 dark:text-surface-400">{date}</p>
            <p className={`mt-2 text-sm font-bold ${payStatus.tone}`}>{payStatus.label}</p>
          </div>
        </header>

        {/* Progress */}
        <section className="border-b border-surface-100 p-6 dark:border-surface-800 print:hidden">
          {cancelled ? (
            <p className="flex items-center gap-2 font-semibold text-red-500">
              <XCircle className="h-5 w-5" /> This order was cancelled
            </p>
          ) : (
            <ol className="grid grid-cols-5 gap-1">
              {STEPS.map((s, i) => {
                const done = i <= stepIndex;
                const label = s === "shipped" && pickup ? "Ready for pickup" : STEP_LABEL[s];
                const Icon = done ? CheckCircle2 : i === stepIndex + 1 ? Clock : Circle;
                return (
                  <li key={s} className="flex flex-col items-center gap-1.5 text-center">
                    <Icon className={`h-5 w-5 ${done ? "" : "text-surface-300 dark:text-surface-600"}`} style={done ? { color: "var(--sf-accent-ink)" } : undefined} />
                    <span className={`text-[11px] leading-tight ${done ? "font-semibold" : "text-surface-400"}`}>{label}</span>
                  </li>
                );
              })}
            </ol>
          )}
          {!cancelled && order.delivery_time_frame && stepIndex < 4 && (
            <p className="mt-4 flex items-center justify-center gap-2 text-sm text-surface-500 dark:text-surface-400">
              <Truck className="h-4 w-4" /> Estimated delivery: <span className="font-semibold text-surface-900 dark:text-white">{order.delivery_time_frame}</span>
            </p>
          )}
        </section>

        {/* Items */}
        <section className="p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100 text-left text-xs uppercase tracking-wider text-surface-400 dark:border-surface-800">
                <th className="pb-2 font-semibold">Item</th>
                <th className="pb-2 text-center font-semibold">Qty</th>
                <th className="pb-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className="border-b border-surface-50 dark:border-surface-800/60">
                  <td className="py-3 pr-2">
                    <p className="font-medium">{it.product_name}</p>
                    <p className="text-xs text-surface-400">
                      {formatCurrency(Number(it.price))} each{it.size ? ` · ${it.size}` : ""}
                    </p>
                  </td>
                  <td className="py-3 text-center">{it.quantity}</td>
                  <td className="py-3 text-right font-medium">{formatCurrency(Number(it.subtotal))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="ml-auto mt-4 max-w-xs space-y-1.5 text-sm">
            <Row label="Subtotal" value={formatCurrency(Number(order.subtotal))} />
            {Number(order.discount_amount) - Number(order.loyalty_discount ?? 0) > 0 && (
              <Row label={`Discount${order.coupon_code ? ` (${order.coupon_code})` : ""}`} value={`−${formatCurrency(Number(order.discount_amount) - Number(order.loyalty_discount ?? 0))}`} />
            )}
            {Number(order.loyalty_discount ?? 0) > 0 && (
              <Row label="Loyalty reward" value={`−${formatCurrency(Number(order.loyalty_discount))}`} />
            )}
            {!appointmentOnly && <Row
              label={pickup ? "Pickup" : `Delivery${order.delivery_zone ? ` · ${order.delivery_zone}` : ""}`}
              value={pickup || Number(order.delivery_fee) === 0 ? (pickup ? "Free" : order.delivery_zone ? "Free" : "To be arranged") : formatCurrency(Number(order.delivery_fee))}
            />}
            {Number(order.gift_card_amount ?? 0) > 0 && (
              <Row label={`Gift card${order.gift_card_code ? ` (…${order.gift_card_code.slice(-4)})` : ""}`} value={`−${formatCurrency(Number(order.gift_card_amount))}`} />
            )}
            <div className="flex justify-between border-t border-surface-200 pt-2 text-base font-black dark:border-surface-700">
              <dt>Total</dt>
              <dd>{formatCurrency(total)}</dd>
            </div>
            {paidSoFar > 0 && balance > 0 && <Row label="Paid" value={formatCurrency(paidSoFar)} />}
            {balance > 0 && order.payment_status !== "refunded" && (
              <div className="flex justify-between font-bold" style={{ color: "var(--sf-accent-ink)" }}>
                <dt>{pod ? "Due on delivery" : "Amount due"}</dt>
                <dd>{formatCurrency(balance)}</dd>
              </div>
            )}
          </dl>
        </section>

        {/* Details */}
        <section className="grid gap-6 border-t border-surface-100 p-6 text-sm dark:border-surface-800 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-surface-400">{appointmentOnly ? "Appointment" : pickup ? "Pickup" : "Deliver to"}</p>
            {bookings.map((b, i) => (
              <p key={i} className={`font-semibold ${b.status === "cancelled" ? "line-through text-surface-400" : ""}`}>
                📅 {formatAppointment(b.starts_at)}{b.staff_name ? ` · with ${b.staff_name}` : ""}
                {bookings.length > 1 && <span className="block text-xs font-normal text-surface-500">{b.product_name}</span>}
              </p>
            ))}
            {order.scheduled_for && (
              <p className="text-amber-700 dark:text-amber-300">Placed while closed — prepared from {formatAppointment(order.scheduled_for)}</p>
            )}
            <p className="font-semibold">{order.customer_name}</p>
            <p className="text-surface-600 dark:text-surface-300">{order.customer_phone}</p>
            <p className="text-surface-600 dark:text-surface-300">
              {[order.delivery_address, order.delivery_city, order.delivery_state].filter(Boolean).join(", ")}
            </p>
            {order.delivery_note && <p className="mt-1 text-xs italic text-surface-500">“{order.delivery_note}”</p>}
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-surface-400">Payment</p>
            <p className="font-semibold">{PAYMENT_LABEL[order.payment_method] ?? order.payment_method}</p>
            {pod && deposit > 0 && <p className="text-surface-600 dark:text-surface-300">Deposit {formatCurrency(deposit)} online</p>}
            <p className={payStatus.tone}>{payStatus.label}</p>
          </div>
        </section>

        <footer className="flex items-center justify-between gap-3 border-t border-surface-100 px-6 py-4 text-xs text-surface-400 dark:border-surface-800">
          <span className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" /> Thank you for your order
          </span>
          <span>Powered by Duka</span>
        </footer>
      </article>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-surface-600 dark:text-surface-300">
      <dt>{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
