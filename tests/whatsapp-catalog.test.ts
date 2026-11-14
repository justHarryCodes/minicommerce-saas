import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/db", () => ({ query: vi.fn(), queryOne: vi.fn() }));
vi.mock("@/lib/plan", () => ({ getEffectivePlan: vi.fn(async () => ({ max_products: 100 })), hasFeature: vi.fn(async () => true) }));
vi.mock("@/lib/store-cache", () => ({ invalidateStore: vi.fn(async () => {}) }));
vi.mock("@/lib/categories", () => ({ ensureUncategorized: vi.fn(async () => "cat-uncat") }));
vi.mock("@/lib/cloudinary-server", () => ({ default: { uploader: { upload: vi.fn(async () => ({ secure_url: "https://res.cloudinary.com/c/image/upload/v1/duka/imported.jpg" })) } } }));

import { query, queryOne } from "@/lib/db";
import { fingerprint, localPrint, metaItemData, parseMoney, remotePrint, resolveRetailerIds, syncStoreCatalog, type CatalogItem, type RemoteItem } from "@/lib/meta/catalog";
import { handleMessage } from "@/lib/meta/bot";
import { waPayload } from "@/lib/meta/whatsapp";

// WhatsApp catalog <-> Duka products, both ways.

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const KEYS = { META_APP_SECRET: "s", META_WEBHOOK_VERIFY_TOKEN: "v", WHATSAPP_TEST_PHONE_NUMBER_ID: "555", WHATSAPP_TEST_ACCESS_TOKEN: "tok" };

beforeEach(() => {
  Object.assign(process.env, KEYS, { NEXT_PUBLIC_ROOT_DOMAIN: "dukanigeria.com" });
  vi.mocked(query).mockReset().mockResolvedValue([] as never);
  vi.mocked(queryOne).mockReset().mockResolvedValue(null as never);
});
afterEach(() => vi.unstubAllGlobals());

const item = (o: Partial<CatalogItem> = {}): CatalogItem => ({
  retailer_id: U(1), product_id: U(1), variant_id: null, title: "Ankara Gown", description: "Lovely", price: 20000, compare: 25000,
  inventory: 3, image: "https://img/a.jpg", images: ["https://img/a.jpg", "https://img/b.jpg"], link: "https://amaka.dukanigeria.com/products/gown", group: null, ...o,
});

describe("formats", () => {
  it("reads Meta's money strings", () => {
    expect(parseMoney("₦15,000.00")).toBe(15000);
    expect(parseMoney("NGN15,000")).toBe(15000);
    expect(parseMoney("15000.00 NGN")).toBe(15000);
    expect(parseMoney(null)).toBeNull();
  });

  it("a sale goes to Meta as price = regular, sale_price = what you pay; and reads back the same", () => {
    const d = metaItemData(item(), "Amaka");
    expect(d).toMatchObject({ id: U(1), price: "25000.00 NGN", sale_price: "20000.00 NGN", availability: "in stock", condition: "new", inventory: 3, brand: "Amaka", image_link: "https://img/a.jpg", additional_image_link: ["https://img/b.jpg"] });
    // What Meta returns for that item must fingerprint the same as what we sent
    const back: RemoteItem = { id: "m1", retailer_id: U(1), name: "Ankara Gown", description: null, price: 25000, sale_price: 20000, availability: "in stock", inventory: 3, image_url: null };
    expect(remotePrint(back)).toBe(localPrint(item()));
    expect(metaItemData(item({ inventory: 0, compare: null }), "A")).toMatchObject({ availability: "out of stock", price: "20000.00 NGN" });
    expect(metaItemData(item({ compare: null }), "A")).not.toHaveProperty("sale_price");
  });

  it("variants share an item group", () => {
    expect(metaItemData(item({ retailer_id: `${U(1)}:${U(2)}`, variant_id: U(2), group: U(1), size: "M", color: "Red" }), "A")).toMatchObject({ item_group_id: U(1), size: "M", color: "Red" });
  });

  it("fingerprints ignore case and spacing in names", () => {
    expect(fingerprint({ title: " Gown ", price: 100, compare: null, inventory: 1 })).toBe(fingerprint({ title: "gown", price: 100, compare: null, inventory: 1 }));
  });
});

/* ───────────────────────────── The sync ───────────────────────────── */

type Product = { id: string; name: string; price: string; compare_price: string | null; stock_quantity: number; image_url: string; has_sizes: boolean };

function setup(opts: { products: Product[]; mapped: Record<string, unknown>[]; remote: Record<string, unknown>[] }) {
  const graphCalls: { url: string; body: any }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: unknown, init?: RequestInit) => {
      const u = String(url);
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      graphCalls.push({ url: u, body });
      if (u.includes("/CAT1/products")) return new Response(JSON.stringify({ data: opts.remote }));
      return new Response(JSON.stringify({ success: true }));
    }),
  );
  vi.mocked(queryOne).mockImplementation(async (sql: unknown) => {
    const s = String(sql);
    if (s.includes("FROM social_connections")) return { id: "k1", store_id: "s1", status: "active", external_id: "555", account_id: "WABA1", token_source: "env_test", catalog_id: "CAT1" } as never;
    if (s.includes("FROM stores")) return { id: "s1", name: "Amaka", slug: "amaka", custom_domain: null, owner_id: "u1" } as never;
    if (s.includes("INSERT INTO products")) return { id: U(99) } as never;
    return null as never;
  });
  vi.mocked(query).mockImplementation(async (sql: unknown) => {
    const s = String(sql);
    if (s.includes("FROM products WHERE store_id = $1 AND is_active = true AND COALESCE(is_bookable")) return opts.products.map((p) => ({ slug: null, short_description: null, description: "d", images: [], ...p })) as never;
    if (s.includes("FROM social_catalog_items WHERE store_id = $1")) return opts.mapped as never;
    if (s.includes("COUNT(*)::int AS n FROM products")) return [{ n: opts.products.length }] as never;
    return [] as never;
  });
  const batch = () => graphCalls.filter((c) => c.url.includes("/CAT1/items_batch")).flatMap((c) => c.body.requests);
  const sqls = () => vi.mocked(query).mock.calls.map(([s, p]) => ({ s: String(s), p: p as unknown[] }));
  return { batch, sqls };
}

const P1: Product = { id: U(1), name: "Ankara Gown", price: "20000", compare_price: null, stock_quantity: 3, image_url: "https://res.cloudinary.com/c/image/upload/v1/g.jpg", has_sizes: false };
const lp1 = fingerprint({ title: "Ankara Gown", price: 20000, compare: null, inventory: 3 });

describe("syncing", () => {
  it("new Duka products are sent to the catalog", async () => {
    const { batch } = setup({ products: [P1], mapped: [], remote: [] });
    const r = await syncStoreCatalog("s1");
    expect(r).toMatchObject({ ok: true, pushed: 1 });
    expect(batch()).toEqual([expect.objectContaining({ method: "UPDATE", data: expect.objectContaining({ id: U(1), title: "Ankara Gown", price: "20000.00 NGN", link: `https://amaka.dukanigeria.com/products/${U(1)}` }) })]);
  });

  it("a price changed in Duka is pushed; one changed only in WhatsApp is pulled into Duka", async () => {
    // Duka changed (price now 20000, last synced at 18000)
    const old = fingerprint({ title: "Ankara Gown", price: 18000, compare: null, inventory: 3 });
    let t = setup({ products: [P1], mapped: [{ retailer_id: U(1), product_id: U(1), variant_id: null, meta_item_id: "m1", local_hash: old, remote_hash: old, synced_at: new Date().toISOString() }], remote: [{ id: "m1", retailer_id: U(1), name: "Ankara Gown", price: "₦18,000.00", inventory: 3 }] });
    expect(await syncStoreCatalog("s1")).toMatchObject({ pushed: 1, pulled: 0 });
    expect(t.batch()[0].data.price).toBe("20000.00 NGN");

    // Only WhatsApp changed: price 22000 and name edited there
    t = setup({ products: [P1], mapped: [{ retailer_id: U(1), product_id: U(1), variant_id: null, meta_item_id: "m1", local_hash: lp1, remote_hash: lp1, synced_at: new Date().toISOString() }], remote: [{ id: "m1", retailer_id: U(1), name: "Ankara Gown (New)", price: "₦22,000.00", inventory: 5 }] });
    expect(await syncStoreCatalog("s1")).toMatchObject({ pushed: 0, pulled: 1 });
    const upd = t.sqls().find((q) => q.s.includes("UPDATE products SET name = $2"))!;
    expect(upd.p).toEqual([U(1), "Ankara Gown (New)", 22000, null, 5]);
    expect(t.batch()).toEqual([]);
  });

  it("if both changed, Duka wins", async () => {
    const old = fingerprint({ title: "Ankara Gown", price: 18000, compare: null, inventory: 3 });
    const t = setup({ products: [P1], mapped: [{ retailer_id: U(1), product_id: U(1), variant_id: null, meta_item_id: "m1", local_hash: old, remote_hash: old, synced_at: new Date().toISOString() }], remote: [{ id: "m1", retailer_id: U(1), name: "Other", price: "₦30,000.00", inventory: 1 }] });
    expect(await syncStoreCatalog("s1")).toMatchObject({ pushed: 1, pulled: 0 });
    expect(t.sqls().some((q) => q.s.includes("UPDATE products SET name"))).toBe(false);
  });

  it("a product added in WhatsApp becomes a Duka product, photo copied to Cloudinary, keeping its own item ID", async () => {
    const t = setup({ products: [], mapped: [], remote: [{ id: "m9", retailer_id: "SKU-RED-1", name: "Red Bag", description: "Leather", price: "₦15,000.00", inventory: 4, availability: "in stock", image_url: "https://scontent.fbcdn.net/x.jpg" }] });
    expect(await syncStoreCatalog("s1")).toMatchObject({ ok: true, imported: 1 });
    const ins = vi.mocked(queryOne).mock.calls.find(([s]) => String(s).includes("INSERT INTO products"))!;
    expect(ins[1]).toEqual(["s1", "cat-uncat", "Red Bag", "red-bag", "Leather", 15000, null, 4, "https://res.cloudinary.com/c/image/upload/v1/duka/imported.jpg", ["https://res.cloudinary.com/c/image/upload/v1/duka/imported.jpg"]]);
    const map = t.sqls().find((q) => q.s.includes("INSERT INTO social_catalog_items"))!;
    expect(map.p.slice(0, 3)).toEqual(["s1", "SKU-RED-1", U(99)]);
  });

  it("imports stop at the plan's product limit", async () => {
    const { getEffectivePlan } = await import("@/lib/plan");
    vi.mocked(getEffectivePlan).mockResolvedValueOnce({ max_products: 1 } as never);
    setup({ products: [P1], mapped: [{ retailer_id: U(1), product_id: U(1), variant_id: null, meta_item_id: "m1", local_hash: lp1, remote_hash: lp1, synced_at: new Date().toISOString() }], remote: [{ id: "m1", retailer_id: U(1), name: "Ankara Gown", price: "₦20,000.00", inventory: 3 }, { id: "m9", retailer_id: "SKU-1", name: "Bag", price: "₦1,000.00" }] });
    expect(await syncStoreCatalog("s1")).toMatchObject({ imported: 0, skipped: 1 });
  });

  it("deleted in WhatsApp -> hidden in Duka; deleted in Duka -> removed from WhatsApp", async () => {
    let t = setup({ products: [P1], mapped: [{ retailer_id: U(1), product_id: U(1), variant_id: null, meta_item_id: "m1", local_hash: lp1, remote_hash: lp1, synced_at: new Date().toISOString() }], remote: [] });
    expect(await syncStoreCatalog("s1")).toMatchObject({ hidden: 1, pushed: 0 });
    expect(t.sqls().find((q) => q.s.includes("SET is_active = false"))!.p).toEqual([U(1), "s1"]);

    t = setup({ products: [], mapped: [{ retailer_id: U(1), product_id: null, variant_id: null, meta_item_id: "m1", local_hash: lp1, remote_hash: lp1, synced_at: new Date().toISOString() }], remote: [{ id: "m1", retailer_id: U(1), name: "Ankara Gown", price: "₦20,000.00", inventory: 3 }] });
    expect(await syncStoreCatalog("s1")).toMatchObject({ removed: 1, imported: 0 });
    expect(t.batch()).toEqual([{ method: "DELETE", data: { id: U(1) } }]);
  });

  it("an item just pushed that Meta hasn't shown yet isn't mistaken for a deletion", async () => {
    const t = setup({ products: [P1], mapped: [{ retailer_id: U(1), product_id: U(1), variant_id: null, meta_item_id: null, local_hash: lp1, remote_hash: lp1, synced_at: new Date().toISOString() }], remote: [] });
    expect(await syncStoreCatalog("s1")).toMatchObject({ hidden: 0, pushed: 0 });
    expect(t.sqls().some((q) => q.s.includes("SET is_active = false"))).toBe(false);
  });

  it("does nothing harmful when WhatsApp isn't connected", async () => {
    vi.mocked(queryOne).mockResolvedValue(null as never);
    expect(await syncStoreCatalog("s1")).toMatchObject({ ok: false, error: "WhatsApp isn't connected" });
  });
});

describe("native WhatsApp shopping", () => {
  it("cart orders with imported item IDs map back to Duka products", async () => {
    vi.mocked(query).mockResolvedValue([{ retailer_id: "SKU-RED-1", product_id: U(99), variant_id: null }] as never);
    const m = await resolveRetailerIds("s1", [U(1), `${U(1)}:${U(2)}`, "SKU-RED-1", "unknown"]);
    expect(m.get(U(1))).toEqual({ p: U(1), v: null });
    expect(m.get(`${U(1)}:${U(2)}`)).toEqual({ p: U(1), v: U(2) });
    expect(m.get("SKU-RED-1")).toEqual({ p: U(99), v: null });
    expect(m.has("unknown")).toBe(false);
  });

  it("product lists, single products and the catalog use WhatsApp's own messages", () => {
    const pl = waPayload("234", { kind: "product_list", catalogId: "CAT1", header: "Amaka", body: "Pick", sections: [{ title: "Products", ids: Array.from({ length: 40 }, (_, i) => `p${i}`) }] }) as any;
    expect(pl.interactive.type).toBe("product_list");
    expect(pl.interactive.action.catalog_id).toBe("CAT1");
    expect(pl.interactive.action.sections[0].product_items).toHaveLength(30);
    expect(waPayload("234", { kind: "product", catalogId: "CAT1", id: "p1" })).toMatchObject({ interactive: { type: "product", action: { catalog_id: "CAT1", product_retailer_id: "p1" } } });
    expect(waPayload("234", { kind: "catalog", body: "Shop" })).toMatchObject({ interactive: { type: "catalog_message", action: { name: "catalog_message" } } });
  });

  it("with a synced catalog, the bot shows the catalog and native product lists", async () => {
    const store = { id: "s1", name: "Amaka", slug: "amaka" };
    const ctx = { store, catalogId: "CAT1", state: {}, conversationId: null, customer: { ref: "234", name: "Ada" } };
    const menu = (await handleMessage(ctx, { kind: "text", text: "hi" })).replies[0] as any;
    expect(menu.sections[0].rows[0].id).toBe("catalog");
    expect((await handleMessage(ctx, { kind: "reply", id: "catalog" })).replies[0].kind).toBe("catalog");

    vi.mocked(query).mockImplementation(async (sql: unknown) => {
      const s = String(sql);
      if (s.includes("LIMIT $2 OFFSET $3")) return [{ id: U(1), name: "Gown", price: "100", has_sizes: false, stock_quantity: 2 }, { id: U(2), name: "Bag", price: "50", has_sizes: false, stock_quantity: 2 }] as never;
      if (s.includes("FROM social_catalog_items")) return [{ product_id: U(1), retailer_id: U(1) }, { product_id: U(2), retailer_id: "SKU-2" }] as never;
      return [] as never;
    });
    const list = await handleMessage(ctx, { kind: "reply", id: "all:1" });
    expect(list.replies[0]).toMatchObject({ kind: "product_list", catalogId: "CAT1", sections: [{ ids: [U(1), "SKU-2"] }] });
    expect(list.state.last).toEqual({ cat: null, page: 1 });
  });
});
