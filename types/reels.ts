export interface Reel {
  id: string;
  title: string | null;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  is_active: boolean;
  cloudinary_public_id: string;
  created_at: string;
  products: ReelProduct[];
}

export interface ReelProduct {
  product_id: string;
  name: string;
  price: number;
  image_url: string | null;
  slug: string;
  stock_quantity: number;
}

export interface UploadSignature {
  signature: string;
  timestamp: number;
  folder: string;
  apiKey: string;
  cloudName: string;
  storeId: string;
}
