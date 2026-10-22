// Rich product details (spec table, scent notes, highlights). Client-safe:
// the product editor and the storefront both use it. Hand-validated (no
// zod) because it ships to product pages.

export interface ProductSpec {
  label: string;
  value: string;
}

export interface ScentNotes {
  top: string[];
  heart: string[];
  base: string[];
}

export interface ProductDetails {
  specs?: ProductSpec[];
  notes?: ScentNotes;
  highlights?: string[];
}

const MAX_SPECS = 24;
const MAX_NOTES = 8;
const MAX_HIGHLIGHTS = 8;

const clean = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const s = v.trim().replace(/\s+/g, " ");
  return s && s.length <= max ? s : s ? s.slice(0, max) : null;
};

const list = (v: unknown, maxItems: number, maxLen: number): string[] =>
  Array.isArray(v) ? v.map((x) => clean(x, maxLen)).filter((x): x is string => !!x).slice(0, maxItems) : [];

/** Valid details or null (empty sections are dropped). */
export function parseProductDetails(raw: unknown): ProductDetails | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const out: ProductDetails = {};

  if (Array.isArray(r.specs)) {
    const specs = r.specs
      .map((s) => {
        const o = (s ?? {}) as Record<string, unknown>;
        const label = clean(o.label, 40);
        const value = clean(o.value, 120);
        return label && value ? { label, value } : null;
      })
      .filter((s): s is ProductSpec => !!s)
      .slice(0, MAX_SPECS);
    if (specs.length) out.specs = specs;
  }

  if (r.notes && typeof r.notes === "object") {
    const n = r.notes as Record<string, unknown>;
    const notes = { top: list(n.top, MAX_NOTES, 30), heart: list(n.heart, MAX_NOTES, 30), base: list(n.base, MAX_NOTES, 30) };
    if (notes.top.length || notes.heart.length || notes.base.length) out.notes = notes;
  }

  const highlights = list(r.highlights, MAX_HIGHLIGHTS, 80);
  if (highlights.length) out.highlights = highlights;

  return Object.keys(out).length ? out : null;
}

/** "Storage: 256GB · RAM: 8GB" — first few specs for list rows and cards. */
export function keySpecs(details: ProductDetails | null | undefined, n = 3): ProductSpec[] {
  return (details?.specs ?? []).slice(0, n);
}
