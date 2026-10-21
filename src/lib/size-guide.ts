// Per-product size guides (a small table + note). Browser-safe.

import { z } from "zod";

export interface SizeGuide {
  columns: string[];
  rows: string[][];
  note?: string;
}

const cell = z.string().trim().max(30);
export const sizeGuideSchema = z
  .object({
    columns: z.array(cell).min(1).max(8),
    rows: z.array(z.array(cell).max(8)).max(30),
    note: z.string().trim().max(300).optional(),
  })
  .transform((g) => ({
    columns: g.columns,
    // pad/trim every row to the column count; drop fully empty rows
    rows: g.rows.map((r) => g.columns.map((_, i) => r[i] ?? "")).filter((r) => r.some((c) => c)),
    ...(g.note ? { note: g.note } : {}),
  }));

/** Valid guide or null (also null for an empty table). */
export function parseSizeGuide(raw: unknown): SizeGuide | null {
  if (!raw) return null;
  const p = sizeGuideSchema.safeParse(raw);
  return p.success && p.data.rows.length ? p.data : null;
}

export const SIZE_GUIDE_TEMPLATES: { label: string; guide: SizeGuide }[] = [
  {
    label: "Women's clothing",
    guide: {
      columns: ["Size", "UK", "US", "Bust (cm)", "Waist (cm)", "Hips (cm)"],
      rows: [
        ["XS", "6", "2", "78–82", "60–64", "86–90"],
        ["S", "8", "4", "82–86", "64–68", "90–94"],
        ["M", "10", "6", "86–90", "68–72", "94–98"],
        ["L", "12", "8", "90–96", "72–78", "98–104"],
        ["XL", "14", "10", "96–102", "78–84", "104–110"],
        ["XXL", "16", "12", "102–108", "84–90", "110–116"],
      ],
      note: "Measure around the fullest part of your bust and hips, and the narrowest part of your waist.",
    },
  },
  {
    label: "Men's tops",
    guide: {
      columns: ["Size", "Chest (cm)", "Waist (cm)", "Length (cm)"],
      rows: [
        ["S", "88–96", "74–80", "70"],
        ["M", "96–104", "80–88", "72"],
        ["L", "104–112", "88–96", "74"],
        ["XL", "112–120", "96–104", "76"],
        ["XXL", "120–128", "104–112", "78"],
      ],
      note: "Between sizes? Size up for a relaxed fit.",
    },
  },
  {
    label: "Shoes",
    guide: {
      columns: ["EU", "UK", "US (men)", "US (women)", "Foot length (cm)"],
      rows: [
        ["38", "5", "6", "7.5", "24"],
        ["39", "6", "7", "8.5", "24.7"],
        ["40", "6.5", "7.5", "9", "25.3"],
        ["41", "7.5", "8.5", "10", "26"],
        ["42", "8", "9", "10.5", "26.7"],
        ["43", "9", "10", "11.5", "27.3"],
        ["44", "10", "11", "12.5", "28"],
        ["45", "11", "12", "13.5", "28.7"],
      ],
      note: "Measure your foot from heel to longest toe, standing.",
    },
  },
];
