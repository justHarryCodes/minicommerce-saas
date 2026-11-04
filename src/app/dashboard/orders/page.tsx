import { Suspense } from "react";
import { verifySession } from "@/lib/auth";
import { getPageStore } from "@/lib/access";
import { queryMany } from "@/lib/db";
import { getAppUrl } from "@/lib/paystack";
import type { Order } from "@/types";
import OrdersBoard from "./OrdersBoard";

// The newest orders are loaded in full (items + bookings); the board filters
// and searches them in the browser so switching orders is instant.
const LIMIT = 400;

export default async function OrdersPage() {
  const user = await verifySession();
  const store = await getPageStore(user!, "orders");

  const orders = await queryMany<Order>(
    `SELECT o.*,
       (SELECT COALESCE(json_agg(json_build_object(
          'id', oi.id, 'product_name', oi.product_name, 'product_image', oi.product_image, 'size', oi.size,
          'price', oi.price, 'quantity', oi.quantity, 'subtotal', oi.subtotal)), '[]'::json)
        FROM order_items oi WHERE oi.order_id = o.id) AS items,
       (SELECT json_agg(json_build_object('starts_at', b.starts_at, 'status', b.status, 'staff', sm.name) ORDER BY b.starts_at)
          FROM bookings b LEFT JOIN staff_members sm ON sm.id = b.staff_id
         WHERE b.order_id = o.id) AS bookings
     FROM orders o
     WHERE o.store_id = $1
     ORDER BY o.created_at DESC
     LIMIT $2`,
    [store.id, LIMIT + 1]
  );

  return (
    <div className="pt-1 lg:pt-0">
      <Suspense>
        <OrdersBoard
          orders={orders.slice(0, LIMIT)}
          truncated={orders.length > LIMIT}
          store={{ whatsapp: store.whatsapp, name: store.name, slug: store.slug }}
          appUrl={getAppUrl()}
        />
      </Suspense>
    </div>
  );
}
