// Per-product size guides (a small table + note). Browser-safe.

export interface SizeGuide {
  columns: string[];
  rows: string[][];
  note?: string;
}

// Hand-checked rather than zod: this ships in the product page's JavaScript.
// Rules: 1–8 columns, up to 30 rows of up to 8 cells, cells ≤ 30 chars,
// note ≤ 300 chars (all trimmed); anything else makes the guide invalid.
const cellOk = (v: unknown): v is string => typeof v === "string" && v.trim().length <= 30;

/** Valid guide or null (also null for an empty table). */
export function parseSizeGuide(raw: unknown): SizeGuide | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as { columns?: unknown; rows?: unknown; note?: unknown };
  if (!Array.isArray(g.columns) || g.columns.length < 1 || g.columns.length > 8 || !g.columns.every(cellOk)) return null;
  if (!Array.isArray(g.rows) || g.rows.length > 30) return null;
  if (!g.rows.every((r) => Array.isArray(r) && r.length <= 8 && r.every(cellOk))) return null;
  if (g.note !== undefined && (typeof g.note !== "string" || g.note.trim().length > 300)) return null;
  const columns = (g.columns as string[]).map((c) => c.trim());
  // pad/trim every row to the column count; drop fully empty rows
  const rows = (g.rows as string[][])
    .map((r) => columns.map((_, i) => (r[i] ?? "").trim()))
    .filter((r) => r.some((c) => c));
  if (!rows.length) return null;
  const note = typeof g.note === "string" ? g.note.trim() : "";
  return { columns, rows, ...(note ? { note } : {}) };
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
