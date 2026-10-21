// Sample catalogs for theme demo stores (/theme-demo/<themeId>) and the
// studio's "demo content" preview. Photos are Unsplash (already an allowed
// next/image host). Contact numbers are deliberately left empty so demo
// buttons never dial or message a real person.

import type { CategoryTileData } from "@/components/storefront/ThemeSections";
import type { Category, Product, Store } from "@/types";
import { THEMES } from "./catalog";
import type { StorefrontTheme, Testimonial } from "./types";

const U = (id: string, w = 640) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=75`;

type P = [name: string, photo: string, price: number, category: string, blurb: string, compare?: number, hover?: string];

interface DemoSeed {
  name: string;
  description: string;
  banners: string[];
  categories: string[];
  products: P[];
  reviews: [name: string, body: string, product: number][];
}

const ECOMMERCE: DemoSeed = {
  name: "Kora Market",
  description: "Quality gadgets, beauty and lifestyle essentials — delivered across Nigeria with care.",
  banners: ["1441986300917-64674bd600d8", "1607082348824-0a96f2a4b9da", "1472851294608-062f824d29cc"],
  categories: ["Electronics", "Beauty", "Fashion", "Home"],
  products: [
    ["Wireless Noise-Cancelling Headphones", "1505740420928-5e560c06d30e", 45000, "Electronics", "40-hour battery, deep bass and active noise cancelling for calls and commutes.", 55000],
    ["Smart Watch Series 5", "1546868871-7041f2a55e12", 68000, "Electronics", "Heart-rate, sleep and step tracking with a bright always-on display."],
    ["Instant Film Camera", "1526170375885-4d8ecf77b99f", 89000, "Electronics", "Print memories in seconds. Comes with a 10-sheet starter pack."],
    ["Portable Bluetooth Speaker", "1608043152269-423dbba4e7e1", 27000, "Electronics", "Waterproof, 12-hour playtime and room-filling sound.", 32000],
    ["Studio Over-Ear Headphones", "1583394838336-acd977736f90", 52000, "Electronics", "Wired studio reference sound with memory-foam cushions."],
    ["Signature Eau de Parfum", "1585386959984-a4155224a1ad", 38000, "Beauty", "Warm amber and vanilla notes that last all day. 100ml."],
    ["Glow Skincare Set", "1556228578-8c89e6adf883", 24500, "Beauty", "Cleanser, toner and serum for bright, even skin.", 29000],
    ["Everyday Makeup Kit", "1612817288484-6f916006741a", 18000, "Beauty", "Everything you need for a soft everyday beat."],
    ["Classic Analog Watch", "1523275335684-37898b6baf30", 32500, "Fashion", "Minimal dial, genuine leather strap, water resistant."],
    ["Aviator Sunglasses", "1572635196237-14b3f281503f", 15000, "Fashion", "Polarised lenses with UV400 protection."],
    ["Everyday Running Sneakers", "1542291026-7eec264c27ff", 42000, "Fashion", "Lightweight, breathable and cushioned for all-day comfort.", 48000],
    ["Minimal Wooden Stool", "1503602642458-232111445657", 35000, "Home", "Solid hardwood, hand-finished. Doubles as a side table."],
  ],
  reviews: [
    ["Chiamaka O.", "Delivery was fast and the headphones are exactly as described. Packaging was really neat too.", 0],
    ["Tunde A.", "Third order from this store and they've never disappointed. Customer service on WhatsApp is top-notch.", 1],
    ["Aisha B.", "The skincare set has changed my routine. Will definitely be ordering again.", 6],
  ],
};

const FOOD: DemoSeed = {
  name: "Bukka & Co.",
  description: "Burgers, grills, pasta and fresh bowls cooked to order in our Lekki kitchen and delivered hot.",
  banners: ["1504674900247-0877df9cc836", "1555396273-367ea4eb4db5", "1414235077428-338989a2e8c0"],
  categories: ["Burgers", "Grills", "Pizza & Pasta", "Bowls", "Desserts & Drinks"],
  products: [
    ["Classic Beef Burger", "1568901346375-23c9450c58cd", 6500, "Burgers", "Flame-grilled beef patty, cheddar, lettuce, tomato and house sauce."],
    ["Double Cheese Burger", "1550547660-d9450f859349", 8500, "Burgers", "Two smashed patties, double cheese, pickles and caramelised onions.", 9500],
    ["Burger & Fries Combo", "1586190848861-99aa4a171e90", 7500, "Burgers", "Classic burger with crispy fries and a chilled drink."],
    ["Loaded Fries", "1573080496219-bb080dd4f877", 3000, "Burgers", "Crispy fries with cheese sauce, beef bits and spring onion."],
    ["Suya Skewers", "1555939594-58d7cb561ad1", 4500, "Grills", "Spicy beef suya with yaji, onions and tomatoes."],
    ["Grilled Chicken Platter", "1529193591184-b1d58069ecdd", 12000, "Grills", "Half chicken, grilled plantain, coleslaw and pepper sauce."],
    ["Sticky BBQ Ribs", "1544025162-d76694265947", 15000, "Grills", "Slow-cooked pork ribs glazed in our smoky BBQ sauce.", 17000],
    ["Pepperoni Pizza", "1513104890138-7c749659a591", 9000, "Pizza & Pasta", "Stone-baked with mozzarella and spicy pepperoni. 12 inch."],
    ["Margherita Pizza", "1565299624946-b28f40a0ae38", 8000, "Pizza & Pasta", "Tomato, fresh mozzarella and basil. Simple and perfect."],
    ["Creamy Chicken Pasta", "1621996346565-e3dbc646d9a9", 6000, "Pizza & Pasta", "Penne in a creamy garlic sauce with grilled chicken."],
    ["Garden Salad Bowl", "1512621776951-a57141f2eefd", 5000, "Bowls", "Mixed greens, avocado, chickpeas and lemon vinaigrette."],
    ["Power Veggie Bowl", "1546069901-ba9599a7e63c", 5500, "Bowls", "Quinoa, roasted veg, egg and tahini dressing."],
    ["Chocolate Fudge Cake", "1578985545062-69928b1d9587", 4000, "Desserts & Drinks", "Rich, moist and topped with chocolate ganache."],
    ["Berry Smoothie", "1505252585461-04db1eb84625", 3500, "Desserts & Drinks", "Strawberry, banana and yoghurt. No added sugar."],
  ],
  reviews: [
    ["Emeka N.", "The suya was proper — spicy and well done. Arrived hot in under 40 minutes.", 4],
    ["Funmi K.", "Ordered the chicken platter for my family and everyone loved it. Big portions!", 5],
    ["Ibrahim S.", "Best burger on the island, no contest. The double cheese is my weekly treat.", 1],
  ],
};

const FOOD_BAKERY: DemoSeed = {
  name: "Crumbs & Co.",
  description: "Celebration cakes, pastries and sweet treats baked fresh every morning in Ikeja.",
  banners: ["1578985545062-69928b1d9587", "1565958011703-44f9829ba187", "1486427944299-d1955d23e34d"],
  categories: ["Cakes", "Pastries", "Desserts", "Drinks"],
  products: [
    ["Chocolate Fudge Cake", "1578985545062-69928b1d9587", 18000, "Cakes", "Three layers of moist chocolate sponge with silky ganache. Serves 10."],
    ["Berry Celebration Cake", "1565958011703-44f9829ba187", 25000, "Cakes", "Vanilla sponge, fresh berries and whipped cream. Custom message included.", 28000],
    ["Cupcake Box (6)", "1486427944299-d1955d23e34d", 9000, "Cakes", "Six hand-piped cupcakes in assorted flavours."],
    ["Glazed Doughnuts (4)", "1551024601-bec78aea704b", 4500, "Pastries", "Light, fluffy doughnuts with a sweet glaze."],
    ["Fresh-Baked Cookies (10)", "1599487488170-d11ec9c172f0", 5000, "Pastries", "Chewy chocolate-chip cookies, still warm when they leave."],
    ["Buttermilk Pancake Stack", "1567620905732-2d1ec7ab7445", 6000, "Desserts", "Fluffy pancakes with syrup, berries and butter.", 7000],
    ["Yoghurt Parfait", "1488477181946-6428a0291777", 3500, "Desserts", "Greek yoghurt, granola and fresh fruit layers."],
    ["Ice Cream Sundae", "1497034825429-c343d7c6a68f", 4000, "Desserts", "Two scoops, sauce, sprinkles and a wafer."],
    ["Berry Milkshake", "1505252585461-04db1eb84625", 3500, "Drinks", "Thick, creamy and made with real strawberries."],
  ],
  reviews: [
    ["Ifeoma U.", "The berry cake for my daughter's birthday was stunning and tasted even better. Delivered perfectly.", 1],
    ["Segun P.", "Those cookies are dangerous. I order a box every Friday now.", 4],
    ["Amaka J.", "Beautiful packaging, on-time delivery and the cupcakes were so fresh.", 2],
  ],
};

const FOOD_HEALTHY: DemoSeed = {
  name: "Greenleaf Kitchen",
  description: "Fresh bowls, salads, smoothies and calorie-counted meal plans — delivered across Lagos.",
  banners: ["1540189549336-e6e99c3679fe", "1512621776951-a57141f2eefd", "1546069901-ba9599a7e63c"],
  categories: ["Bowls", "Salads", "Breakfast", "Juices & Smoothies"],
  products: [
    ["Power Veggie Bowl", "1546069901-ba9599a7e63c", 5500, "Bowls", "Quinoa, roasted veg, soft egg and tahini. 520 kcal."],
    ["Rainbow Poke Bowl", "1540189549336-e6e99c3679fe", 7500, "Bowls", "Rice, salmon, edamame, avocado and sesame dressing. 610 kcal.", 8500],
    ["Garden Salad Bowl", "1512621776951-a57141f2eefd", 5000, "Salads", "Mixed greens, avocado, chickpeas and lemon vinaigrette. 410 kcal."],
    ["Grilled Chicken Salad", "1504674900247-0877df9cc836", 6500, "Salads", "Grilled chicken breast, leaves and house dressing. 450 kcal."],
    ["Protein Pancakes", "1567620905732-2d1ec7ab7445", 4500, "Breakfast", "Oat and banana pancakes with fresh berries. 380 kcal."],
    ["Granola Parfait", "1488477181946-6428a0291777", 3500, "Breakfast", "Greek yoghurt, homemade granola and fruit. 290 kcal."],
    ["Berry Blast Smoothie", "1505252585461-04db1eb84625", 3500, "Juices & Smoothies", "Strawberry, banana and yoghurt. No added sugar."],
    ["Green Detox Juice", "1610970881699-44a5587cabec", 3000, "Juices & Smoothies", "Cold-pressed cucumber, apple, ginger and spinach."],
  ],
  reviews: [
    ["Yetunde B.", "I've lost 6kg on the 10-day plan and never felt hungry. The bowls are genuinely delicious.", 0],
    ["Chidi O.", "Finally healthy food in Lagos that doesn't taste like punishment. The poke bowl is elite.", 1],
    ["Rukky A.", "Smoothies arrive cold and fresh every morning before work. Love it.", 6],
  ],
};

const CLOTHING: DemoSeed = {
  name: "Maison Adé",
  description: "Modern African fashion — considered pieces designed in Lagos and made to be worn on repeat.",
  banners: ["1469334031218-e382a71b716b", "1441984904996-e0b6ba687e04", "1490481651871-ab68de25d43d"],
  categories: ["Women", "Men", "Shoes", "Bags"],
  products: [
    ["Silk Wrap Dress", "1595777457583-95e059d581b8", 48000, "Women", "Fluid silk-blend wrap dress with a flattering tie waist.", undefined, "1539109136881-3be0616acf4b"],
    ["Linen Co-ord Set", "1515886657613-9f3515b0c78f", 55000, "Women", "Breathable linen shirt and wide-leg trousers.", 62000],
    ["Floral Midi Dress", "1496747611176-843222e1e57c", 39000, "Women", "Lightweight midi with a soft floral print.", undefined, "1485968579580-b6d095142e6e"],
    ["Satin Jogger Trousers", "1594633312681-425c7b97ccd1", 32000, "Women", "Fluid satin joggers that dress up or down."],
    ["Classic White Tee", "1521572163474-6864f9cf17ab", 9500, "Men", "Heavyweight organic cotton. The only white tee you need."],
    ["Graphic Tee", "1503342217505-b0a15ec3261c", 12000, "Men", "Relaxed fit with a screen-printed front graphic."],
    ["Oversized Hoodie", "1556821840-3a63f95609a7", 22000, "Men", "Brushed fleece, dropped shoulders, kangaroo pocket.", 26000],
    ["Leather Biker Jacket", "1551028719-00167b16eac5", 85000, "Men", "Soft genuine leather, asymmetric zip, built to age beautifully."],
    ["Tailored Two-Piece Suit", "1507679799987-c73779587ccf", 120000, "Men", "Slim-fit suit in a breathable wool blend."],
    ["Relaxed Straight Jeans", "1542272604-787c3835535d", 25000, "Men", "Rigid denim with a relaxed straight leg."],
    ["Leather Court Sneakers", "1549298916-b41d501d3772", 45000, "Shoes", "Full-grain leather with a cushioned insole."],
    ["Retro Runner Sneakers", "1600185365483-26d7a4cc7519", 52000, "Shoes", "Suede overlays and a chunky retro sole."],
    ["Structured Leather Handbag", "1584917865442-de89df76afd3", 65000, "Bags", "Top-handle bag with a detachable strap.", 75000],
    ["Everyday Tote", "1548036328-c9fa89d128fa", 28000, "Bags", "Roomy, durable and fits a 14\" laptop."],
  ],
  reviews: [
    ["Ngozi E.", "The silk dress fits like it was made for me. I got so many compliments at the wedding.", 0],
    ["David O.", "Quality is unreal for the price. The hoodie is thick and the fit is perfect.", 6],
    ["Halima Y.", "They helped me pick my size on WhatsApp and the exchange was super easy.", 1],
  ],
};

const SERVICES_BUSINESS: DemoSeed = {
  name: "Northbridge Advisory",
  description: "We help Nigerian SMEs register, plan, stay compliant and grow — with clear pricing and no jargon.",
  banners: ["1552664730-d307ca884978", "1454165804606-c3d57bc86b40", "1556761175-5973dc0f32e7"],
  categories: ["Advisory", "Finance", "Legal"],
  products: [
    ["Business Strategy Session", "1552664730-d307ca884978", 75000, "Advisory", "A 2-hour working session to sharpen your plan, pricing and next 90 days."],
    ["Brand & Marketing Plan", "1561070791-2526d30994b5", 150000, "Advisory", "Positioning, messaging and a 3-month marketing calendar for your business."],
    ["Bookkeeping & Tax Filing", "1454165804606-c3d57bc86b40", 50000, "Finance", "Monthly bookkeeping plus FIRS and state tax filings handled for you."],
    ["Financial Health Review", "1460925895917-afdab827c52f", 120000, "Finance", "A full review of your books with a clear report and action plan."],
    ["Company Registration (CAC)", "1556761175-5973dc0f32e7", 85000, "Legal", "Business name or LTD registration, done end-to-end in 7–10 days."],
    ["Contract Drafting & Review", "1507003211169-0a1dd7228f2d", 60000, "Legal", "Clear, enforceable contracts for clients, staff and suppliers."],
  ],
  reviews: [
    ["Kelechi M.", "They registered my company and set up my books in one go. Clear, professional and fast.", 4],
    ["Bisi A.", "The strategy session paid for itself in a month. We finally have a real plan.", 0],
    ["Musa D.", "No more tax-season panic. Everything is filed and I get a monthly summary.", 2],
  ],
};

const SERVICES_CREATIVE: DemoSeed = {
  name: "Lightroom Studio",
  description: "A Lagos creative studio for portraits, products, weddings and brand identity.",
  banners: ["1492691527719-9d1e07e534b4", "1511578314322-379afb476865", "1519741497674-611481863552"],
  categories: ["Photography", "Events", "Design"],
  products: [
    ["Portrait Session", "1492691527719-9d1e07e534b4", 65000, "Photography", "1-hour studio session, 2 looks and 15 retouched images."],
    ["Product Photography", "1516035069371-29a1b244cc32", 90000, "Photography", "Clean e-commerce shots for up to 20 products, delivered in 3 days."],
    ["Event Coverage", "1511578314322-379afb476865", 250000, "Events", "Up to 6 hours of photo coverage with an online gallery."],
    ["Wedding Package", "1519741497674-611481863552", 650000, "Events", "Full-day photo + film coverage, two shooters and a printed album."],
    ["Brand Identity Design", "1561070791-2526d30994b5", 180000, "Design", "Logo, colour palette, typography and a mini brand guide."],
    ["Camera & Lighting Rental", "1542038784456-1ea8e935640e", 30000, "Photography", "Daily rental of pro bodies, lenses and lighting kits."],
  ],
  reviews: [
    ["Tolu F.", "Our wedding photos are breathtaking. They captured every moment without being in the way.", 3],
    ["Zainab K.", "The product shots doubled our online sales. Quick turnaround and great direction.", 1],
    ["Obinna C.", "Professional from start to finish. The brand identity they built is exactly us.", 4],
  ],
};

const SERVICES_SALON: DemoSeed = {
  name: "Glow House",
  description: "Hair, beauty and wellness in a calm, luxurious space in Victoria Island. Walk-ins welcome.",
  banners: ["1560066984-138dadb4c035", "1521590832167-7bcbfaa6381f", "1544161515-4ab6ce6db874"],
  categories: ["Hair", "Spa", "Beauty"],
  products: [
    ["Silk Press & Style", "1522337360788-8b13dee7a37e", 25000, "Hair", "Wash, deep condition, silk press and style. 2 hours."],
    ["Knotless Braids", "1560066984-138dadb4c035", 45000, "Hair", "Medium knotless braids, waist length. Hair included."],
    ["Classic Cut & Shave", "1503951914875-452162b0f3f1", 8000, "Hair", "Precision haircut, hot-towel shave and beard shape-up."],
    ["Deep Tissue Massage", "1544161515-4ab6ce6db874", 35000, "Spa", "60 minutes of full-body deep tissue therapy."],
    ["Signature Glow Facial", "1570172619644-dfd03ed5d881", 30000, "Spa", "Cleanse, exfoliate, extract and mask for radiant skin."],
    ["Gel Manicure", "1604654894610-df63bc536371", 12000, "Beauty", "Long-lasting gel colour with cuticle care."],
    ["Bridal Makeup", "1487412947147-5cebf100ffc2", 80000, "Beauty", "Trial session plus your wedding-day beat. Lashes included."],
  ],
  reviews: [
    ["Adaeze I.", "My silk press lasted two weeks! The space is so calm and the staff are lovely.", 0],
    ["Kemi L.", "Best massage I've had in Lagos. I've already booked my next one.", 3],
    ["Fatima R.", "They did my bridal makeup and I looked flawless in every single photo.", 6],
  ],
};

function seedFor(theme: StorefrontTheme): DemoSeed {
  if (theme.category === "food") {
    if (theme.id === "sweet-treats") return FOOD_BAKERY;
    if (theme.id === "fresh-bowl") return FOOD_HEALTHY;
    return FOOD;
  }
  if (theme.category === "clothing") return CLOTHING;
  if (theme.category === "services") {
    if (theme.id === "salon") return SERVICES_SALON;
    if (theme.id === "studio") return SERVICES_CREATIVE;
    return SERVICES_BUSINESS;
  }
  return ECOMMERCE;
}

const rotate = <T,>(list: T[], n: number) => list.map((_, i) => list[(i + n) % list.length]);
const themeIndexInCategory = (theme: StorefrontTheme) =>
  Math.max(0, THEMES.filter((t) => t.category === theme.category).findIndex((t) => t.id === theme.id));

const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export interface DemoStore {
  store: Store;
  categories: Category[];
  products: Product[];
  categoryTiles: CategoryTileData[];
  testimonials: Testimonial[];
}

export function getDemoStore(theme: StorefrontTheme): DemoStore {
  const seed = seedFor(theme);
  const storeId = `demo-${theme.id}`;
  const now = Date.now();

  const categories: Category[] = seed.categories.map((name, i) => ({
    id: `${storeId}-cat-${i}`,
    store_id: storeId,
    parent_id: null,
    name,
    slug: slugify(name),
    sort_order: i,
  }));
  const catByName = new Map(categories.map((c) => [c.name, c]));

  const products: Product[] = seed.products.map(([name, photo, price, cat, blurb, compare, hover], i) => {
    const c = catByName.get(cat)!;
    const images = [U(photo), ...(hover ? [U(hover)] : [])];
    return {
      id: `${storeId}-p-${i}`,
      store_id: storeId,
      category_id: c.id,
      name,
      slug: slugify(name),
      price,
      compare_price: compare,
      stock_quantity: 20,
      image_url: images[0],
      images,
      short_description: blurb,
      description: blurb,
      is_active: true,
      has_sizes: false,
      category_name: c.name,
      category_slug: c.slug,
      // Stagger so "new arrivals" has a stable order
      created_at: new Date(now - i * 86_400_000).toISOString(),
    };
  });

  const categoryTiles: CategoryTileData[] = categories.map((c) => {
    const inCat = products.filter((p) => p.category_id === c.id);
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      sort_order: c.sort_order ?? 0,
      cover_image: inCat[0]?.image_url ?? null,
      product_count: inCat.length,
    };
  });

  const store: Store = {
    id: storeId,
    name: seed.name,
    slug: storeId,
    description: seed.description,
    is_active: true,
    // Themes sharing a vertical's sample store each lead with a different photo
    banner_images: rotate(seed.banners, themeIndexInCategory(theme)).map((b) => U(b, 1600)),
    // Every other product, so "Featured" and "New arrivals" don't repeat each other
    featured_product_ids: products.filter((_, i) => i % 2 === 1).slice(0, 6).map((p) => p.id),
  };

  const testimonials: Testimonial[] = seed.reviews.map(([customer_name, body, pi], i) => ({
    id: `${storeId}-r-${i}`,
    customer_name,
    rating: 5,
    body,
    product_name: products[pi]?.name ?? null,
  }));

  return { store, categories, products, categoryTiles, testimonials };
}
