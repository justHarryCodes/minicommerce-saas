// Product variants (e.g. Size × Colour). Stored as rows in product_sizes —
// the row's `label` ("M / Red") is the stable key used by the cart,
// order_items.size and stock decrements, so everything downstream of the
// product page keeps working exactly as it did for plain sizes.

import { z } from "zod";

export const MAX_OPTIONS = 3;
export const MAX_VARIANTS = 100;

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

/** "M / Red" from {Size: "M", Colour: "Red"} in option order. */
export function variantLabel(optionNames: string[], options: Record<string, string>): string {
  return optionNames.map((n) => (options[n] ?? "").trim()).filter(Boolean).join(" / ");
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

/** Every combination of option values, in a stable order. */
export function combinations(options: { name: string; values: string[] }[]): Record<string, string>[] {
  const usable = options.filter((o) => o.name.trim() && o.values.length);
  if (!usable.length) return [];
  return usable.reduce<Record<string, string>[]>(
    (acc, o) => acc.flatMap((combo) => o.values.map((v) => ({ ...combo, [o.name]: v }))),
    [{}]
  );
}

/**
 * Structured options for a stored row. Legacy size-only rows (no option
 * names on the product) read as a single "Size" option.
 */
export function optionsOf(optionNames: string[] | null | undefined, row: { label: string; options?: unknown }): Record<string, string> {
  const names = optionNames ?? [];
  const stored = row.options && typeof row.options === "object" ? (row.options as Record<string, string>) : {};
  if (names.length && Object.keys(stored).length) return stored;
  return { [names[0] ?? "Size"]: row.label };
}

/** Option names to show on the product page (legacy products → ["Size"]). */
export function optionNamesOf(optionNames: string[] | null | undefined): string[] {
  return optionNames && optionNames.length ? optionNames : ["Size"];
}
