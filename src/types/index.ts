// ═══════════════════════════════════════════
// Global TypeScript Types
// Storefront components receive raw DB rows (snake_case).
// Dashboard components receive toCamel'd rows (camelCase).
// Both sets of field names are typed as optional to allow both usage patterns.
// ═══════════════════════════════════════════

export interface Store {
  id: string
  // camelCase (from toCamel / dashboard)
  ownerId?: string
  userId?: string
  name: string
  slug: string
  description?: string
  logoUrl?: string
  logo_url?: string   // raw DB (storefront)
  phone?: string
  whatsapp?: string
  primaryCategory?: string
  primary_category?: string
  // Theme — camelCase
  themeMode?: 'light' | 'dark' | 'both'
  accentColor?: string
  storefrontThemeMode?: 'light' | 'dark' | 'both'
  storefrontAccentColor?: string
  // Theme — snake_case (raw DB / storefront)
  theme_mode?: 'light' | 'dark' | 'both'
  accent_color?: string
  storefront_theme_mode?: 'light' | 'dark' | 'both'
  storefront_accent_color?: string
  // Payment — camelCase
  paymentPreference?: 'paystack' | 'bank_transfer' | 'both'
  paymentMethods?: ('paystack' | 'transfer')[]
  bankName?: string
  accountNumber?: string
  accountName?: string
  bankAccountNumber?: string
  bankAccountName?: string
  paystackPublicKey?: string
  // Payment — snake_case (raw DB / storefront)
  payment_preference?: 'paystack' | 'bank_transfer' | 'both'
  bank_name?: string
  bank_account_number?: string
  bank_account_name?: string
  paystack_public_key?: string
  isActive?: boolean
  is_active?: boolean
  createdAt?: string
  created_at?: string
  updatedAt?: string
  updated_at?: string
  // NIN verification
  nin_verified?: boolean
  ninVerified?: boolean
  nin_number?: string
  ninNumber?: string
  // Storefront customisation
  banner_images?: string[]
  bannerImages?: string[]
  featured_product_ids?: string[]
  featuredProductIds?: string[]
  // Return policy
  return_policy?: string
  returnPolicy?: string
  // Referral
  referral_code?: string
  referralCode?: string
  referral_credits?: number
  referralCredits?: number
}

export interface Category {
  id: string
  storeId?: string
  store_id?: string
  parentId?: string | null
  parent_id?: string | null
  name: string
  slug: string
  sortOrder?: number
  sort_order?: number
  subcategories?: Category[]
  createdAt?: string
  created_at?: string
}

export interface Product {
  id: string
  storeId?: string
  store_id?: string
  categoryId?: string
  category_id?: string
  subcategoryId?: string
  subcategory_id?: string
  name: string
  slug: string
  description?: string
  shortDescription?: string
  short_description?: string
  price: number
  comparePrice?: number
  compare_price?: number
  stockQuantity?: number
  stock_quantity?: number
  imageUrl?: string
  image_url?: string
  images?: string[]
  isActive?: boolean
  is_active?: boolean
  isFeatured?: boolean
  is_featured?: boolean
  sortOrder?: number
  sort_order?: number
  // Joined fields
  category_name?: string
  category_slug?: string
  createdAt?: string
  created_at?: string
  updatedAt?: string
  updated_at?: string
}

export interface OrderItem {
  id: string
  orderId?: string
  order_id?: string
  productId?: string
  product_id?: string
  productName?: string
  product_name?: string
  productImage?: string
  product_image?: string
  price: number
  quantity: number
  subtotal: number
}

export interface Order {
  id: string
  storeId?: string
  store_id?: string
  orderNumber?: string
  order_number?: string
  customerName?: string
  customer_name?: string
  customerEmail?: string
  customer_email?: string
  customerPhone?: string
  customer_phone?: string
  deliveryAddress?: string
  delivery_address?: string
  deliveryCity?: string
  delivery_city?: string
  deliveryState?: string
  delivery_state?: string
  deliveryNote?: string
  delivery_note?: string
  subtotal?: number
  deliveryFee?: number
  delivery_fee?: number
  totalAmount?: number
  total_amount?: number
  total?: number
  paymentMethod?: string
  payment_method?: string
  paymentStatus?: string
  payment_status?: string
  paymentReference?: string
  payment_reference?: string
  orderStatus?: string
  order_status?: string
  notes?: string
  items?: OrderItem[]
  createdAt?: string
  created_at?: string
  updatedAt?: string
  updated_at?: string
}

// Cart (client-side only)
export interface CartItem {
  product_id: string
  name: string
  price: number
  image_url?: string
  stock_quantity: number
  quantity: number
}

// API responses
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export const PRIMARY_CATEGORIES = [
  'Fashion and Clothing',
  'Shoes and Sneakers',
  'Bags and Accessories',
  'Beauty and Makeup',
  'Hair and Wigs',
  'Food and Catering',
  'Electronics and Gadgets',
  'Phones and Accessories',
  'Laptops and Computing',
  'Furniture and Home',
  'Artwork and Paintings',
  'Jewelry and Watches',
  'Books and Stationery',
  'Other',
] as const

export type PrimaryCategory = typeof PRIMARY_CATEGORIES[number]

export interface SessionUser {
  firebaseUid: string
  email: string
  displayName?: string
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
export type PaymentStatus = 'pending' | 'pending_confirmation' | 'paid' | 'failed' | 'refunded'

