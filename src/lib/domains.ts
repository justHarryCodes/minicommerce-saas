// Custom domain lifecycle: add → (merchant sets DNS) → check until live → remove.
// store_domains holds the state; stores.custom_domain mirrors the hostname
// only while it's live, for cheap lookups (store links, Worker resolution).

import { query, queryOne } from "@/lib/db";
import { hasFeature } from "@/lib/plan";
import { cacheDel, cacheKey } from "@/lib/redis";
import {
  createCustomHostname,
  deleteCustomHostname,
  getCustomHostname,
  isLive,
  type DnsRecord,
} from "@/lib/cloudflare";

export interface StoreDomain {
  hostname: string;
  status: "pending" | "active" | "failed";
  ssl_status: string | null;
  verification: DnsRecord[];
  last_error: string | null;
  last_checked_at: string | null;
  verified_at: string | null;
  created_at: string;
}

export async function getStoreDomain(storeId: string): Promise<(StoreDomain & { cf_hostname_id: string | null }) | null> {
  return queryOne(
    `SELECT hostname, status, ssl_status, verification, last_error, last_checked_at, verified_at, created_at, cf_hostname_id
     FROM store_domains WHERE store_id = $1`,
    [storeId]
  );
}

export class DomainError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export async function addStoreDomain(storeId: string, hostname: string): Promise<StoreDomain> {
  if (await getStoreDomain(storeId)) throw new DomainError("Remove your current domain before adding another.", 409);
  const taken = await queryOne("SELECT 1 FROM store_domains WHERE hostname = $1", [hostname]);
  if (taken) throw new DomainError("That domain is already connected to another store.", 409);

  let cf;
  try {
    cf = await createCustomHostname(hostname);
  } catch (err) {
    throw new DomainError(err instanceof Error ? err.message : "Couldn't register the domain with our CDN", 502);
  }
  await query(
    `INSERT INTO store_domains (store_id, hostname, status, cf_hostname_id, ssl_status, verification, last_checked_at)
     VALUES ($1, $2, 'pending', $3, $4, $5::jsonb, NOW())`,
    [storeId, hostname, cf.id, cf.sslStatus, JSON.stringify(cf.records)]
  );
  return (await getStoreDomain(storeId))!;
}

/** Ask Cloudflare where verification is at and update our copy. */
export async function refreshStoreDomain(storeId: string, storeSlug: string): Promise<StoreDomain | null> {
  const d = await getStoreDomain(storeId);
  if (!d || !d.cf_hostname_id) return d;
  try {
    const cf = await getCustomHostname(d.cf_hostname_id);
    const live = isLive(cf);
    const failed = ["blocked", "moved", "deleted"].includes(cf.status);
    await query(
      `UPDATE store_domains SET status = $2, ssl_status = $3, verification = $4::jsonb, last_error = $5,
         last_checked_at = NOW(), verified_at = CASE WHEN $2 = 'active' THEN COALESCE(verified_at, NOW()) ELSE verified_at END
       WHERE store_id = $1`,
      [storeId, live ? "active" : failed ? "failed" : "pending", cf.sslStatus, JSON.stringify(cf.records), cf.errors.join("; ") || null]
    );
    await query("UPDATE stores SET custom_domain = $2 WHERE id = $1", [storeId, live ? d.hostname : null]);
    await cacheDel(cacheKey.storeMeta(storeSlug));
  } catch (err) {
    await query("UPDATE store_domains SET last_error = $2, last_checked_at = NOW() WHERE store_id = $1", [
      storeId,
      err instanceof Error ? err.message.slice(0, 300) : "Check failed",
    ]);
  }
  return getStoreDomain(storeId);
}

export async function removeStoreDomain(storeId: string, storeSlug: string): Promise<void> {
  const d = await getStoreDomain(storeId);
  if (!d) return;
  if (d.cf_hostname_id) {
    // Already gone at Cloudflare is fine — we're removing it anyway.
    await deleteCustomHostname(d.cf_hostname_id).catch(() => {});
  }
  await query("DELETE FROM store_domains WHERE store_id = $1", [storeId]);
  await query("UPDATE stores SET custom_domain = NULL WHERE id = $1", [storeId]);
  await cacheDel(cacheKey.storeMeta(storeSlug));
}

/** For the Worker: which store does this live hostname belong to? */
export async function slugForHostname(hostname: string): Promise<string | null> {
  const row = await queryOne<{ slug: string; id: string }>(
    `SELECT s.slug, s.id FROM store_domains d JOIN stores s ON s.id = d.store_id
     WHERE d.hostname = $1 AND d.status = 'active' AND s.is_active = true`,
    [hostname.toLowerCase().replace(/^www\./, "")]
  );
  if (!row) return null;
  return (await hasFeature(row.id, "custom_domain")) ? row.slug : null;
}

/**
 * Keep stores.custom_domain (used to build every store link) in step with
 * the plan: a lapsed plan falls back to the free subdomain, and a renewed
 * plan gets its still-live domain back without the merchant doing anything.
 */
export async function syncCustomDomainsWithPlans(): Promise<{ detached: number; restored: number }> {
  let detached = 0;
  let restored = 0;
  const linked = await query<{ id: string }>("SELECT id FROM stores WHERE custom_domain IS NOT NULL");
  for (const s of linked) {
    if (!(await hasFeature(s.id, "custom_domain"))) {
      await query("UPDATE stores SET custom_domain = NULL WHERE id = $1", [s.id]);
      detached++;
    }
  }
  const waiting = await query<{ id: string; hostname: string }>(
    `SELECT s.id, d.hostname FROM stores s JOIN store_domains d ON d.store_id = s.id
     WHERE s.custom_domain IS NULL AND d.status = 'active' AND s.is_active = true`
  );
  for (const s of waiting) {
    if (await hasFeature(s.id, "custom_domain")) {
      await query("UPDATE stores SET custom_domain = $2 WHERE id = $1 AND custom_domain IS NULL", [s.id, s.hostname]);
      restored++;
    }
  }
  return { detached, restored };
}
