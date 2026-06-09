export interface DiscoverProduct {
  product_id: string;
  name: string;
  price: number;
  image_url: string | null;
  slug: string;
  stock_quantity: number;
}

// Shape returned by /api/discover/products and /api/mobile/discover?type=products
export interface MarketProduct {
  product_id: string;
  product_name: string;
  product_slug: string;
  price: number;
  compare_price: number | null;
  image_url: string | null;
  category_name: string | null;
  store_id: string;
  store_name: string;
  store_slug: string;
  store_logo: string | null;
  store_category: string | null;
}

export interface DiscoverReel {
  id: string;
  store_id: string;
  title: string | null;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  cloudinary_public_id: string | null;
  duration_seconds: number | null;
  view_count: number;
  is_featured: boolean;
  created_at: string;
  store_name: string;
  store_slug: string;
  store_logo: string | null;
  products: DiscoverProduct[];
}

export interface DiscoverVendor {
  store_id: string;
  store_name: string;
  store_slug: string;
  store_logo: string | null;
  category: string;
  total_views: number;
  product_count: number;
}

export interface DiscoverStore {
  store_id: string;
  store_name: string;
  store_slug: string;
  store_logo: string | null;
  category: string;
  description: string | null;
  total_views: number;
  product_count: number;
  products: DiscoverProduct[];
}
