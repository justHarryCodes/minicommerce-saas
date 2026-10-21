// Role → permission table, shared by server checks and the client nav.
// Anything not listed here is owner-only (settings & bank details, billing,
// team, domain, themes, store page, coupons, reels, reviews, referral,
// sales channels, export, account deletion).

export type Role = 'owner' | 'manager' | 'staff'

export type Permission =
  | 'overview'
  | 'orders'
  | 'bookings'
  | 'pos'
  | 'inventory'
  | 'products'
  | 'customers'
  | 'analytics'
  | 'abandoned'
  | 'giftcards'
  | 'pages'
  | 'owner'

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  owner: [
    'overview', 'orders', 'bookings', 'pos', 'inventory', 'products',
    'customers', 'analytics', 'abandoned', 'giftcards', 'pages', 'owner',
  ],
  manager: [
    'overview', 'orders', 'bookings', 'pos', 'inventory', 'products',
    'customers', 'analytics', 'abandoned', 'giftcards', 'pages',
  ],
  staff: ['orders', 'bookings', 'pos', 'inventory'],
}

export const ROLE_LABEL: Record<Role, string> = {
  owner: 'Owner',
  manager: 'Manager',
  staff: 'Staff',
}

export const ROLE_DESCRIPTION: Record<Exclude<Role, 'owner'>, string> = {
  manager: 'Orders, bookings, POS, products, inventory, customers, analytics, gift cards and pages. No settings, payouts or billing.',
  staff: 'Orders, bookings and POS, and can view stock. Nothing else.',
}

export function can(role: Role, perm: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(perm)
}

/** Which dashboard paths a role may open (the layout & nav both use this). */
const PATH_PERMISSION: [prefix: string, perm: Permission][] = [
  ['/dashboard/orders', 'orders'],
  ['/dashboard/bookings', 'bookings'],
  ['/dashboard/pos', 'pos'],
  ['/dashboard/inventory', 'inventory'],
  ['/dashboard/products', 'products'],
  ['/dashboard/categories', 'products'],
  ['/dashboard/customers', 'customers'],
  ['/dashboard/analytics', 'analytics'],
  ['/dashboard/abandoned', 'abandoned'],
  ['/dashboard/gift-cards', 'giftcards'],
  ['/dashboard/pages', 'pages'],
]

export function permissionForPath(pathname: string): Permission {
  if (pathname === '/dashboard' || pathname === '/dashboard/') return 'overview'
  for (const [prefix, perm] of PATH_PERMISSION) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) return perm
  }
  return 'owner'
}

export function allowedPath(role: Role, pathname: string): boolean {
  return can(role, permissionForPath(pathname))
}
