// Photography and sample products for the landing page's screens.
// Unsplash resizes by URL (see lib/image-loader.ts), so one id serves every size.

const U = (id: string, w = 800, h = 800) =>
  `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&q=75`;

export const PHOTO = {
  founder: U("photo-1611432579699-484f7990b127", 900, 1100),
  boutique: U("photo-1567401893414-76b7b1e5a7a5", 900, 1100),
  team: U("photo-1542744173-8e7e53415bb0", 900, 1100),
  maker: U("photo-1522529599102-193c0d76b5b6", 800, 1000),
  rack: U("photo-1490481651871-ab68de25d43d", 800, 1000),
};

export type SampleProduct = { name: string; price: number; was?: number; img: string };

export const PRODUCTS: SampleProduct[] = [
  { name: "Red top-handle bag", price: 38500, was: 45000, img: U("photo-1584917865442-de89df76afd3", 500, 500) },
  { name: "Glow makeup kit", price: 18500, img: U("photo-1596462502278-27bfdc403348", 500, 500) },
  { name: "Studio headphones", price: 54000, img: U("photo-1505740420928-5e560c06d30e", 500, 500) },
  { name: "Bomber jacket", price: 26000, was: 32000, img: U("photo-1591047139829-d91aecb6caea", 500, 500) },
  { name: "Vitamin C serum", price: 9800, img: U("photo-1608571423902-eed4a5ad8108", 500, 500) },
  { name: "Minimal smartwatch", price: 45000, img: U("photo-1523275335684-37898b6baf30", 500, 500) },
];

export const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;
