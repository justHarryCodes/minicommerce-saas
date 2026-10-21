// Customer list (CRM) derived from orders — no separate customers table.
// Shoppers are grouped by phone number normalised to 234XXXXXXXXXX, so
// "0801…", "+234 801…" and "801…" are the same person.

import { query } from "@/lib/db";
import type { CustomerRow } from "@/lib/customers-shared";
export type { CustomerRow } from "@/lib/customers-shared";

/** SQL expression normalising orders.customer_phone the same way as lib/phone. */
export const PHONE_KEY_SQL = `(
  CASE
    WHEN regexp_replace(o.customer_phone, '\\D', '', 'g') ~ '^2340[789]\\d{9}$' THEN '234' || substr(regexp_replace(o.customer_phone, '\\D', '', 'g'), 5)
    WHEN regexp_replace(o.customer_phone, '\\D', '', 'g') ~ '^0[789]\\d{9}$' THEN '234' || substr(regexp_replace(o.customer_phone, '\\D', '', 'g'), 2)
    WHEN regexp_replace(o.customer_phone, '\\D', '', 'g') ~ '^[789]\\d{9}$' THEN '234' || regexp_replace(o.customer_phone, '\\D', '', 'g')
    ELSE regexp_replace(o.customer_phone, '\\D', '', 'g')
  END
)`;


export async function listCustomers(storeId: string, limit = 2000): Promise<CustomerRow[]> {
  return query<CustomerRow>(
    `WITH o AS (
       SELECT o.*, ${PHONE_KEY_SQL} AS phone_key
       FROM orders o
       WHERE o.store_id = $1 AND o.order_status <> 'cancelled'
     )
     SELECT phone_key AS key,
            (array_agg(customer_name ORDER BY created_at DESC))[1] AS name,
            (array_agg(customer_phone ORDER BY created_at DESC))[1] AS phone,
            (array_agg(customer_email ORDER BY created_at DESC) FILTER (WHERE customer_email IS NOT NULL))[1] AS email,
            COUNT(*)::int AS orders,
            COALESCE(SUM(COALESCE(total_amount, total)), 0)::float AS total_spent,
            MIN(created_at) AS first_order_at,
            MAX(created_at) AS last_order_at,
            (array_agg(COALESCE(delivery_city, delivery_state) ORDER BY created_at DESC))[1] AS last_city
     FROM o
     GROUP BY phone_key
     ORDER BY MAX(created_at) DESC
     LIMIT $2`,
    [storeId, limit]
  );
}

export async function customerOrders(storeId: string, phoneKey: string) {
  return query<{
    id: string; order_number: string; created_at: string; total: number; order_status: string; payment_status: string;
    items: number;
  }>(
    `SELECT o.id, o.order_number, o.created_at, COALESCE(o.total_amount, o.total)::float AS total,
            o.order_status, o.payment_status,
            (SELECT COALESCE(SUM(quantity), 0)::int FROM order_items oi WHERE oi.order_id = o.id) AS items
     FROM orders o
     WHERE o.store_id = $1 AND ${PHONE_KEY_SQL} = $2
     ORDER BY o.created_at DESC
     LIMIT 100`,
    [storeId, phoneKey]
  );
}

