import { describe, it, expect, vi } from "vitest";

vi.mock("@/components/dashboard/OrderStatusManager", () => ({ default: () => null }));
vi.mock("@/components/dashboard/DeleteProductButton", () => ({ default: () => null }));
vi.mock("@/components/dashboard/SoldOutTodayToggle", () => ({ default: () => null }));

import { NAV_GROUPS, NAV_ITEMS, isActiveHref, pageTitle } from "@/components/dashboard/nav-config";
import { pctChange, timeAgo } from "@/components/dashboard/ui";
import { ORDER_VIEWS, matchesOrder } from "@/app/dashboard/orders/OrdersBoard";
import { PRODUCT_FILTERS, type ProductRow } from "@/app/dashboard/products/ProductsTable";
import { allowedPath } from "@/lib/access-shared";

// Dashboard redesign: navigation map, page titles, order and product filters.

describe("navigation", () => {
  it("every dashboard page is listed once", () => {
    const hrefs = NAV_ITEMS.map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const h of ["/dashboard", "/dashboard/orders", "/dashboard/products", "/dashboard/settings", "/dashboard/pos", "/dashboard/themes"]) expect(hrefs).toContain(h);
    // Add-ons come first so vendors see them without scrolling
    expect(NAV_GROUPS.map((g) => g.label)).toEqual(["Add-ons", "Sell", "Catalog", "Customers", "Store", "Account"]);
    expect(hrefs).toContain("/dashboard/whatsapp");
  });

  it("titles the page from the most specific match", () => {
    expect(pageTitle("/dashboard").title).toBe("Overview");
    expect(pageTitle("/dashboard/orders").title).toBe("Orders");
    expect(pageTitle("/dashboard/gift-cards/abc").title).toBe("Gift cards & loyalty");
    expect(pageTitle("/dashboard/products/new")).toMatchObject({ title: "New product", parent: { href: "/dashboard/products" } });
    expect(pageTitle("/dashboard/products/123/edit").title).toBe("Edit product");
  });

  it("Overview is only active on its own page", () => {
    expect(isActiveHref("/dashboard/orders", "/dashboard")).toBe(false);
    expect(isActiveHref("/dashboard/orders/1", "/dashboard/orders")).toBe(true);
    expect(isActiveHref("/dashboard/ordersx", "/dashboard/orders")).toBe(false);
  });

  it("staff see only what their role allows", () => {
    const staff = NAV_ITEMS.filter((i) => allowedPath("staff", i.href)).map((i) => i.href);
    expect(staff).toEqual(expect.arrayContaining(["/dashboard/orders", "/dashboard/pos"]));
    expect(staff).not.toContain("/dashboard/settings");
    expect(staff).not.toContain("/dashboard/billing");
  });
});

describe("KPI helpers", () => {
  it("percent change needs a baseline", () => {
    expect(pctChange(120, 100)).toBe(20);
    expect(pctChange(50, 100)).toBe(-50);
    expect(pctChange(5, 0)).toBeNull();
  });

  it("time ago is short", () => {
    const now = new Date("2026-11-04T12:00:00Z");
    expect(timeAgo("2026-11-04T11:59:30Z", now)).toBe("now");
    expect(timeAgo("2026-11-04T11:15:00Z", now)).toBe("45m");
    expect(timeAgo("2026-11-04T07:00:00Z", now)).toBe("5h");
    expect(timeAgo("2026-11-01T12:00:00Z", now)).toBe("3d");
    expect(timeAgo(null, now)).toBe("");
  });
});

describe("orders board", () => {
  const o = { order_number: "ORD-1A2B", customer_name: "Ada Obi", customer_phone: "0803 123 4567", customer_email: "ada@mail.com" };

  it("searches number, name, email and phone digits", () => {
    expect(matchesOrder(o, "1a2b")).toBe(true);
    expect(matchesOrder(o, "obi")).toBe(true);
    expect(matchesOrder(o, "ADA@")).toBe(true);
    expect(matchesOrder(o, "1234567")).toBe(true);
    expect(matchesOrder(o, "08031234567")).toBe(true);
    expect(matchesOrder(o, "tunde")).toBe(false);
    expect(matchesOrder(o, "  ")).toBe(true);
  });

  it("views sort orders into the right queues", () => {
    const view = (id: string) => ORDER_VIEWS.find((v) => v.id === id)!.test;
    expect(view("new")({ order_status: "pending" } as never)).toBe(true);
    expect(view("payment")({ order_status: "confirmed", payment_status: "pending_confirmation" } as never)).toBe(true);
    expect(view("progress")({ order_status: "shipped" } as never)).toBe(true);
    expect(view("progress")({ order_status: "delivered" } as never)).toBe(false);
    expect(view("done")({ order_status: "delivered" } as never)).toBe(true);
  });
});

describe("products table filters", () => {
  const base: ProductRow = {
    id: "1", name: "Shirt", image_url: null, price: 5000, compare_price: null, stock_quantity: 10, is_active: true, is_bookable: false,
    has_sizes: false, category_id: null, category_name: null, sold_out_today: false, low_at: 5, created_at: "2026-11-01",
  };
  const f = (id: string) => PRODUCT_FILTERS.find((x) => x.id === id)!.test;

  it("out of stock and running low use the product's own threshold, never services", () => {
    expect(f("out")({ ...base, stock_quantity: 0 })).toBe(true);
    expect(f("low")({ ...base, stock_quantity: 5 })).toBe(true);
    expect(f("low")({ ...base, stock_quantity: 6 })).toBe(false);
    expect(f("low")({ ...base, stock_quantity: 0 })).toBe(false);
    expect(f("out")({ ...base, stock_quantity: 0, is_bookable: true })).toBe(false);
  });
});
