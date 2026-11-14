// Two-way sync between a store's Duka products and its Meta catalog (the
// catalog behind its WhatsApp shop, and Facebook / Instagram Shops).
//
//   Duka -> Meta   every active product (one catalog item per variant) with
//                  photo, price, sale price, stock and link; changes and
//                  removals follow.
//   Meta -> Duka   items added in the catalog (WhatsApp Manager / Commerce
//                  Manager) become Duka products (photos copied to Cloudinary,
//                  plan product limit respected); edits to name, price and
//                  stock come back; items deleted there are hidden in Duka.
//
// Who changed what is decided from two hashes per item kept at the last sync:
// what Duka looked like (local_hash) and what Meta looked like (remote_hash).
// If both sides changed, Duka wins.
//
// Retailer IDs: "<productId>" for simple products, "<productId>:<variantId>"
// for variants (the bot reads the same format from WhatsApp cart orders).
// Imported items keep their own retailer ID, mapped to the new product.

import { createHash } from "crypto";
import { query, queryOne } from "@/lib/db";
import { getEffectivePlan } from "@/lib/plan";
import { invalidateStore } from "@/lib/store-cache";
import { clCrawler } from "@/lib/cloudinary";
import { metaText, storeCanonicalBase } from "@/lib/seo";
import { slugify } from "@/lib/utils";
import { ensureSocialTables } from "./db";
import { graph } from "./graph";
import { tokenFor, type WaConnection } from "./whatsapp";

/* ─────────────────────────────── Types ─────────────────────────────── */

export interface CatalogItem {
  retailer_id: string;
  product_id: string;
  variant_id: string | null;
  title: string;
  description: string;
  price: number; // what the shopper pays
  compare: number | null; // the "was" price, when on sale
  inventory: number;
  image: string | null;
  images: string[];
  link: string;
  group: string | null; // product id, for variants
  size?: string | null;
  color?: string | null;
}

export interface RemoteItem {
  id: string;
  retailer_id: string;
  name: string;
  description: string | null;
  price: number | null;
  sale_price: number | null;
  availability: string | null;
  inventory: number | null;
  image_url: string | null;
}

interface MapRow {
  retailer_id: string;
  product_id: string | null;
  variant_id: string | null;
  meta_item_id: string | null;
  local_hash: string | null;
  remote_hash: string | null;
  synced_at: string;
}

export interface SyncResult {
  ok: boolean;
  pushed: number;
  removed: number;
  imported: number;
  pulled: number;
  hidden: number;
  skipped: number;
  error?: string;
}

/* ──────────────────────────── Normalising ──────────────────────────── */

/** "₦15,000.00", "15000.00 NGN", "NGN15,000" -> 15000 */
export function parseMoney(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/[^0-9.]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

const money = (n: number) => `${(Math.round(n * 100) / 100).toFixed(2)} NGN`;

/** The fields both sides can change, in one comparable shape. */
export function fingerprint(x: { title: string; price: number; compare: number | null; inventory: number | null }): string {
  const parts = [x.title.trim().toLowerCase(), Math.round(x.price), x.compare ? Math.round(x.compare) : "", x.inventory ?? ""];
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 16);
}

export const localPrint = (i: CatalogItem) => fingerprint({ title: i.title, price: i.price, compare: i.compare, inventory: i.inventory });

/** Meta shows a sale as price = regular, sale_price = what you pay. */
export function remotePrint(r: RemoteItem): string {
  const pays = r.sale_price ?? r.price ?? 0;
  const was = r.sale_price != null && r.price != null && r.price > r.sale_price ? r.price : null;
  return fingerprint({ title: r.name, price: pays, compare: was, inventory: r.inventory });
}

/* ───────────────────────────── Duka side ───────────────────────────── */

const COLOR_KEYS = ["colour", "color"];

/** Every catalog item this store should have. */
export async function desiredItems(store: { id: string; slug: string; name: string; custom_domain?: string | null }): Promise<CatalogItem[]> {
  const base = storeCanonicalBase(store);
  const products = await query<{
    id: string; name: string; slug: string | null; price: string; compare_price: string | null; short_description: string | null; description: string | null;
    image_url: string | null; images: string[] | null; stock_quantity: number | null; has_sizes: boolean | null;
  }>(
    `SELECT id, name, slug, price, compare_price, short_description, description, image_url, images, stock_quantity, has_sizes
       FROM products WHERE store_id = $1 AND is_active = true AND COALESCE(is_bookable, false) = false
      ORDER BY created_at`,
    [store.id],
  );
  const withSizes = products.filter((p) => p.has_sizes).map((p) => p.id);
  const variants = withSizes.length
    ? await query<{ id: string; product_id: string; label: string; price: string | null; stock_quantity: number | null; image_url: string | null; options: Record<string, string> | null }>(
        `SELECT id, product_id, label, price, stock_quantity, image_url, options FROM product_sizes WHERE product_id = ANY($1::uuid[]) ORDER BY sort_order, created_at`,
        [withSizes],
      )
    : [];

  const items: CatalogItem[] = [];
  for (const p of products) {
    const photos = [...new Set([p.image_url, ...(p.images ?? [])].filter((u): u is string => !!u))].map(clCrawler);
    if (!photos.length) continue; // Meta requires a photo
    const price = Number(p.price);
    const compare = p.compare_price && Number(p.compare_price) > price ? Number(p.compare_price) : null;
    const link = `${base}/products/${p.slug || p.id}`;
    const description = metaText(p.description || p.short_description, 4900) || p.name;
    const vs = variants.filter((v) => v.product_id === p.id);
    if (vs.length) {
      for (const v of vs) {
        const vPrice = v.price != null ? Number(v.price) : price;
        const opts = Object.fromEntries(Object.entries(v.options ?? {}).map(([k, val]) => [k.toLowerCase(), val]));
        items.push({
          retailer_id: `${p.id}:${v.id}`,
          product_id: p.id,
          variant_id: v.id,
          title: `${p.name} - ${v.label}`,
          description,
          price: vPrice,
          compare: compare && compare > vPrice ? compare : null,
          inventory: Math.max(0, Number(v.stock_quantity ?? 0)),
          image: v.image_url ? clCrawler(v.image_url) : photos[0],
          images: photos.slice(0, 10),
          link: `${link}?variant=${v.id}`,
          group: p.id,
          size: opts.size ?? (Object.keys(opts).length ? null : v.label),
          color: COLOR_KEYS.map((k) => opts[k]).find(Boolean) ?? null,
        });
      }
    } else {
      items.push({
        retailer_id: p.id,
        product_id: p.id,
        variant_id: null,
        title: p.name,
        description,
        price,
        compare,
        inventory: Math.max(0, Number(p.stock_quantity ?? 0)),
        image: photos[0],
        images: photos.slice(0, 10),
        link,
        group: null,
      });
    }
  }
  return items;
}

/** A catalog item in Meta's items_batch format. */
export function metaItemData(i: CatalogItem, brand: string): Record<string, unknown> {
  return {
    id: i.retailer_id,
    title: i.title.slice(0, 200),
    description: i.description.slice(0, 5000),
    availability: i.inventory > 0 ? "in stock" : "out of stock",
    condition: "new",
    // Meta: price = regular price, sale_price = the lower price you pay
    price: money(i.compare ?? i.price),
    ...(i.compare ? { sale_price: money(i.price) } : {}),
    link: i.link,
    image_link: i.image,
    ...(i.images.length > 1 ? { additional_image_link: i.images.filter((u) => u !== i.image).slice(0, 9) } : {}),
    brand: brand.slice(0, 100),
    inventory: i.inventory,
    ...(i.group ? { item_group_id: i.group } : {}),
    ...(i.size ? { size: i.size } : {}),
    ...(i.color ? { color: i.color } : {}),
  };
}

/* ───────────────────────────── Meta side ───────────────────────────── */

/** The store's catalog: the one already on its WhatsApp account, or a new one. */
export async function ensureCatalog(conn: WaConnection & { business_id?: string | null }, storeName: string): Promise<{ ok: true; catalogId: string } | { ok: false; error: string }> {
  if (conn.catalog_id) return { ok: true, catalogId: conn.catalog_id };
  const token = tokenFor(conn);
  if (!token || !conn.account_id) return { ok: false, error: "WhatsApp account isn't fully connected" };

  let catalogId: string | null = null;
  const linked = await graph<{ data?: { id: string }[] }>(`${conn.account_id}/product_catalogs`, { token });
  if (linked.ok && linked.data.data?.[0]?.id) catalogId = linked.data.data[0].id;

  if (!catalogId) {
    let businessId = conn.business_id ?? null;
    if (!businessId) {
      const waba = await graph<{ owner_business_info?: { id: string } }>(conn.account_id, { token, query: { fields: "owner_business_info" } });
      businessId = waba.ok ? waba.data.owner_business_info?.id ?? null : null;
    }
    if (!businessId) return { ok: false, error: "Couldn't find the business that owns this WhatsApp account" };
    const created = await graph<{ id?: string }>(`${businessId}/owned_product_catalogs`, { token, body: { name: `${storeName} (Duka)`.slice(0, 100) } });
    if (!created.ok || !created.data.id) return { ok: false, error: created.ok ? "Meta didn't create a catalog" : `Couldn't create a catalog: ${created.error}` };
    catalogId = created.data.id;
    const link = await graph(`${conn.account_id}/product_catalogs`, { token, body: { catalog_id: catalogId } });
    if (!link.ok) return { ok: false, error: `Couldn't link the catalog to WhatsApp: ${link.error}` };
    await query(`UPDATE social_connections SET business_id = $2 WHERE id = $1`, [conn.id, businessId]).catch(() => {});
  }

  // Show the shop icon / catalog and turn on WhatsApp's cart for this number
  await graph(`${conn.external_id}/whatsapp_commerce_settings`, { token, method: "POST", query: { is_catalog_visible: "true", is_cart_enabled: "true" } });
  await query(`UPDATE social_connections SET catalog_id = $2, updated_at = NOW() WHERE id = $1`, [conn.id, catalogId]);
  return { ok: true, catalogId };
}

export async function readRemote(catalogId: string, token: string): Promise<RemoteItem[] | null> {
  const out: RemoteItem[] = [];
  let after: string | undefined;
  for (let page = 0; page < 50; page++) {
    const r = await graph<{ data?: Record<string, unknown>[]; paging?: { cursors?: { after?: string }; next?: string } }>(`${catalogId}/products`, {
      token,
      query: { fields: "id,retailer_id,name,description,price,sale_price,availability,inventory,image_url", limit: "200", ...(after ? { after } : {}) },
    });
    if (!r.ok) return page === 0 ? null : out;
    for (const d of r.data.data ?? []) {
      if (!d.retailer_id) continue;
      out.push({
        id: String(d.id),
        retailer_id: String(d.retailer_id),
        name: String(d.name ?? ""),
        description: d.description ? String(d.description) : null,
        price: parseMoney(d.price),
        sale_price: parseMoney(d.sale_price),
        availability: d.availability ? String(d.availability) : null,
        inventory: d.inventory != null ? Number(d.inventory) : null,
        image_url: d.image_url ? String(d.image_url) : null,
      });
    }
    after = r.data.paging?.next ? r.data.paging.cursors?.after : undefined;
    if (!after) break;
  }
  return out;
}

async function pushBatch(catalogId: string, token: string, requests: { method: "CREATE" | "UPDATE" | "DELETE"; data: Record<string, unknown> }[]): Promise<string | null> {
  for (let i = 0; i < requests.length; i += 1000) {
    const r = await graph(`${catalogId}/items_batch`, { token, body: { item_type: "PRODUCT_ITEM", allow_upsert: true, requests: requests.slice(i, i + 1000) } });
    if (!r.ok) return r.error;
  }
  return null;
}

/* ───────────────────────────── Importing ───────────────────────────── */

/** Meta's image URLs expire, so imported photos are copied to Cloudinary. */
async function copyImage(url: string | null, folder: string): Promise<string | null> {
  if (!url) return null;
  try {
    const { default: cloudinary } = await import("@/lib/cloudinary-server");
    const res = await cloudinary.uploader.upload(url, { folder, transformation: { width: 1600, crop: "limit", quality: "auto:good" } });
    return res.secure_url;
  } catch {
    return null;
  }
}

async function importItem(store: { id: string; owner_id?: string | null }, r: RemoteItem): Promise<string | null> {
  const { ensureUncategorized } = await import("@/lib/categories");
  const pays = r.sale_price ?? r.price ?? 0;
  if (!r.name.trim() || pays <= 0) return null;
  const was = r.sale_price != null && r.price != null && r.price > r.sale_price ? r.price : null;
  const image = await copyImage(r.image_url, `duka/${store.owner_id ?? store.id}`);
  const stock = r.inventory != null ? Math.max(0, Math.floor(r.inventory)) : r.availability === "in stock" ? 1 : 0;
  let slug = slugify(r.name) || "product";
  if (await queryOne(`SELECT 1 FROM products WHERE store_id = $1 AND slug = $2`, [store.id, slug])) slug = `${slug}-${Date.now().toString(36)}`;
  const row = await queryOne<{ id: string }>(
    `INSERT INTO products (store_id, category_id, name, slug, description, price, compare_price, stock_quantity, image_url, images, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true) RETURNING id`,
    [store.id, await ensureUncategorized(store.id), r.name.slice(0, 200), slug, r.description, pays, was, stock, image, image ? [image] : []],
  );
  return row?.id ?? null;
}

/* ────────────────────────────── The sync ────────────────────────────── */

const STALE_MS = 60 * 60 * 1000; // pushed items Meta still hasn't shown after an hour get pushed again

export async function syncStoreCatalog(storeId: string): Promise<SyncResult> {
  const result: SyncResult = { ok: false, pushed: 0, removed: 0, imported: 0, pulled: 0, hidden: 0, skipped: 0 };
  await ensureSocialTables();
  const conn = await queryOne<WaConnection & { business_id: string | null }>(
    `SELECT * FROM social_connections WHERE store_id = $1 AND channel = 'whatsapp' AND status = 'active'`,
    [storeId],
  );
  const store = await queryOne<{ id: string; name: string; slug: string; custom_domain: string | null; owner_id: string | null }>(
    `SELECT id, name, slug, custom_domain, owner_id FROM stores WHERE id = $1 AND is_active = true`,
    [storeId],
  );
  if (!conn || !store) return { ...result, error: "WhatsApp isn't connected" };
  const token = tokenFor(conn);
  if (!token) return { ...result, error: "WhatsApp token unavailable" };

  const fail = async (error: string) => {
    await query(`UPDATE social_connections SET catalog_error = $2, updated_at = NOW() WHERE id = $1`, [conn.id, error.slice(0, 500)]).catch(() => {});
    return { ...result, error };
  };

  const cat = await ensureCatalog(conn, store.name);
  if (!cat.ok) return fail(cat.error);
  const catalogId = cat.catalogId;

  const [desired, mapRows, remote] = await Promise.all([
    desiredItems(store),
    query<MapRow>(`SELECT retailer_id, product_id, variant_id, meta_item_id, local_hash, remote_hash, synced_at FROM social_catalog_items WHERE store_id = $1`, [storeId]),
    readRemote(catalogId, token),
  ]);
  if (!remote) return fail("Couldn't read the catalog from Meta (check the catalog_management permission)");

  // Products that came from Meta keep their original retailer ID there
  const keepId = new Map(
    mapRows.filter((m) => m.product_id && !UUIDISH.test(m.retailer_id.split(":")[0])).map((m) => [`${m.product_id}:${m.variant_id ?? ""}`, m.retailer_id]),
  );
  for (const d of desired) d.retailer_id = keepId.get(`${d.product_id}:${d.variant_id ?? ""}`) ?? d.retailer_id;

  const mapped = new Map(mapRows.map((m) => [m.retailer_id, m]));
  const want = new Map(desired.map((d) => [d.retailer_id, d]));
  const there = new Map(remote.map((r) => [r.retailer_id, r]));
  const requests: { method: "CREATE" | "UPDATE" | "DELETE"; data: Record<string, unknown> }[] = [];
  const saves: { retailer_id: string; product_id: string | null; variant_id: string | null; meta_item_id: string | null; local: string; remote: string }[] = [];
  const pulls: { item: CatalogItem; r: RemoteItem }[] = [];
  const hides: string[] = [];
  const now = Date.now();

  // 1. Every item Duka has
  for (const d of desired) {
    const m = mapped.get(d.retailer_id);
    const r = there.get(d.retailer_id);
    const lp = localPrint(d);
    if (!m) {
      // New to the catalog (or already there from a previous install): push it
      requests.push({ method: "UPDATE", data: metaItemData(d, store.name) });
      saves.push({ retailer_id: d.retailer_id, product_id: d.product_id, variant_id: d.variant_id, meta_item_id: r?.id ?? null, local: lp, remote: lp });
      result.pushed++;
      continue;
    }
    if (!r) {
      if (m.meta_item_id) {
        // Meta had it and it's gone: deleted in WhatsApp/Commerce Manager -> hide in Duka
        hides.push(d.product_id);
        continue;
      }
      // Pushed but not showing yet (Meta processes in the background); re-push if it's been a while
      if (now - new Date(m.synced_at).getTime() > STALE_MS || m.local_hash !== lp) {
        requests.push({ method: "UPDATE", data: metaItemData(d, store.name) });
        saves.push({ retailer_id: d.retailer_id, product_id: d.product_id, variant_id: d.variant_id, meta_item_id: null, local: lp, remote: lp });
        result.pushed++;
      }
      continue;
    }
    const rp = remotePrint(r);
    if (m.local_hash !== lp) {
      // Duka changed (wins if both did)
      requests.push({ method: "UPDATE", data: metaItemData(d, store.name) });
      saves.push({ retailer_id: d.retailer_id, product_id: d.product_id, variant_id: d.variant_id, meta_item_id: r.id, local: lp, remote: lp });
      result.pushed++;
    } else if (m.remote_hash !== rp) {
      // Only Meta changed: bring it into Duka
      pulls.push({ item: d, r });
    } else if (!m.meta_item_id) {
      saves.push({ retailer_id: d.retailer_id, product_id: d.product_id, variant_id: d.variant_id, meta_item_id: r.id, local: lp, remote: rp });
    }
  }

  // 2. Items Duka no longer has (deleted / hidden / became a service) -> remove from Meta
  for (const m of mapRows) {
    if (want.has(m.retailer_id) || !there.has(m.retailer_id)) continue;
    requests.push({ method: "DELETE", data: { id: m.retailer_id } });
    result.removed++;
  }

  // 3. Items only Meta has -> new Duka products (within the plan's limit)
  let newRemote = remote.filter((r) => !want.has(r.retailer_id) && !mapped.has(r.retailer_id));
  // Never re-import Duka's own products (e.g. one just hidden, whose removal Meta hasn't processed yet)
  const ownIds = newRemote.map((r) => r.retailer_id.split(":")[0]).filter((id) => UUIDISH.test(id));
  if (ownIds.length) {
    const own = new Set((await query<{ id: string }>(`SELECT id FROM products WHERE store_id = $1 AND id = ANY($2::uuid[])`, [storeId, ownIds])).map((x) => x.id));
    newRemote = newRemote.filter((r) => !own.has(r.retailer_id.split(":")[0]));
  }
  if (newRemote.length) {
    const plan = await getEffectivePlan(storeId).catch(() => null);
    const [{ n }] = await query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM products WHERE store_id = $1`, [storeId]);
    let room = plan ? plan.max_products - Number(n) : 0;
    for (const r of newRemote) {
      if (room <= 0) {
        result.skipped++;
        continue;
      }
      const productId = await importItem(store, r).catch(() => null);
      if (!productId) {
        result.skipped++;
        continue;
      }
      room--;
      result.imported++;
      const rp = remotePrint(r);
      saves.push({ retailer_id: r.retailer_id, product_id: productId, variant_id: null, meta_item_id: r.id, local: "imported", remote: rp });
    }
  }

  // 4. Edits made in Meta -> Duka
  for (const { item, r } of pulls) {
    const pays = r.sale_price ?? r.price ?? item.price;
    const was = r.sale_price != null && r.price != null && r.price > r.sale_price ? r.price : null;
    const stock = r.inventory != null ? Math.max(0, Math.floor(r.inventory)) : null;
    if (item.variant_id) {
      await query(
        `UPDATE product_sizes SET price = $2, stock_quantity = COALESCE($3, stock_quantity) WHERE id = $1`,
        [item.variant_id, pays, stock],
      );
      await query(
        `UPDATE products SET stock_quantity = (SELECT COALESCE(SUM(stock_quantity), 0) FROM product_sizes WHERE product_id = $1), updated_at = NOW() WHERE id = $1`,
        [item.product_id],
      );
    } else {
      await query(
        `UPDATE products SET name = $2, price = $3, compare_price = $4, stock_quantity = COALESCE($5, stock_quantity), updated_at = NOW() WHERE id = $1`,
        [item.product_id, r.name.slice(0, 200) || item.title, pays, was, stock],
      );
    }
    const updated = { ...item, title: item.variant_id ? item.title : r.name || item.title, price: pays, compare: was, inventory: stock ?? item.inventory };
    saves.push({ retailer_id: item.retailer_id, product_id: item.product_id, variant_id: item.variant_id, meta_item_id: r.id, local: localPrint(updated), remote: remotePrint(r) });
    result.pulled++;
  }

  // 5. Deleted in Meta -> hidden in Duka (reversible: turn the product back on)
  for (const productId of [...new Set(hides)]) {
    await query(`UPDATE products SET is_active = false, updated_at = NOW() WHERE id = $1 AND store_id = $2`, [productId, storeId]);
    await query(`DELETE FROM social_catalog_items WHERE store_id = $1 AND product_id = $2`, [storeId, productId]);
    result.hidden++;
  }

  const pushError = requests.length ? await pushBatch(catalogId, token, requests) : null;
  if (pushError) return fail(`Meta rejected the update: ${pushError}`);

  for (const s of saves) {
    await query(
      `INSERT INTO social_catalog_items (store_id, retailer_id, product_id, variant_id, meta_item_id, local_hash, remote_hash, synced_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (store_id, retailer_id) DO UPDATE SET product_id = EXCLUDED.product_id, variant_id = EXCLUDED.variant_id,
         meta_item_id = COALESCE(EXCLUDED.meta_item_id, social_catalog_items.meta_item_id), local_hash = EXCLUDED.local_hash,
         remote_hash = EXCLUDED.remote_hash, synced_at = NOW()`,
      [storeId, s.retailer_id, s.product_id, s.variant_id, s.meta_item_id, s.local, s.remote],
    );
  }
  const gone = mapRows.filter((m) => !want.has(m.retailer_id) && !saves.some((s) => s.retailer_id === m.retailer_id)).map((m) => m.retailer_id);
  if (gone.length) await query(`DELETE FROM social_catalog_items WHERE store_id = $1 AND retailer_id = ANY($2::text[])`, [storeId, gone]);

  await query(`UPDATE social_connections SET catalog_synced_at = NOW(), catalog_error = NULL, updated_at = NOW() WHERE id = $1`, [conn.id]);
  if (result.imported || result.pulled || result.hidden) await invalidateStore(storeId, store.slug);
  return { ...result, ok: true };
}

const UUIDISH = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Imported items keep Meta's retailer ID: map any retailer ID back to Duka's product / variant. */
export async function resolveRetailerIds(storeId: string, ids: string[]): Promise<Map<string, { p: string; v: string | null }>> {
  const out = new Map<string, { p: string; v: string | null }>();
  const unknown: string[] = [];
  for (const id of ids) {
    const [p, v] = id.split(":");
    if (UUIDISH.test(p) && (!v || UUIDISH.test(v))) out.set(id, { p, v: v ?? null });
    else unknown.push(id);
  }
  if (unknown.length) {
    const rows = await query<{ retailer_id: string; product_id: string; variant_id: string | null }>(
      `SELECT retailer_id, product_id, variant_id FROM social_catalog_items WHERE store_id = $1 AND retailer_id = ANY($2::text[]) AND product_id IS NOT NULL`,
      [storeId, unknown],
    ).catch(() => []);
    for (const r of rows) out.set(r.retailer_id, { p: r.product_id, v: r.variant_id });
  }
  return out;
}

/** Cron: every store with an active WhatsApp connection, a few at a time. */
export async function syncAllCatalogs(limit = 20): Promise<{ stores: number; failed: number }> {
  const { whatsappAvailable } = await import("./config");
  if (!whatsappAvailable()) return { stores: 0, failed: 0 };
  await ensureSocialTables();
  const rows = await query<{ store_id: string }>(
    `SELECT store_id FROM social_connections WHERE channel = 'whatsapp' AND status = 'active'
      ORDER BY catalog_synced_at NULLS FIRST LIMIT $1`,
    [limit],
  );
  let failed = 0;
  for (const r of rows) {
    const res = await syncStoreCatalog(r.store_id).catch((e) => ({ ok: false, error: String(e) }) as SyncResult);
    if (!res.ok) failed++;
  }
  return { stores: rows.length, failed };
}
