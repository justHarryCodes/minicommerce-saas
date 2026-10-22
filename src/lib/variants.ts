// Product variants (e.g. Size × Colour). Stored as rows in product_sizes —
// the row's `label` ("M / Red") is the stable key used by the cart,
// order_items.size and stock decrements, so everything downstream of the
// product page keeps working exactly as it did for plain sizes.

import { z } from "zod";

import { MAX_OPTIONS, MAX_VARIANTS, variantLabel } from "./variants-shared";

export * from "./variants-shared";

export const optionNamesSchema = z
  .array(z.string().trim().min(1).max(30))
  .max(MAX_OPTIONS)
  .transform((names) => Array.from(new Set(names)));

export const variantInputSchema = z.object({
  label: z.string().trim().max(120).optional().default(""),
  stockQuantity: z.number().int().min(0).default(0),
  options: z.record(z.string().trim().max(40)).optional().default({}),
  price: z.number().min(0).nullable().optional(),
  imageUrl: z.string().max(1000).nullable().optional(),
  sku: z.string().trim().max(60).nullable().optional(),
});
export type VariantInput = z.infer<typeof variantInputSchema>;

export interface NormalizedVariant {
  label: string;
  stockQuantity: number;
  options: Record<string, string>;
  price: number | null;
  imageUrl: string | null;
  sku: string | null;
}

/**
 * Turn submitted variants into storable rows. With option names, labels are
 * derived from the option values (and must be complete); without, it's the
 * legacy size-only shape and the label is used as given. Duplicate labels
 * are dropped (first wins).
 */
export function normalizeVariants(optionNames: string[], input: VariantInput[]): { ok: true; variants: NormalizedVariant[] } | { ok: false; error: string } {
  const out: NormalizedVariant[] = [];
  const seen = new Set<string>();
  for (const v of input.slice(0, MAX_VARIANTS)) {
    let options: Record<string, string> = {};
    let label: string;
    if (optionNames.length) {
      for (const n of optionNames) {
        const val = (v.options[n] ?? "").trim();
        if (!val) return { ok: false, error: `Every variant needs a ${n}` };
        options[n] = val;
      }
      label = variantLabel(optionNames, options);
    } else {
      label = v.label.trim();
      if (!label) continue;
      options = {};
    }
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      label,
      stockQuantity: v.stockQuantity,
      options,
      price: v.price ?? null,
      imageUrl: v.imageUrl || null,
      sku: v.sku || null,
    });
  }
  return { ok: true, variants: out };
}

