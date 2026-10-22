// Variant helpers used in the browser (product page, variant editor).
// No zod here — the validation schemas stay in lib/variants (server).

export const MAX_OPTIONS = 3;
export const MAX_VARIANTS = 100;

/** "M / Red" from {Size: "M", Colour: "Red"} in option order. */
export function variantLabel(optionNames: string[], options: Record<string, string>): string {
  return optionNames.map((n) => (options[n] ?? "").trim()).filter(Boolean).join(" / ");
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
