// Paid features. Anything not listed here is part of every plan, Free
// included (products, orders, categories, checkout, delivery, receipts…).
// Client-safe: the dashboard nav and upgrade screens read this too.

export type Feature =
  | 'premium_themes'
  | 'custom_domain'
  | 'coupons'
  | 'reels'
  | 'ai_tools'
  | 'analytics'
  | 'customers'
  | 'abandoned_carts'
  | 'customer_messages'
  | 'inventory_tools'
  | 'stock_alerts'
  | 'bookings'
  | 'team'
  | 'blog'
  | 'gift_cards'
  | 'loyalty'
  | 'sales_channels'
  | 'pos'

export interface FeatureInfo {
  label: string
  /** One line for upgrade screens and the admin plan editor */
  pitch: string
}

export const FEATURES: Record<Feature, FeatureInfo> = {
  premium_themes: { label: 'Premium themes', pitch: 'All 18 professionally designed themes for every kind of business.' },
  custom_domain: { label: 'Custom domain', pitch: 'Sell on your own web address, like yourbrand.com.' },
  coupons: { label: 'Coupons', pitch: 'Discount codes for promotions and influencers.' },
  reels: { label: 'Reels', pitch: 'Shoppable short videos on your store.' },
  ai_tools: { label: 'AI tools', pitch: 'Write product descriptions and pick categories automatically.' },
  analytics: { label: 'Analytics', pitch: 'Sales, visitors, top products and where your customers come from.' },
  customers: { label: 'Customers', pitch: 'Every customer, what they bought and how much they spent.' },
  abandoned_carts: { label: 'Abandoned cart recovery', pitch: 'Automatically remind shoppers who left without paying.' },
  customer_messages: { label: 'Customer SMS & email', pitch: 'Order confirmations and updates sent to your customers automatically.' },
  inventory_tools: { label: 'Inventory tools', pitch: 'Stock history and low-stock alerts so you never run out.' },
  stock_alerts: { label: 'Back-in-stock alerts', pitch: 'Let shoppers ask to be told when a sold-out item returns.' },
  bookings: { label: 'Bookings', pitch: 'Sell appointments with time slots and staff calendars.' },
  team: { label: 'Team accounts', pitch: 'Give staff their own logins with limited access.' },
  blog: { label: 'Blog', pitch: 'Publish news and stories that bring visitors from Google.' },
  gift_cards: { label: 'Gift cards & store credit', pitch: 'Sell gift cards and refund as store credit.' },
  loyalty: { label: 'Loyalty rewards', pitch: 'Reward repeat customers with an automatic discount.' },
  sales_channels: { label: 'Sales channels', pitch: 'List your products on Google Shopping, Facebook and Instagram.' },
  pos: { label: 'Point of sale', pitch: 'Sell in person with a till that shares your online stock.' },
}

export const ALL_FEATURES = Object.keys(FEATURES) as Feature[]

export function isFeature(v: unknown): v is Feature {
  return typeof v === 'string' && v in FEATURES
}

/**
 * What a plan unlocks. An admin-set list wins; otherwise a paid plan gets
 * everything and the Free plan gets none of the paid features.
 */
export function featuresForPlan(plan: { isPro: boolean; features?: string[] | null }): Feature[] {
  if (Array.isArray(plan.features)) return plan.features.filter(isFeature)
  return plan.isPro ? [...ALL_FEATURES] : []
}

/** Dashboard pages that are entirely a paid feature. */
export const PATH_FEATURE: [prefix: string, feature: Feature][] = [
  ['/dashboard/analytics', 'analytics'],
  ['/dashboard/customers', 'customers'],
  ['/dashboard/abandoned', 'abandoned_carts'],
  ['/dashboard/inventory', 'inventory_tools'],
  ['/dashboard/bookings', 'bookings'],
  ['/dashboard/team', 'team'],
  ['/dashboard/gift-cards', 'gift_cards'],
  ['/dashboard/channels', 'sales_channels'],
  ['/dashboard/pos', 'pos'],
  ['/dashboard/coupons', 'coupons'],
  ['/dashboard/reels', 'reels'],
]

export function featureForPath(pathname: string): Feature | null {
  for (const [prefix, f] of PATH_FEATURE) if (pathname === prefix || pathname.startsWith(prefix + '/')) return f
  return null
}

/** Free themes: the first design in each category. Everything else is premium. */
export const FREE_THEME_IDS = new Set(['classic', 'quick-bites', 'atelier', 'consult'])
