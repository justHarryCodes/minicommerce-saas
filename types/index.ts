export interface Category {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  sortOrder: number;
  subcategories: Category[];
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  isActive: boolean;
  subscriptionStatus: string;
  subscriptionExpiresAt: string | null;
  accentColor: string | null;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  comparePrice: number | null;
  stockQuantity: number;
  imageUrl: string | null;
  images: string[];
  isActive: boolean;
  isFeatured: boolean;
  categoryId: string | null;
  subcategoryId: string | null;
  categoryName: string | null;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  imageUrl: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  deliveryAddress: string;
  deliveryCity: string | null;
  deliveryState: string | null;
  deliveryNote: string | null;
  paymentMethod: 'paystack' | 'bank_transfer';
  paymentStatus: string;
  orderStatus: string;
  totalAmount: number;
  discountAmount: number;
  couponCode: string | null;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  totalProducts: number;
  recentOrders: Order[];
  todayOrders: number;
  todayRevenue: number;
}
