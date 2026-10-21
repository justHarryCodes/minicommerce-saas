// Delivery zones, pickup and pay-on-delivery rules. Pure functions shared by
// the checkout UI (to preview) and the order API (which is authoritative —
// the client's numbers are never trusted).

import { z } from "zod";

export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
}

export interface DeliverySettings {
  zones: DeliveryZone[];
  freeDeliveryThreshold: number | null;
  pickupEnabled: boolean;
  pickupAddress: string | null;
}

export interface PayOnDeliverySettings {
  enabled: boolean;
  /** 0 = pay everything on delivery; otherwise % charged online up front */
  depositPercent: number;
}

export const MAX_ZONES = 30;

const zoneSchema = z.object({
  id: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(60),
  fee: z.coerce.number().min(0).max(10_000_000),
});

/** Parse stored/submitted zones, dropping anything malformed and duplicate ids. */
export function parseZones(raw: unknown): DeliveryZone[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: DeliveryZone[] = [];
  for (const z of raw.slice(0, MAX_ZONES)) {
    const p = zoneSchema.safeParse(z);
    if (!p.success || seen.has(p.data.id)) continue;
    seen.add(p.data.id);
    out.push({ ...p.data, fee: Math.round(p.data.fee) });
  }
  return out;
}

/** Store row (raw snake_case or toCamel'd) → delivery settings. */
export function deliverySettingsOf(store: Record<string, unknown>): DeliverySettings {
  const threshold = store.free_delivery_threshold ?? store.freeDeliveryThreshold;
  return {
    zones: parseZones(store.delivery_zones ?? store.deliveryZones),
    freeDeliveryThreshold: threshold == null || threshold === "" ? null : Number(threshold),
    pickupEnabled: Boolean(store.pickup_enabled ?? store.pickupEnabled),
    pickupAddress: ((store.pickup_address ?? store.pickupAddress) as string | null) || null,
  };
}

export function podSettingsOf(store: Record<string, unknown>): PayOnDeliverySettings {
  const pct = Number(store.pod_deposit_percent ?? store.podDepositPercent ?? 0);
  return {
    enabled: Boolean(store.pod_enabled ?? store.podEnabled),
    depositPercent: Number.isFinite(pct) ? Math.min(90, Math.max(0, Math.round(pct))) : 0,
  };
}

/** A store that hasn't set up zones or pickup keeps the old "to be arranged" flow. */
export function hasDeliveryOptions(s: DeliverySettings): boolean {
  return s.zones.length > 0 || s.pickupEnabled;
}

export type DeliveryChoice = { method: "delivery"; zoneId?: string | null } | { method: "pickup" };

export type DeliveryQuote =
  | { ok: true; method: "delivery" | "pickup"; fee: number; zoneName: string | null; freeApplied: boolean }
  | { ok: false; error: string };

/**
 * Delivery fee for a choice. `goodsTotal` is the subtotal after discounts —
 * that's what the free-delivery threshold is measured against.
 */
export function quoteDelivery(s: DeliverySettings, choice: DeliveryChoice, goodsTotal: number): DeliveryQuote {
  if (choice.method === "pickup") {
    if (!s.pickupEnabled) return { ok: false, error: "Pickup isn't available for this store" };
    return { ok: true, method: "pickup", fee: 0, zoneName: null, freeApplied: false };
  }
  if (s.zones.length === 0) {
    // No zones configured: delivery is arranged with the store afterwards.
    return { ok: true, method: "delivery", fee: 0, zoneName: null, freeApplied: false };
  }
  const zone = s.zones.find((z) => z.id === choice.zoneId);
  if (!zone) return { ok: false, error: "Please choose a delivery area" };
  const free = s.freeDeliveryThreshold != null && goodsTotal >= s.freeDeliveryThreshold;
  return { ok: true, method: "delivery", fee: free ? 0 : zone.fee, zoneName: zone.name, freeApplied: free && zone.fee > 0 };
}

/** Amount charged online up front for a pay-on-delivery order. */
export function depositFor(total: number, depositPercent: number): number {
  if (depositPercent <= 0) return 0;
  return Math.ceil((total * depositPercent) / 100);
}

/** Slug-ish id for a new zone name, unique within the list. */
export function zoneIdFor(name: string, existing: DeliveryZone[]): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 30) || "zone";
  let id = base;
  for (let i = 2; existing.some((z) => z.id === id); i++) id = `${base}-${i}`;
  return id;
}
