import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function formatPrice(amount: number, currency = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount)
}

export function generateOrderNumber(): string {
  const prefix = 'ORD'
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

export function deriveColors(hexColor: string): {
  base: string
  light: string
  dark: string
  lighter: string
  darker: string
} {
  // Simple color derivation without chroma-js for SSR safety
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)

  const lighten = (v: number, amount: number) => Math.min(255, Math.round(v + (255 - v) * amount))
  const darken  = (v: number, amount: number) => Math.max(0,   Math.round(v * (1 - amount)))
  const toHex   = (v: number) => v.toString(16).padStart(2, '0')
  const rgb     = (r: number, g: number, b: number) => `#${toHex(r)}${toHex(g)}${toHex(b)}`

  return {
    base:    hexColor,
    light:   rgb(lighten(r, 0.3), lighten(g, 0.3), lighten(b, 0.3)),
    dark:    rgb(darken(r, 0.25), darken(g, 0.25), darken(b, 0.25)),
    lighter: rgb(lighten(r, 0.6), lighten(g, 0.6), lighten(b, 0.6)),
    darker:  rgb(darken(r, 0.5),  darken(g, 0.5),  darken(b, 0.5)),
  }
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + '…' : str
}

export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`)
}

// Aliases used throughout the app
export const formatCurrency = (amount: number) => formatPrice(amount)

export function formatDate(dateStr: string | Date): string {
  return new Date(dateStr).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

export function formatDateTime(dateStr: string | Date): string {
  return new Date(dateStr).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// Alias for storefront layout
export const deriveThemeColors = (hex: string) => {
  const colors = deriveColors(hex)
  return { accentLight: colors.light, accentDark: colors.dark }
}

// Store / product URL helpers — uses subdomain when NEXT_PUBLIC_ROOT_DOMAIN is set
export function getStoreUrl(slug: string): string {
  const domain = process.env.NEXT_PUBLIC_ROOT_DOMAIN
  return domain ? `https://${slug}.${domain}` : `/store/${slug}`
}

export function getProductUrl(storeSlug: string, productSlug: string): string {
  const domain = process.env.NEXT_PUBLIC_ROOT_DOMAIN
  return domain
    ? `https://${storeSlug}.${domain}/products/${productSlug}`
    : `/store/${storeSlug}/products/${productSlug}`
}

// Build a prefilled WhatsApp URL
export function waLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}
