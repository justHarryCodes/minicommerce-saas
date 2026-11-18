// Tools the Duka Assistant can use.
//
// Read tools run here, scoped to the signed-in member's store and limited by
// their role and plan. Action tools never change anything: they return an
// ActionProposal that the dashboard shows as a card, and only when the person
// taps Confirm does the browser call Duka's normal endpoint with their own
// session (so every existing check, permission and side effect applies).

import { query, queryOne } from "@/lib/db";
import { ROLE_PERMISSIONS, type Permission, type Role } from "@/lib/access-shared";
import { FEATURES, type Feature } from "@/lib/features-shared";
import type { EffectivePlan } from "@/lib/plan";
import { getAnalytics, RANGES, type RangeDays } from "@/lib/analytics";
import { lowStockItems } from "@/lib/inventory";
import { listCustomers } from "@/lib/customers";
import { platformFeePercent } from "@/lib/duka-pay-shared";
import { getStoreUrl } from "@/lib/utils";
import { HELP, searchHelp } from "./knowledge";

export interface AssistantContext {
  store: Record<string, any>;
  role: Role;
  plan: EffectivePlan;
  features: Set<Feature>;
}

/* ─────────────────────────── What the UI renders ─────────────────────────── */

export type Card =
  | { kind: "orders"; title: string; orders: { number: string; customer: string; total: number; status: string; payment: string; date: string }[]; href: string }
  | { kind: "products"; title: string; products: { name: string; price: number; stock: number | null; active: boolean; image: string | null; href: string }[] }
  | { kind: "stats"; title: string; items: { label: string; value: string; note?: string }[]; href?: string }
  | { kind: "checklist"; title: string; items: { label: string; done: boolean; href: string }[] }
  | { kind: "articles"; articles: { title: string; href?: string }[] };

export interface ActionProposal {
  id: string;
  title: string;
  /** What will happen, shown as label/value rows */
  details: [string, string][];
  /** Extra caution shown on the card */
  warning?: string;
  confirmLabel: string;
  request: { method: "POST" | "PATCH"; url: string; body: Record<string, unknown> };
  /** Shown after it worked */
  doneText: string;
}

export interface ToolResult {
  /** What the model reads (kept small) */
  content: unknown;
  card?: Card;
  action?: ActionProposal;
}

/* ─────────────────────────── Helpers ─────────────────────────── */

const can = (ctx: AssistantContext, p: Permission) => ROLE_PERMISSIONS[ctx.role].includes(p);
const naira = (n: number) => `₦${Math.round(Number(n) || 0).toLocaleString("en-NG")}`;
const noAccess = (what: string) => ({ content: { error: `Your team role can't see ${what}. Ask the store owner.` } });
const locked = (f: Feature) => ({
  content: { locked: true, feature: FEATURES[f].label, message: `${FEATURES[f].label} is part of the paid plans. Upgrade in Billing to use it.`, upgradeUrl: "/dashboard/billing" },
});
const s = (v: unknown, max = 120) => String(v ?? "").trim().slice(0, max);
const dateNg = (d: string | Date) => new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", timeZone: "Africa/Lagos" });
const id = () => Math.random().toString(36).slice(2, 10);

async function findOrder(ctx: AssistantContext, ref: string) {
  const r = s(ref, 40).replace(/^#/, "");
  if (!r) return null;
  return queryOne<{ id: string; order_number: string; order_status: string; payment_status: string; payment_method: string; customer_name: string; total: number }>(
    `SELECT id, order_number, order_status, payment_status, payment_method, customer_name, COALESCE(total_amount, total)::float AS total
       FROM orders WHERE store_id = $1 AND (order_number ILIKE $2 OR order_number ILIKE $3)
      ORDER BY created_at DESC LIMIT 1`,
    [ctx.store.id, r, `%${r.replace(/[%_\\]/g, "")}`],
  );
}

async function findProducts(ctx: AssistantContext, q: string, limit = 6) {
  const term = s(q, 80).replace(/[%_\\]/g, "");
  return query<{ id: string; name: string; price: number; compare_price: number | null; stock_quantity: number; is_active: boolean; has_sizes: boolean; is_featured: boolean; image: string | null }>(
    `SELECT id, name, price::float, compare_price::float, stock_quantity, is_active, COALESCE(has_sizes, false) AS has_sizes,
            COALESCE(is_featured, false) AS is_featured, COALESCE(image_url, images[1]) AS image
       FROM products WHERE store_id = $1 AND name ILIKE $2
      ORDER BY (lower(name) = lower($3)) DESC, is_active DESC, updated_at DESC NULLS LAST LIMIT $4`,
    [ctx.store.id, `%${term}%`, term, limit],
  );
}

/* ─────────────────────────── Tool definitions (for the model) ─────────────────────────── */

const fn = (name: string, description: string, properties: Record<string, unknown> = {}, required: string[] = []) => ({
  type: "function" as const,
  function: { name, description, parameters: { type: "object", properties, required, additionalProperties: false } },
});

export const TOOL_DEFS = [
  fn("search_help", "Search Duka's help guide (how features work, how to do things, selling advice). Use it before explaining any Duka feature or process.", {
    query: { type: "string", description: "What the person wants to know, in a few words" },
  }, ["query"]),
  fn("store_overview", "The store's current state: plan and what it includes, setup checklist, payment and delivery setup, products, orders needing attention, store link."),
  fn("sales_summary", "Sales, orders, visitors, top products and traffic sources for the last 7, 30 or 90 days.", {
    days: { type: "integer", enum: [7, 30, 90] },
  }, ["days"]),
  fn("list_orders", "List recent orders, optionally only those needing attention.", {
    view: { type: "string", enum: ["recent", "new", "to_confirm", "unpaid", "processing", "shipped", "cancelled"], description: "new = pending orders; to_confirm = bank transfers waiting for the seller to confirm" },
    search: { type: "string", description: "Customer name, phone or order number" },
    limit: { type: "integer", minimum: 1, maximum: 10 },
  }),
  fn("get_order", "Full details of one order by its order number.", { order_number: { type: "string" } }, ["order_number"]),
  fn("find_products", "Find products by name, or list products that are low on stock, sold out or hidden.", {
    query: { type: "string", description: "Part of the product name (optional)" },
    filter: { type: "string", enum: ["all", "low_stock", "out_of_stock", "hidden", "featured"] },
  }),
  fn("list_coupons", "The store's discount codes and how often each was used."),
  fn("top_customers", "The store's best customers by total spent.", { limit: { type: "integer", minimum: 1, maximum: 10 } }),
  fn("get_plans", "Duka's plans with current prices and limits, and the store's own plan."),
  fn("update_order_status", "Propose changing an order's status. The seller must confirm it on screen.", {
    order_number: { type: "string" },
    status: { type: "string", enum: ["confirmed", "processing", "shipped", "delivered", "cancelled"] },
  }, ["order_number", "status"]),
  fn("mark_order_paid", "Propose marking an order as paid (e.g. a bank transfer the seller has seen arrive). The seller must confirm.", {
    order_number: { type: "string" },
  }, ["order_number"]),
  fn("update_product", "Propose changing a product's price, compare-at price, stock, visibility or featured flag. The seller must confirm.", {
    product: { type: "string", description: "The product's name" },
    price: { type: "number", minimum: 0 },
    compare_price: { type: "number", minimum: 0, description: "Old price shown crossed out; 0 removes it" },
    stock: { type: "integer", minimum: 0 },
    visible: { type: "boolean", description: "false hides it from the store" },
    featured: { type: "boolean" },
  }, ["product"]),
  fn("create_coupon", "Propose creating a discount code. The seller must confirm.", {
    code: { type: "string", description: "Letters/numbers, e.g. WELCOME10" },
    discount_type: { type: "string", enum: ["percentage", "fixed"] },
    discount_value: { type: "number", minimum: 1 },
    min_order_amount: { type: "number", minimum: 0 },
    max_uses: { type: "integer", minimum: 1 },
    expires_in_days: { type: "integer", minimum: 1, maximum: 365 },
  }, ["code", "discount_type", "discount_value"]),
  fn("create_category", "Propose creating a product category. The seller must confirm.", {
    name: { type: "string" },
    parent: { type: "string", description: "Existing category to put it under (optional)" },
  }, ["name"]),
  fn("contact_support", "Propose sending a message to Duka's human support team (for problems you can't solve, billing disputes, bugs, account issues). The seller must confirm.", {
    subject: { type: "string" },
    message: { type: "string", description: "A clear summary of the problem and what was already tried" },
  }, ["subject", "message"]),
];

/* ─────────────────────────── Tool implementations ─────────────────────────── */

type Args = Record<string, any>;

export async function runTool(name: string, args: Args, ctx: AssistantContext): Promise<ToolResult> {
  const st = ctx.store;
  switch (name) {
    case "search_help": {
      const found = searchHelp(s(args.query, 200), 2);
      return {
        content: found.length ? found.map((a) => ({ title: a.title, url: a.url ?? null, text: a.body })) : { result: "Nothing in the help guide matches. Answer from what you know about Duka only if certain, otherwise offer to contact support.", topics: HELP.map((a) => a.title) },
        card: found.length ? { kind: "articles", articles: found.map((a) => ({ title: a.title, href: a.url })) } : undefined,
      };
    }

    case "store_overview": {
      const [counts, attention, low, wa] = await Promise.all([
        queryOne<{ products: number; active: number; out: number }>(
          `SELECT COUNT(*)::int AS products, COUNT(*) FILTER (WHERE is_active)::int AS active,
                  COUNT(*) FILTER (WHERE is_active AND COALESCE(is_bookable,false) = false AND stock_quantity <= 0)::int AS out
             FROM products WHERE store_id = $1`, [st.id]),
        can(ctx, "orders")
          ? queryOne<{ new: number; to_confirm: number; today: number; visitors7: number }>(
              `SELECT COUNT(*) FILTER (WHERE order_status = 'pending')::int AS new,
                      COUNT(*) FILTER (WHERE payment_status = 'pending_confirmation')::int AS to_confirm,
                      COUNT(*) FILTER (WHERE created_at >= date_trunc('day', NOW() AT TIME ZONE 'Africa/Lagos') AT TIME ZONE 'Africa/Lagos')::int AS today,
                      0 AS visitors7
                 FROM orders WHERE store_id = $1`, [st.id])
          : null,
        lowStockItems(st.id, Number(st.lowStockThreshold ?? st.low_stock_threshold ?? 3)).catch(() => []),
        queryOne<{ status: string }>(`SELECT status FROM social_connections WHERE store_id = $1 AND channel = 'whatsapp'`, [st.id]).catch(() => null),
      ]);
      const zones = (() => {
        const raw = st.deliveryZones ?? st.delivery_zones;
        try { const z = typeof raw === "string" ? JSON.parse(raw) : raw; return Array.isArray(z) ? z.length : 0; } catch { return 0; }
      })();
      const dukaPay = (st.dukaPayStatus ?? st.duka_pay_status) === "active";
      const bank = !!(st.bankAccountNumber ?? st.bank_account_number) && (st.bankTransferEnabled ?? st.bank_transfer_enabled) !== false;
      const checklist = [
        { label: "Add your first product", done: (counts?.products ?? 0) > 0, href: "/dashboard/products/new" },
        { label: "Turn on Duka Pay or add bank details", done: dukaPay || bank, href: "/dashboard/settings" },
        { label: "Set delivery areas or pickup", done: zones > 0 || !!(st.pickupEnabled ?? st.pickup_enabled), href: "/dashboard/settings" },
        { label: "Upload a store logo", done: !!(st.logoUrl ?? st.logo_url), href: "/dashboard/settings" },
        { label: "Pick a theme", done: !!(st.storefrontThemeId ?? st.storefront_theme_id), href: "/dashboard/themes" },
      ];
      const url = getStoreUrl(st.slug, st.customDomain ?? st.custom_domain);
      return {
        content: {
          store: { name: st.name, url, role: ctx.role },
          plan: { name: ctx.plan.name, paid: ctx.plan.isPro, maxProducts: ctx.plan.max_products, includes: [...ctx.features].map((f) => FEATURES[f].label) },
          checklist: checklist.map((c) => `${c.done ? "DONE" : "TODO"}: ${c.label}`),
          payments: { dukaPay, dukaPayFeePercent: platformFeePercent(), bankTransfer: bank, payOnDelivery: !!(st.podEnabled ?? st.pod_enabled), podDepositPercent: st.podDepositPercent ?? st.pod_deposit_percent ?? null },
          delivery: { zones, pickup: !!(st.pickupEnabled ?? st.pickup_enabled), freeDeliveryOver: st.freeDeliveryThreshold ?? st.free_delivery_threshold ?? null },
          products: counts,
          lowStock: low.length,
          orders: attention ?? "not visible to your role",
          whatsappShop: wa ? wa.status : "not connected",
          customDomain: st.customDomain ?? st.custom_domain ?? null,
        },
        card: checklist.some((c) => !c.done) ? { kind: "checklist", title: "Store setup", items: checklist } : undefined,
      };
    }

    case "sales_summary": {
      if (!can(ctx, "analytics")) return noAccess("sales figures");
      if (!ctx.features.has("analytics")) return locked("analytics");
      const days = (RANGES as readonly number[]).includes(Number(args.days)) ? (Number(args.days) as RangeDays) : 7;
      const a = await getAnalytics(st.id, days);
      const delta = (c: number, p: number) => (p > 0 ? `${c >= p ? "+" : ""}${Math.round(((c - p) / p) * 100)}% vs previous ${days} days` : undefined);
      const conv = a.funnel.visitors > 0 ? `${((a.funnel.orders / a.funnel.visitors) * 100).toFixed(1)}%` : "n/a";
      return {
        content: {
          days, revenue: a.kpis.revenue, revenuePrev: a.kpis.revenuePrev, orders: a.kpis.orders, ordersPrev: a.kpis.ordersPrev,
          visitors: a.kpis.visitors, visitorsPrev: a.kpis.visitorsPrev, paidRevenue: a.kpis.paidRevenue, conversion: conv,
          topProducts: a.topProducts.slice(0, 5), sources: a.sources.slice(0, 4), searchesWithNoResults: a.zeroSearches.slice(0, 5),
          customers: a.customers,
        },
        card: {
          kind: "stats", title: `Last ${days} days`, href: "/dashboard/analytics",
          items: [
            { label: "Sales", value: naira(a.kpis.revenue), note: delta(a.kpis.revenue, a.kpis.revenuePrev) },
            { label: "Orders", value: String(a.kpis.orders), note: delta(a.kpis.orders, a.kpis.ordersPrev) },
            { label: "Visitors", value: String(a.kpis.visitors), note: delta(a.kpis.visitors, a.kpis.visitorsPrev) },
            { label: "Conversion", value: conv, note: "visitors who ordered" },
          ],
        },
      };
    }

    case "list_orders": {
      if (!can(ctx, "orders")) return noAccess("orders");
      const view = s(args.view || "recent", 20);
      const limit = Math.min(10, Math.max(1, Number(args.limit) || 6));
      const where = ["store_id = $1"];
      const params: unknown[] = [st.id];
      if (view === "new") where.push("order_status = 'pending'");
      else if (view === "to_confirm") where.push("payment_status = 'pending_confirmation'");
      else if (view === "unpaid") where.push("payment_status IN ('pending','pending_confirmation') AND order_status <> 'cancelled'");
      else if (["processing", "shipped", "cancelled"].includes(view)) { params.push(view); where.push(`order_status = $${params.length}`); }
      if (args.search) {
        params.push(`%${s(args.search, 60).replace(/[%_\\]/g, "")}%`);
        where.push(`(customer_name ILIKE $${params.length} OR customer_phone ILIKE $${params.length} OR order_number ILIKE $${params.length})`);
      }
      params.push(limit);
      const rows = await query<{ order_number: string; customer_name: string; total: number; order_status: string; payment_status: string; created_at: string }>(
        `SELECT order_number, customer_name, COALESCE(total_amount, total)::float AS total, order_status, payment_status, created_at
           FROM orders WHERE ${where.join(" AND ")} ORDER BY created_at DESC LIMIT $${params.length}`, params);
      const orders = rows.map((o) => ({ number: o.order_number, customer: o.customer_name, total: o.total, status: o.order_status, payment: o.payment_status, date: dateNg(o.created_at) }));
      return {
        content: orders.length ? orders : { result: "No orders match." },
        card: orders.length ? { kind: "orders", title: view === "to_confirm" ? "Transfers to confirm" : view === "new" ? "New orders" : "Orders", orders, href: view === "to_confirm" ? "/dashboard/orders?view=payment" : "/dashboard/orders" } : undefined,
      };
    }

    case "get_order": {
      if (!can(ctx, "orders")) return noAccess("orders");
      const o = await findOrder(ctx, args.order_number);
      if (!o) return { content: { error: `No order "${s(args.order_number, 40)}" in this store.` } };
      const [full, items] = await Promise.all([
        queryOne<Record<string, unknown>>(
          `SELECT customer_phone, customer_email, delivery_method, delivery_zone, delivery_address, delivery_city, delivery_state, delivery_note,
                  delivery_fee::float, discount_amount::float, coupon_code, created_at FROM orders WHERE id = $1`, [o.id]),
        query<{ product_name: string; quantity: number; price: number; size: string | null }>(
          `SELECT product_name, quantity, price::float, size FROM order_items WHERE order_id = $1 ORDER BY id`, [o.id]),
      ]);
      return {
        content: { ...o, id: undefined, ...full, items, dashboardUrl: "/dashboard/orders" },
        card: { kind: "orders", title: `Order ${o.order_number}`, href: "/dashboard/orders", orders: [{ number: o.order_number, customer: o.customer_name, total: o.total, status: o.order_status, payment: o.payment_status, date: full?.created_at ? dateNg(String(full.created_at)) : "" }] },
      };
    }

    case "find_products": {
      if (!can(ctx, "products") && !can(ctx, "inventory")) return noAccess("products");
      const filter = s(args.filter || "all", 20);
      let rows: { id: string; name: string; price: number; stock_quantity: number | null; is_active: boolean; image: string | null }[];
      if (filter === "low_stock") {
        const low = await lowStockItems(st.id, Number(st.lowStockThreshold ?? st.low_stock_threshold ?? 3));
        rows = low.slice(0, 10).map((l) => ({ id: l.product_id, name: l.variant_label ? `${l.name} (${l.variant_label})` : l.name, price: 0, stock_quantity: l.stock, is_active: true, image: l.image_url }));
      } else {
        const cond = filter === "out_of_stock" ? "AND is_active AND COALESCE(is_bookable,false) = false AND stock_quantity <= 0"
          : filter === "hidden" ? "AND is_active = false" : filter === "featured" ? "AND is_featured = true" : "";
        const term = `%${s(args.query, 80).replace(/[%_\\]/g, "")}%`;
        rows = await query(
          `SELECT id, name, price::float, stock_quantity, is_active, COALESCE(image_url, images[1]) AS image
             FROM products WHERE store_id = $1 AND name ILIKE $2 ${cond} ORDER BY updated_at DESC NULLS LAST LIMIT 10`, [st.id, term]);
      }
      const products = rows.map((p) => ({ name: p.name, price: p.price, stock: p.stock_quantity, active: p.is_active, image: p.image, href: `/dashboard/products/${p.id}` }));
      return {
        content: products.length ? products.map(({ image, ...p }) => p) : { result: "No products match." },
        card: products.length ? { kind: "products", title: filter === "low_stock" ? "Running low" : filter === "out_of_stock" ? "Sold out" : filter === "hidden" ? "Hidden products" : "Products", products } : undefined,
      };
    }

    case "list_coupons": {
      if (ctx.role !== "owner") return noAccess("coupons");
      if (!ctx.features.has("coupons")) return locked("coupons");
      const rows = await query(
        `SELECT code, discount_type, discount_value::float, min_order_amount::float, max_uses, uses_count, expires_at, is_active
           FROM coupons WHERE store_id = $1 ORDER BY created_at DESC LIMIT 20`, [st.id]);
      return { content: rows.length ? rows : { result: "No coupons yet." } };
    }

    case "top_customers": {
      if (!can(ctx, "customers")) return noAccess("customers");
      if (!ctx.features.has("customers")) return locked("customers");
      const limit = Math.min(10, Math.max(1, Number(args.limit) || 5));
      const all = await listCustomers(st.id, 500);
      return { content: all.sort((a, b) => b.total_spent - a.total_spent).slice(0, limit).map((c) => ({ name: c.name, orders: c.orders, totalSpent: c.total_spent, lastOrder: dateNg(c.last_order_at), city: c.last_city })) };
    }

    case "get_plans": {
      const plans = await query<{ name: string; description: string | null; price_monthly: number; max_products: number; max_reels: number }>(
        `SELECT name, description, price_monthly, max_products, max_reels FROM plans WHERE is_active = true ORDER BY price_monthly, sort_order`);
      const settings = await import("@/lib/admin-auth").then((m) => m.getPlatformSettings()).catch(() => null);
      return {
        content: {
          yourPlan: { name: ctx.plan.name, paid: ctx.plan.isPro, expiredAndOnFree: ctx.plan.isFallback && !ctx.plan.isPro && !!(st.currentPlanId ?? st.current_plan_id) },
          plans: plans.map((p) => ({ ...p, price: p.price_monthly ? `${naira(p.price_monthly)}/month` : "Free" })),
          yearlyDiscountPercent: settings?.yearly_discount_percent ?? null,
          paidFeatures: Object.values(FEATURES).map((f) => f.label),
          billingUrl: "/dashboard/billing",
        },
      };
    }

    /* ───────────── Actions: proposals only ───────────── */

    case "update_order_status": {
      if (!can(ctx, "orders")) return noAccess("orders");
      const o = await findOrder(ctx, args.order_number);
      if (!o) return { content: { error: `No order "${s(args.order_number, 40)}" in this store.` } };
      const status = s(args.status, 20);
      if (!["confirmed", "processing", "shipped", "delivered", "cancelled"].includes(status)) return { content: { error: "Unknown status." } };
      if (o.order_status === status) return { content: { result: `Order ${o.order_number} is already ${status}.` } };
      if (o.order_status === "cancelled") return { content: { error: `Order ${o.order_number} is cancelled and can't be changed here. Open it in Orders.` } };
      return {
        content: { proposed: true, note: "A confirmation card is now on screen. Nothing changes until the seller taps Confirm." },
        action: {
          id: id(), title: `Mark order ${o.order_number} as ${status}`,
          details: [["Customer", o.customer_name], ["Total", naira(o.total)], ["Status", `${o.order_status} → ${status}`]],
          warning: status === "cancelled" ? "Cancelling puts the items back in stock. If the customer already paid, refund them separately." : status === "shipped" || status === "delivered" ? "On paid plans the customer gets an update by SMS/email." : undefined,
          confirmLabel: status === "cancelled" ? "Cancel order" : "Update order",
          request: { method: "PATCH", url: `/api/merchant/orders/${o.id}`, body: { orderStatus: status } },
          doneText: `Order ${o.order_number} is now ${status}.`,
        },
      };
    }

    case "mark_order_paid": {
      if (!can(ctx, "orders")) return noAccess("orders");
      const o = await findOrder(ctx, args.order_number);
      if (!o) return { content: { error: `No order "${s(args.order_number, 40)}" in this store.` } };
      if (o.payment_status === "paid") return { content: { result: `Order ${o.order_number} is already paid.` } };
      if (!["pending", "pending_confirmation", "deposit_paid"].includes(o.payment_status)) return { content: { error: `Order ${o.order_number} payment is "${o.payment_status}" and can't be marked paid here.` } };
      return {
        content: { proposed: true, note: "Confirmation card shown. Remind the seller to check their bank app first." },
        action: {
          id: id(), title: `Mark order ${o.order_number} as paid`,
          details: [["Customer", o.customer_name], ["Amount", naira(o.total)], ["Method", o.payment_method.replace(/_/g, " ")]],
          warning: "Only confirm after you've seen this exact amount arrive in your bank app. Transfer screenshots can be faked.",
          confirmLabel: "Yes, I received it",
          request: { method: "PATCH", url: `/api/merchant/orders/${o.id}`, body: { paymentStatus: "paid" } },
          doneText: `Order ${o.order_number} is marked paid.`,
        },
      };
    }

    case "update_product": {
      if (!can(ctx, "products")) return noAccess("products");
      const matches = await findProducts(ctx, args.product);
      if (!matches.length) return { content: { error: `No product called "${s(args.product, 60)}".` } };
      const exact = matches.filter((m) => m.name.trim().toLowerCase() === s(args.product, 120).toLowerCase());
      if (matches.length > 1 && exact.length !== 1) return { content: { clarify: "Several products match. Ask which one.", options: matches.map((m) => m.name) } };
      const p = { ...(exact[0] ?? matches[0]) };
      p.name = p.name.trim();
      const body: Record<string, unknown> = {};
      const details: [string, string][] = [["Product", p.name]];
      if (args.price != null) {
        const v = Math.round(Number(args.price));
        if (!(v > 0)) return { content: { error: "Price must be more than ₦0." } };
        body.price = v; details.push(["Price", `${naira(p.price)} → ${naira(v)}`]);
      }
      if (args.compare_price != null) {
        const v = Math.round(Number(args.compare_price));
        const price = Number(body.price ?? p.price);
        if (v > 0 && v <= price) return { content: { error: "The compare-at price must be higher than the selling price (it's the old price shown crossed out)." } };
        body.comparePrice = v > 0 ? v : null; details.push(["Compare-at price", v > 0 ? naira(v) : "removed"]);
      }
      if (args.stock != null) {
        if (p.has_sizes) return { content: { error: `${p.name} has options (sizes/colours) with their own stock. Change stock per option on the product page.`, url: `/dashboard/products/${p.id}` } };
        const v = Math.max(0, Math.round(Number(args.stock)));
        body.stockQuantity = v; details.push(["Stock", `${p.stock_quantity} → ${v}`]);
      }
      if (typeof args.visible === "boolean") { body.isActive = args.visible; details.push(["In store", args.visible ? "shown" : "hidden"]); }
      if (typeof args.featured === "boolean") { body.isFeatured = args.featured; details.push(["Featured", args.featured ? "yes" : "no"]); }
      if (Object.keys(body).length === 0) return { content: { error: "Say what to change: price, compare-at price, stock, visibility or featured." } };
      return {
        content: { proposed: true, note: "Confirmation card shown." },
        action: { id: id(), title: `Update ${p.name}`, details, confirmLabel: "Save changes", request: { method: "PATCH", url: `/api/products/${p.id}`, body }, doneText: `${p.name} updated.` },
      };
    }

    case "create_coupon": {
      if (ctx.role !== "owner") return noAccess("coupons");
      if (!ctx.features.has("coupons")) return locked("coupons");
      const code = s(args.code, 30).toUpperCase().replace(/\s+/g, "");
      if (!/^[A-Z0-9_-]{2,30}$/.test(code)) return { content: { error: "Codes use letters, numbers, - and _ only (2–30 characters)." } };
      const type = args.discount_type === "fixed" ? "fixed" : "percentage";
      const value = Number(args.discount_value);
      if (!(value > 0) || (type === "percentage" && value > 90)) return { content: { error: "Percentage discounts must be between 1 and 90." } };
      const exists = await queryOne(`SELECT 1 FROM coupons WHERE store_id = $1 AND upper(code) = $2`, [st.id, code]);
      if (exists) return { content: { error: `A coupon called ${code} already exists.` } };
      const body: Record<string, unknown> = { code, discount_type: type, discount_value: value, min_order_amount: Math.max(0, Number(args.min_order_amount) || 0) };
      if (args.max_uses) body.max_uses = Math.max(1, Math.round(Number(args.max_uses)));
      const days = Number(args.expires_in_days);
      if (days > 0) body.expires_at = new Date(Date.now() + Math.min(365, days) * 86_400_000).toISOString();
      return {
        content: { proposed: true, note: "Confirmation card shown." },
        action: {
          id: id(), title: `Create coupon ${code}`,
          details: [
            ["Discount", type === "percentage" ? `${value}% off` : `${naira(value)} off`],
            ["Minimum order", body.min_order_amount ? naira(Number(body.min_order_amount)) : "none"],
            ["Uses", body.max_uses ? `up to ${body.max_uses}` : "unlimited"],
            ["Expires", body.expires_at ? dateNg(String(body.expires_at)) : "never"],
          ],
          confirmLabel: "Create coupon",
          request: { method: "POST", url: "/api/stores/coupons", body },
          doneText: `Coupon ${code} is live. Share it with your customers.`,
        },
      };
    }

    case "create_category": {
      if (!can(ctx, "products")) return noAccess("categories");
      const name = s(args.name, 100);
      if (!name) return { content: { error: "Give the category a name." } };
      const dup = await queryOne(`SELECT 1 FROM categories WHERE store_id = $1 AND lower(name) = lower($2)`, [st.id, name]);
      if (dup) return { content: { error: `"${name}" already exists.` } };
      let parentId: string | null = null;
      if (args.parent) {
        const parent = await queryOne<{ id: string; name: string }>(`SELECT id, name FROM categories WHERE store_id = $1 AND parent_id IS NULL AND name ILIKE $2 LIMIT 1`, [st.id, s(args.parent, 100)]);
        if (!parent) return { content: { error: `No main category called "${s(args.parent, 60)}".` } };
        parentId = parent.id;
      }
      return {
        content: { proposed: true, note: "Confirmation card shown." },
        action: { id: id(), title: `Create category "${name}"`, details: [["Name", name], ["Inside", args.parent ? s(args.parent, 60) : "top level"]], confirmLabel: "Create category", request: { method: "POST", url: "/api/categories", body: { name, parentId } }, doneText: `Category "${name}" created.` },
      };
    }

    case "contact_support": {
      const subject = s(args.subject, 120) || "Help needed";
      const message = s(args.message, 2000);
      if (!message) return { content: { error: "Describe the problem first." } };
      return {
        content: { proposed: true, note: "Confirmation card shown. The team replies by email." },
        action: { id: id(), title: "Send to Duka support", details: [["Subject", subject], ["Message", message.length > 220 ? message.slice(0, 220) + "…" : message]], confirmLabel: "Send to support", request: { method: "POST", url: "/api/dashboard/assistant/support", body: { subject, message } }, doneText: "Sent. Duka support will reply to your email, usually within one working day." },
      };
    }
  }
  return { content: { error: `Unknown tool ${name}` } };
}
