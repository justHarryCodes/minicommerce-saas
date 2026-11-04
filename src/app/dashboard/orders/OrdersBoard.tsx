"use client";

// Orders as a work queue: filter tabs + search over a compact list, and the
// chosen order's full detail beside it (below it on smaller screens).
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { MapPin, Phone, Search, ShoppingBag, Store as StoreIcon, X } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { formatAppointment } from "@/lib/booking";
import { clThumb } from "@/lib/cloudinary";
import OrderStatusManager from "@/components/dashboard/OrderStatusManager";
import { EmptyState, PaymentText, StatusPill, timeAgo } from "@/components/dashboard/ui";
import { cn } from "@/lib/utils";
import type { Order, OrderItem } from "@/types";

type BoardOrder = Order & {
  channel?: string | null;
  bookings?: { starts_at: string; status: string; staff: string | null }[] | null;
};

const PAYMENT_LABEL: Record<string, string> = {
  paystack: "Duka Pay",
  bank_transfer: "Bank transfer",
  transfer: "Bank transfer",
  pay_on_delivery: "Pay on delivery",
  cash: "Cash (in store)",
  card_terminal: "Card (in store)",
  gift_card: "Gift card",
};

export const ORDER_VIEWS = [
  { id: "all", label: "All", test: () => true },
  { id: "new", label: "New", test: (o: Order) => o.order_status === "pending" },
  { id: "payment", label: "Confirm payment", test: (o: Order) => o.payment_status === "pending_confirmation" || o.payment_status === "rejected" },
  { id: "progress", label: "In progress", test: (o: Order) => ["confirmed", "processing", "shipped"].includes(o.order_status ?? "") },
  { id: "done", label: "Delivered", test: (o: Order) => o.order_status === "delivered" },
  { id: "cancelled", label: "Cancelled", test: (o: Order) => o.order_status === "cancelled" },
] as const;
type ViewId = (typeof ORDER_VIEWS)[number]["id"];

/** Search across number, customer name, phone and email. */
export function matchesOrder(o: Pick<Order, "order_number" | "customer_name" | "customer_phone" | "customer_email">, q: string): boolean {
  const t = q.trim().toLowerCase();
  if (!t) return true;
  const digits = t.replace(/\D/g, "");
  return (
    (o.order_number ?? "").toLowerCase().includes(t) ||
    (o.customer_name ?? "").toLowerCase().includes(t) ||
    (o.customer_email ?? "").toLowerCase().includes(t) ||
    (digits.length >= 3 && (o.customer_phone ?? "").replace(/\D/g, "").includes(digits))
  );
}

export default function OrdersBoard({
  orders,
  store,
  appUrl,
  truncated,
}: {
  orders: BoardOrder[];
  store: { whatsapp?: string | null; name: string; slug: string };
  appUrl: string;
  /** More orders exist than were loaded */
  truncated: boolean;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const initialView = (ORDER_VIEWS.some((v) => v.id === params.get("view")) ? params.get("view") : "all") as ViewId;
  const [view, setView] = useState<ViewId>(initialView);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(params.get("id"));
  const detailRef = useRef<HTMLDivElement>(null);

  const counts = useMemo(() => Object.fromEntries(ORDER_VIEWS.map((v) => [v.id, orders.filter(v.test).length])), [orders]);
  const list = useMemo(() => {
    const test = ORDER_VIEWS.find((v) => v.id === view)!.test;
    return orders.filter((o) => test(o) && matchesOrder(o, q));
  }, [orders, view, q]);
  const current = orders.find((o) => o.id === selected) ?? null;

  // Pick the first order on wide screens so the detail pane is never empty
  useEffect(() => {
    if (!selected && list[0] && window.matchMedia("(min-width: 1280px)").matches) setSelected(list[0].id);
  }, [list, selected]);

  const choose = (id: string) => {
    setSelected(id);
    const url = new URL(window.location.href);
    url.searchParams.set("id", id);
    window.history.replaceState(window.history.state, "", url);
    if (!window.matchMedia("(min-width: 1280px)").matches) setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };
  const changeView = (v: ViewId) => {
    setView(v);
    const url = new URL(window.location.href);
    if (v === "all") url.searchParams.delete("view");
    else url.searchParams.set("view", v);
    window.history.replaceState(window.history.state, "", url);
  };

  if (!orders.length) {
    return (
      <div className="rounded-lg border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <EmptyState icon={ShoppingBag} title="No orders yet" text="Orders from your store, WhatsApp and POS will appear here." />
      </div>
    );
  }

  const now = new Date();
  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* ── List ── */}
      <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900 xl:h-[calc(100vh-6.5rem)]">
        <div className="space-y-2 border-b border-zinc-100 p-2 dark:border-zinc-800">
          <div className="no-scrollbar flex gap-1 overflow-x-auto">
            {ORDER_VIEWS.map((v) => (
              <button
                key={v.id}
                onClick={() => changeView(v.id)}
                aria-pressed={view === v.id}
                className={cn(
                  "flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-[12px] font-semibold",
                  view === v.id ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800",
                )}
              >
                {v.label}
                <span className={cn("tabular-nums", view === v.id ? "opacity-70" : "text-zinc-400")}>{counts[v.id]}</span>
              </button>
            ))}
          </div>
          <label className="flex h-8 items-center gap-2 rounded-md border border-zinc-200 px-2 focus-within:ring-2 focus-within:ring-accent-400 dark:border-zinc-700">
            <Search className="h-3.5 w-3.5 text-zinc-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Order number, name, phone or email"
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13px] text-zinc-900 shadow-none outline-none placeholder:text-zinc-400 focus:ring-0 dark:text-white"
            />
            {q && (
              <button onClick={() => setQ("")} aria-label="Clear search" className="text-zinc-400 hover:text-zinc-700">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </label>
        </div>

        <ul className="min-h-0 flex-1 divide-y divide-zinc-100 overflow-y-auto dark:divide-zinc-800">
          {list.length === 0 && <li className="px-3 py-8 text-center text-[13px] text-zinc-500">No orders match.</li>}
          {list.map((o) => {
            const items = (o.items as OrderItem[] | undefined)?.filter((i) => i?.product_name) ?? [];
            const qty = items.reduce((s, i) => s + Number(i.quantity ?? 0), 0);
            return (
              <li key={o.id}>
                <button
                  onClick={() => choose(o.id)}
                  aria-current={selected === o.id}
                  className={cn(
                    "grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-3 px-3 py-2 text-left transition-colors",
                    selected === o.id ? "bg-accent-50 dark:bg-accent-950/30" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="text-[13px] font-semibold text-zinc-900 dark:text-white">{o.order_number}</span>
                    {o.channel === "pos" && <span className="rounded bg-zinc-100 px-1 text-[10px] font-semibold text-zinc-500 dark:bg-zinc-800">POS</span>}
                    <StatusPill status={o.order_status} />
                  </span>
                  <span className="text-right text-[13px] font-semibold tabular-nums text-zinc-900 dark:text-white">{formatCurrency(Number(o.total_amount ?? o.total ?? 0))}</span>
                  <span className="truncate text-[12px] text-zinc-500">
                    {o.customer_name} · {qty} item{qty === 1 ? "" : "s"}
                  </span>
                  <span className="flex items-center justify-end gap-2 text-[11px] text-zinc-400">
                    <PaymentText status={o.payment_status} className="!text-[11px]" />
                    <span className="tabular-nums">{timeAgo(o.created_at ?? null, now)}</span>
                  </span>
                </button>
              </li>
            );
          })}
          {truncated && <li className="px-3 py-2 text-center text-[11px] text-zinc-400">Showing your latest {orders.length} orders. Search covers these.</li>}
        </ul>
      </section>

      {/* ── Detail ── */}
      <div ref={detailRef} className="min-w-0 scroll-mt-16 xl:h-[calc(100vh-6.5rem)] xl:overflow-y-auto">
        {current ? (
          <OrderDetail order={current} store={store} appUrl={appUrl} onClose={() => { setSelected(null); router.replace("/dashboard/orders" + (view !== "all" ? `?view=${view}` : ""), { scroll: false }); }} />
        ) : (
          <div className="hidden h-full items-center justify-center rounded-lg border border-dashed border-zinc-200 text-[13px] text-zinc-400 dark:border-zinc-800 xl:flex">Choose an order to see it here</div>
        )}
      </div>
    </div>
  );
}

function OrderDetail({ order, store, appUrl, onClose }: { order: BoardOrder; store: { whatsapp?: string | null; name: string; slug: string }; appUrl: string; onClose: () => void }) {
  const items = ((order.items as OrderItem[] | undefined) ?? []).filter((i) => i?.product_name);
  const address = [order.delivery_address, order.delivery_city, order.delivery_state].filter(Boolean).join(", ");
  const how = order.delivery_method === "appointment" ? "Appointment" : order.delivery_method === "pickup" ? "Pickup" : "Delivery";
  return (
    <article className="overflow-hidden rounded-lg border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex items-start justify-between gap-2 border-b border-zinc-100 px-3 py-2.5 dark:border-zinc-800">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-1.5">
            <span className="text-base font-bold text-zinc-900 dark:text-white">{order.order_number}</span>
            <StatusPill status={order.order_status} />
            <PaymentText status={order.payment_status} />
          </p>
          <p className="text-[12px] text-zinc-500">
            {formatDate(order.created_at ?? "")} · {PAYMENT_LABEL[order.payment_method ?? ""] ?? order.payment_method}
          </p>
        </div>
        <div className="flex items-start gap-1">
          <p className="text-lg font-bold tabular-nums text-zinc-900 dark:text-white">{formatCurrency(Number(order.total_amount ?? order.total ?? 0))}</p>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-zinc-400 hover:bg-zinc-100 xl:hidden dark:hover:bg-zinc-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="grid gap-3 border-b border-zinc-100 px-3 py-2.5 text-[13px] dark:border-zinc-800 sm:grid-cols-2">
        <div className="min-w-0">
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Customer</p>
          <p className="font-medium text-zinc-900 dark:text-white">{order.customer_name}</p>
          {order.customer_phone && (
            <a href={`tel:${order.customer_phone}`} className="flex items-center gap-1 text-zinc-600 hover:underline dark:text-zinc-300">
              <Phone className="h-3 w-3" /> {order.customer_phone}
            </a>
          )}
          {order.customer_email && <p className="truncate text-zinc-500">{order.customer_email}</p>}
        </div>
        <div className="min-w-0">
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            {how}
            {order.delivery_zone && ` · ${order.delivery_zone}`}
          </p>
          {address && (
            <p className="flex items-start gap-1 text-zinc-700 dark:text-zinc-300">
              {order.delivery_method === "pickup" ? <StoreIcon className="mt-0.5 h-3 w-3 shrink-0" /> : <MapPin className="mt-0.5 h-3 w-3 shrink-0" />} {address}
            </p>
          )}
          {order.bookings?.map((b, i) => (
            <p key={i} className={cn("font-medium text-zinc-900 dark:text-white", b.status === "cancelled" && "line-through opacity-50")}>
              📅 {formatAppointment(b.starts_at)}
              {b.staff ? ` · ${b.staff}` : ""}
            </p>
          ))}
          {order.scheduled_for && <p className="text-[12px] font-medium text-amber-600 dark:text-amber-400">Placed while closed — prepare from {formatAppointment(order.scheduled_for)}</p>}
          {order.delivery_note && <p className="text-[12px] italic text-zinc-500">“{order.delivery_note}”</p>}
        </div>
      </div>

      {items.length > 0 && (
        <div className="border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
          <table className="w-full text-[13px]">
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/60">
              {items.map((it, i) => (
                <tr key={i}>
                  <td className="w-9 py-1">
                    {it.product_image ? (
                      <Image src={clThumb(it.product_image)} alt="" width={28} height={28} className="h-7 w-7 rounded object-cover" />
                    ) : (
                      <span className="block h-7 w-7 rounded bg-zinc-100 dark:bg-zinc-800" />
                    )}
                  </td>
                  <td className="py-1 text-zinc-900 dark:text-white">
                    {it.product_name}
                    {it.size && <span className="text-zinc-400"> · {it.size}</span>}
                  </td>
                  <td className="w-10 py-1 text-right tabular-nums text-zinc-500">×{it.quantity}</td>
                  <td className="w-24 py-1 text-right font-semibold tabular-nums text-zinc-900 dark:text-white">{formatCurrency(Number(it.subtotal))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <OrderMoney order={order} />
        </div>
      )}

      <div className="px-3 py-2.5">
        <OrderStatusManager order={order} storeWhatsapp={store.whatsapp} storeName={store.name} storeSlug={store.slug} appUrl={appUrl} />
      </div>
    </article>
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
    <div className="ml-auto mt-1.5 max-w-xs space-y-0.5 border-t border-zinc-100 pt-1.5 text-[12px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
      <div className={row}><span>Subtotal</span><span className="tabular-nums">{formatCurrency(Number(order.subtotal ?? 0))}</span></div>
      {discount > 0 && (
        <div className={row}><span>Discount{order.coupon_code ? ` (${order.coupon_code})` : ""}</span><span className="tabular-nums">−{formatCurrency(discount)}</span></div>
      )}
      <div className={row}>
        <span>{order.delivery_method === "pickup" ? "Pickup" : "Delivery"}</span>
        <span className="tabular-nums">{fee > 0 ? formatCurrency(fee) : order.delivery_method === "pickup" || order.delivery_zone ? "Free" : "To be arranged"}</span>
      </div>
      <div className={`${row} text-[13px] font-bold text-zinc-900 dark:text-white`}><span>Total</span><span className="tabular-nums">{formatCurrency(total)}</span></div>
      {pod && deposit > 0 && (
        <div className={row}><span>Deposit (online)</span><span className="tabular-nums">{formatCurrency(deposit)}{order.payment_status === "deposit_paid" || order.payment_status === "paid" ? " ✓" : ""}</span></div>
      )}
      {due > 0 && <div className={`${row} font-semibold text-amber-600 dark:text-amber-400`}><span>Collect on delivery</span><span className="tabular-nums">{formatCurrency(due)}</span></div>}
    </div>
  );
}
