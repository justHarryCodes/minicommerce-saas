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

  white: '#ffffff',
  black: '#000000',
} as const;

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
