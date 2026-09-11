/* ─── Brand ─────────────────────────────────────────────────── */
export const Colors = {
  brand:      '#e9bc07',   // amber – only use as background or border
  brandDark:  '#c9a006',   // amber darker – icon/accent on white
  brandLight: '#fef9ec',   // amber tint background
  amber:      '#fbb724',   // keep for compat

  /* Dark UI surfaces – headers, FAB, dark cards */
  dark:       '#0F172A',
  darkCard:   '#1E293B',
  darkBorder: '#334155',
  darkMuted:  '#94A3B8',

  /* Slate scale – primary surface/text palette */
  surface: {
    50:  '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },

  success: '#22c55e',
  warning: '#f59e0b',
  error:   '#ef4444',
  info:    '#3b82f6',

  /* Light-tint/dark-text pairs for badges built ad hoc outside the
   * order/payment Status map below (e.g. a stock-level badge) — same
   * green/red as Status.confirmed/Status.cancelled, named generically. */
  successLight: '#dcfce7',
  successDark:  '#166534',
  errorLight:   '#fee2e2',
  errorDark:    '#991b1b',

  /* Border for a brandLight-tinted tip/info box (billing, products,
   * reels/new, qrcode all repeat this — one of them slightly off). */
  brandBorder: '#fde68a',

  white: '#ffffff',
  black: '#000000',
} as const;

/* ─── Section accent colors ─────────────────────────────────── */
/* One color per app section (Orders, Products, Categories, Reels…),
 * shared by every surface that represents that section — the drawer
 * menu grid, the FAB "Add new" sheet, etc. — so the same concept never
 * shows up in a different color depending on which screen you're on. */
export const Accent = {
  dashboard:  { bg: '#EFF6FF', fg: '#3B82F6' },
  orders:     { bg: '#F5F3FF', fg: '#8B5CF6' },
  products:   { bg: '#F0FDF4', fg: '#22C55E' },
  categories: { bg: '#FFF7ED', fg: '#F97316' },
  reels:      { bg: '#FFF1F2', fg: '#F43F5E' },
  billing:    { bg: '#ECFDF5', fg: '#10B981' },
  qrcode:     { bg: '#FEF9EC', fg: '#c9a006' }, // brandLight/brandDark — QR ties to the storefront link
  settings:   { bg: '#F8FAFC', fg: '#64748B' },
} as const;

/* ─── Discover: product-category icon + accent map ──────────── */
/* Was duplicated three times (home.tsx, discover.tsx,
 * products/[category].tsx) — two of the three copies had dropped the
 * `accent` field, keeping only `icon`. */
export const CategoryMeta: Record<string, { icon: string; accent: string }> = {
  'Fashion and Clothing':    { icon: '👗', accent: '#ec4899' },
  'Shoes and Sneakers':      { icon: '👟', accent: '#f97316' },
  'Bags and Accessories':    { icon: '👜', accent: '#a855f7' },
  'Beauty and Makeup':       { icon: '💄', accent: '#f43f5e' },
  'Hair and Wigs':           { icon: '💇', accent: '#06b6d4' },
  'Food and Catering':       { icon: '🍽️', accent: '#22c55e' },
  'Electronics and Gadgets': { icon: '⚡', accent: '#3b82f6' },
  'Phones and Accessories':  { icon: '📱', accent: '#6366f1' },
  'Laptops and Computing':   { icon: '💻', accent: '#0ea5e9' },
  'Furniture and Home':      { icon: '🛋️', accent: '#84cc16' },
  'Artwork and Paintings':   { icon: '🎨', accent: '#f59e0b' },
  'Jewelry and Watches':     { icon: '💎', accent: '#14b8a6' },
  'Books and Stationery':    { icon: '📚', accent: '#8b5cf6' },
  'Other':                   { icon: '📦', accent: '#71717a' },
} as const;

/* ─── Category tile accents ─────────────────────────────────── */
/* Rotating accent colors for an arbitrary list of categories (as opposed
 * to Accent above, which is one fixed color per named app section). Was
 * duplicated verbatim in categories/index.tsx and categories/new.tsx. */
export const CategoryAccents = [
  { bg: '#FEF3C7', icon: '#D97706' },
  { bg: '#DBEAFE', icon: '#2563EB' },
  { bg: '#EDE9FE', icon: '#7C3AED' },
  { bg: '#D1FAE5', icon: '#059669' },
  { bg: '#FCE7F3', icon: '#DB2777' },
  { bg: '#FFEDD5', icon: '#EA580C' },
  { bg: '#CCFBF1', icon: '#0D9488' },
  { bg: '#FEE2E2', icon: '#DC2626' },
] as const;

/* ─── Order / payment status badges ─────────────────────────── */
export const Status = {
  pending:              { label: 'Pending',    bg: '#fef9c3', text: '#854d0e' },
  confirmed:            { label: 'Confirmed',  bg: '#dcfce7', text: '#166534' },
  processing:           { label: 'Processing', bg: '#dbeafe', text: '#1e40af' },
  shipped:              { label: 'Shipped',    bg: '#ede9fe', text: '#5b21b6' },
  delivered:            { label: 'Delivered',  bg: '#dcfce7', text: '#166534' },
  cancelled:            { label: 'Cancelled',  bg: '#fee2e2', text: '#991b1b' },
  paid:                 { label: 'Paid',       bg: '#dcfce7', text: '#166534' },
  pending_confirmation: { label: 'Awaiting',   bg: '#fef9c3', text: '#854d0e' },
  failed:               { label: 'Failed',     bg: '#fee2e2', text: '#991b1b' },
  rejected:             { label: 'Rejected',   bg: '#fee2e2', text: '#991b1b' },
} as const;

/* ─── Spacing scale ──────────────────────────────────────────── */
export const Spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  xxxl: 32,
} as const;

/* ─── Border radius scale ────────────────────────────────────── */
export const Radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  full: 9999,
} as const;

/* ─── Typography scale ───────────────────────────────────────── */
export const FontSize = {
  xs:   10,
  sm:   11,
  base: 13,
  md:   14,
  lg:   16,
  xl:   18,
  xxl:  22,
  xxxl: 28,
} as const;
