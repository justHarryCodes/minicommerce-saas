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

const STREETWEAR: DemoSeed = {
  name: "Kicks & Co.",
  description: "Authentic sneakers and streetwear, delivered across Nigeria. New drops every week.",
  banners: ["1597045566677-8cf032ed6634", "1552346154-21d32810aba3", "1514989940723-e8e51635b782"],
  categories: ["Sneakers", "Basketball", "Running", "Apparel", "Accessories"],
  products: [
    ["Retro High OG", "1597045566677-8cf032ed6634", 185000, "Basketball", "Premium leather high-top with the classic colour blocking.", 210000],
    ["Retro Low Court", "1552346154-21d32810aba3", 165000, "Basketball", "Low-cut court icon in black, red and white."],
    ["Triple White Low", "1600269452121-4f2416e55c28", 95000, "Sneakers", "Clean all-white leather. Goes with everything."],
    ["Air Cushion Runner", "1600185365483-26d7a4cc7519", 78000, "Running", "Visible cushioning and a soft mesh upper.", 90000],
    ["Volt Trainer", "1606107557195-0e29a4b5b4aa", 72000, "Running", "Bright, light and grippy. Made for the gym and the streets."],
    ["Knit Speed Runner", "1542291026-7eec264c27ff", 68000, "Running", "Sock-like knit upper with a springy sole."],
    ["Canvas Skate Low", "1525966222134-fcfa99b8ae77", 45000, "Sneakers", "Durable canvas skate shoe with the side stripe."],
    ["Heritage 90 Runner", "1514989940723-e8e51635b782", 98000, "Sneakers", "Suede and mesh retro runner in a bold colourway.", 115000],
    ["Workwear Court", "1549298916-b41d501d3772", 110000, "Sneakers", "Rugged canvas court shoe with a gum-coloured sole."],
    ["Street Trainer", "1595341888016-a392ef81b7de", 62000, "Sneakers", "Chunky trainer with layered overlays."],
    ["Phantom Trainer", "1491553895911-0055eca6402d", 88000, "Running", "Sleek black trainer with a sculpted midsole."],
    ["Heavyweight Hoodie", "1556821840-3a63f95609a7", 35000, "Apparel", "450gsm brushed fleece with a relaxed fit.", 42000],
    ["Graphic Tee", "1503342217505-b0a15ec3261c", 15000, "Apparel", "Boxy fit, heavyweight cotton, screen-printed front."],
    ["Rib-Knit Beanie", "1576871337632-b9aef4c17ab9", 9500, "Accessories", "Soft rib knit with a woven label."],
    ["Trucker Cap", "1588850561407-ed78c282e89b", 8500, "Accessories", "Foam front, mesh back, snapback fit."],
  ],
  reviews: [
    ["Chidi A.", "100% authentic, came with the original box and receipt. Delivery to Abuja took two days.", 0],
    ["Tolu B.", "The hoodie is so thick and the fit is perfect. Already ordered a second colour.", 11],
    ["Musa K.", "Sized up on their advice on WhatsApp and the runners fit perfectly.", 3],
  ],
};

const FITNESS: DemoSeed = {
  name: "Peak Athletics",
  description: "Gym equipment, activewear and supplements for every fitness journey. Delivered nationwide.",
  banners: ["1581009146145-b5ef050c2e1e", "1599058917212-d750089bc07e", "1594381898411-846e7d193883"],
  categories: ["Equipment", "Activewear", "Footwear", "Nutrition", "Accessories", "Sports"],
  products: [
    ["Hex Dumbbell Pair (10kg)", "1638536532686-d610adfc8e5c", 38000, "Equipment", "Rubber-coated hex heads that don't roll, with knurled chrome handles.", 45000],
    ["Dumbbell Rack Set", "1576678927484-cc907957088c", 320000, "Equipment", "Ten pairs from 2.5kg to 25kg with a two-tier steel rack."],
    ["Olympic Weight Plates", "1620188467120-5042ed1eb5da", 85000, "Equipment", "Bumper plates with steel inserts. Sold as a 2 x 20kg pair."],
    ["Competition Kettlebell 16kg", "1601422407692-ec4eeec1d9b3", 32000, "Equipment", "Single-cast steel bell with a smooth, wide handle."],
    ["Neoprene Dumbbells (2kg)", "1586401100295-7a8096fd231a", 9500, "Equipment", "Soft-grip pair for toning, pilates and home workouts."],
    ["Resistance Band Kit", "1584735935682-2f2b69dff9d2", 12000, "Accessories", "Five bands, handles, ankle straps and a door anchor.", 15000],
    ["Premium Yoga Mat", "1592432678016-e910b452f9a2", 18000, "Accessories", "6mm non-slip mat with alignment lines and a carry strap."],
    ["Smart Fitness Band", "1575311373937-040b8e1fd5b6", 35000, "Accessories", "Heart rate, steps, sleep and workouts. Seven-day battery."],
    ["Gym Backpack", "1553062407-98eeb64c6a62", 28000, "Accessories", "Shoe compartment, laptop sleeve and water-resistant base."],
    ["Whey Protein Shake (2lb)", "1579722821273-0f6c7d44362f", 42000, "Nutrition", "24g protein per scoop. Strawberry, chocolate or vanilla.", 48000],
    ["Training Sneakers", "1556906781-9a412961c28c", 78000, "Footwear", "Stable heel for lifting, flexible forefoot for cardio.", 92000],
    ["Sculpt Sports Bra", "1594381898411-846e7d193883", 15000, "Activewear", "Medium support, sweat-wicking and squat-proof."],
    ["DryFit Training Tee", "1521572163474-6864f9cf17ab", 12000, "Activewear", "Lightweight, quick-dry fabric that moves with you."],
    ["Match Football", "1614632537190-23e4146777db", 22000, "Sports", "Thermo-bonded panels for a true flight. Size 5.", 26000],
    ["Pro Basketball", "1519861531473-9200262188bf", 25000, "Sports", "Indoor/outdoor composite leather with deep channels."],
  ],
  reviews: [
    ["Ahmed R.", "Fast delivery and the dumbbells are solid. My home workouts are a different level now.", 0],
    ["Sara K.", "Great products and support. The yoga mat grips perfectly, even in a hot room.", 6],
    ["Usman T.", "The protein mixes smooth and tastes great. Already on my second tub.", 9],
  ],
};

const LIFESTYLE: DemoSeed = {
  name: "Nova Trend",
  description: "Trending fashion, tech, beauty and home picks, curated for modern lifestyles.",
  banners: ["1515886657613-9f3515b0c78f", "1503342217505-b0a15ec3261c", "1517841905240-472988babdf9"],
  categories: ["Fashion", "Shoes", "Electronics", "Beauty", "Accessories", "Home"],
  products: [
    ["Essential Hoodie", "1556821840-3a63f95609a7", 28000, "Fashion", "Soft brushed fleece with a relaxed, everyday fit."],
    ["Bomber Jacket", "1591047139829-d91aecb6caea", 45000, "Fashion", "Lightweight satin bomber in a warm rust tone.", 52000],
    ["Logo Tee", "1618354691373-d851c5c3a990", 12000, "Fashion", "Heavyweight cotton tee with a small chest print."],
    ["Knit Poncho", "1434389677669-e08b4cac3105", 22000, "Fashion", "Open-knit cotton poncho with a fringed hem."],
    ["Air Cushion Sneakers", "1600185365483-26d7a4cc7519", 78000, "Shoes", "Visible air cushioning and a breathable upper.", 90000],
    ["Colour Pop Runners", "1560769629-975ec94e6a86", 65000, "Shoes", "Bold colour blocking on a light, springy sole."],
    ["Wireless Headphones", "1505740420928-5e560c06d30e", 39000, "Electronics", "Thirty-hour battery and deep, punchy bass."],
    ["Studio Headphones", "1583394838336-acd977736f90", 55000, "Electronics", "Noise cancelling with plush memory-foam cushions.", 65000],
    ["Smart Watch Series", "1546868871-7041f2a55e12", 120000, "Electronics", "Heart rate, calls and notifications on your wrist.", 140000],
    ["Hydrating Face Cream", "1620916566398-39f1143ab7be", 14000, "Beauty", "Lightweight daily moisturiser with hyaluronic acid."],
    ["Glow Serum", "1608571423902-eed4a5ad8108", 18000, "Beauty", "Vitamin C serum for a brighter, even tone.", 21000],
    ["Self-care Ritual Set", "1612817288484-6f916006741a", 32000, "Beauty", "Cleanser, toner, serum and balm in one gift box."],
    ["Classic Sunglasses", "1572635196237-14b3f281503f", 25000, "Accessories", "Polarised lenses in a timeless square frame.", 30000],
    ["Canvas Day Pack", "1491637639811-60e2756cc1c7", 35000, "Accessories", "Waxed canvas backpack with leather trims."],
    ["Stainless Steel Bottle", "1602143407151-7111542de6e8", 9000, "Accessories", "Keeps drinks cold for 24 hours, hot for 12."],
    ["Velvet Lounge Sofa", "1555041469-a586c61ea9bc", 450000, "Home", "Three-seater in deep green velvet with oak legs."],
  ],
  reviews: [
    ["Amaka O.", "The hoodie is so soft and it arrived in two days. Already eyeing the jacket.", 0],
    ["Daniel E.", "Headphones sound amazing for the price. Packaging was really neat too.", 7],
    ["Zainab M.", "The serum has made such a difference. Will definitely order again.", 10],
  ],
};

const SKINCARE: DemoSeed = {
  name: "Dew Botanics",
  description: "Natural skincare made with botanicals and science. Gentle, dermatologist-tested and cruelty free.",
  banners: ["1531123897727-8f129e1688ce", "1515377905703-c4788e51af15", "1570172619644-dfd03ed5d881"],
  categories: ["Serums", "Moisturisers", "Cleansers", "Toners", "Sun care", "Body", "Sets"],
  products: [
    ["Radiance Boost Serum", "1608571423902-eed4a5ad8108", 18000, "Serums", "Vitamin C and niacinamide for brighter, even-toned skin.", 21000],
    ["Botanical Face Oil", "1617897903246-719242758050", 22000, "Serums", "Rosehip, jojoba and squalane to nourish dry skin overnight."],
    ["Hyaluronic Hydra Serum", "1576426863848-c21f53c60b19", 16000, "Serums", "Multi-weight hyaluronic acid for plump, dewy skin."],
    ["Hydra Glow Gel Cream", "1619451334792-150fd785ee74", 19000, "Moisturisers", "Weightless gel moisturiser with aloe and green tea."],
    ["Nourishing Night Cream", "1601049541289-9b1b7bbbfe19", 24000, "Moisturisers", "Rich, restorative cream with ceramides and peptides.", 28000],
    ["Green Tea Moisturiser", "1552046122-03184de85e08", 17000, "Moisturisers", "Balancing daily cream for combination skin."],
    ["Gentle Foam Cleanser", "1620916566398-39f1143ab7be", 9500, "Cleansers", "Low-pH foam that cleans without stripping."],
    ["Clarifying Clay Mask", "1608248543803-ba4f8c70ae0b", 12000, "Cleansers", "Kaolin and charcoal to draw out impurities."],
    ["Balancing Toner Trio", "1631729371254-42c2892f0e6e", 15000, "Toners", "Hydrating, exfoliating and soothing toners for every step."],
    ["Daily UV Defence SPF 50", "1615397349754-cfa2066a298e", 14000, "Sun care", "Invisible, no white cast. Made for melanin-rich skin.", 16500],
    ["Shea Lip & Body Balm", "1599305090598-fe179d501227", 7500, "Body", "Unrefined Ghanaian shea with a hint of vanilla."],
    ["Apothecary Jar Trio", "1611930022073-b7a4ba5fcccd", 21000, "Body", "Body butter, scrub and oil in amber glass jars."],
    ["Botanical Soap Bar", "1590439471364-192aa70c0b53", 4500, "Body", "Cold-process soap with oats and lavender."],
    ["Glow Essentials Set", "1629198688000-71f23e745b6e", 45000, "Sets", "Cleanser, serum, moisturiser and SPF: a complete routine.", 52000],
    ["Ritual Gift Box", "1612817288484-6f916006741a", 38000, "Sets", "Our best sellers in a keepsake gift box."],
  ],
  reviews: [
    ["Adaeze N.", "My skin has never felt this soft. The serum has faded my dark spots in a month.", 0],
    ["Halima S.", "Finally a sunscreen with no white cast! I wear it every single day.", 9],
    ["Temi A.", "The night cream is pure luxury. Gentle on my sensitive skin.", 4],
  ],
};

const GADGETS_POP: DemoSeed = {
  name: "Prism Tech",
  description: "Headphones, wearables, consoles and everyday tech. Original, under warranty and delivered fast.",
  banners: ["1618366712010-f4ae9c647dcb", "1621259182978-fbf93132d53d", "1622979135225-d2ba269cf1ac"],
  categories: ["Audio", "Wearables", "Laptops", "Gaming", "VR", "Speakers", "Phones", "Cameras"],
  products: [
    ["Noise Cancelling Headphones", "1618366712010-f4ae9c647dcb", 185000, "Audio", "Industry-leading noise cancelling with 30-hour battery and quick charge.", 210000],
    ["Studio Headphones", "1505740420928-5e560c06d30e", 62000, "Audio", "Punchy bass and soft cushions for long listening sessions."],
    ["Pro Wireless Earbuds", "1572569511254-d8f925fe2cbb", 145000, "Audio", "Active noise cancelling with spatial audio and a wireless case."],
    ["Sport Earbuds", "1606220945770-b5b6c2c55bf1", 38000, "Audio", "Sweat-proof fit with 24 hours of playtime.", 45000],
    ["Smart Watch Series 9", "1579586337278-3befd40fd17a", 320000, "Wearables", "Bright always-on display, health sensors and calls."],
    ["Fitness Watch", "1546868871-7041f2a55e12", 95000, "Wearables", "Heart rate, sleep and workouts with a week-long battery.", 110000],
    ["Pro Laptop 14\"", "1517336714731-489689fd1ca8", 1650000, "Laptops", "Pro chip, Liquid Retina display and 18-hour battery."],
    ["Everyday Laptop 13\"", "1496181133206-80ce9b88a853", 690000, "Laptops", "Thin, light and quiet for work and school."],
    ["Next-gen Console", "1607853202273-797f1c22a38e", 780000, "Gaming", "4K gaming at up to 120fps with an ultra-fast SSD.", 850000],
    ["Series X Console", "1621259182978-fbf93132d53d", 720000, "Gaming", "The most powerful console, with a controller included."],
    ["Wireless Controller", "1592840496694-26d035b52b48", 65000, "Gaming", "Haptic feedback and adaptive triggers."],
    ["VR Headset 128GB", "1622979135225-d2ba269cf1ac", 420000, "VR", "All-in-one virtual reality. No PC or wires needed.", 480000],
    ["Portable Speaker", "1608043152269-423dbba4e7e1", 85000, "Speakers", "Waterproof, rugged and loud, with 20-hour battery."],
    ["Party Light Speaker", "1589003077984-894e133dabab", 120000, "Speakers", "360° sound with a light show that moves to the beat."],
    ["Flagship Phone 256GB", "1592750475338-74b7b21085ab", 1250000, "Phones", "Pro camera system, titanium design, all-day battery."],
    ["Android Flagship 256GB", "1610945265064-0e34e5519bbf", 980000, "Phones", "120Hz display, 50MP camera and fast charging.", 1050000],
    ["Instant Camera", "1526170375885-4d8ecf77b99f", 98000, "Cameras", "Point, shoot and print in seconds. Film sold separately."],
  ],
  reviews: [
    ["Kunle B.", "The headphones are unreal. Sealed, original and delivered the same day.", 0],
    ["Ifeoma C.", "Got the console for my son's birthday. He has not put it down since!", 8],
    ["Bayo T.", "Watch arrived in perfect condition and they helped me set it up on WhatsApp.", 4],
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

const PERFUME: DemoSeed = {
  name: "Maison Ọ̀rí",
  description: "Original designer and niche fragrances, oud and body mists — authentic, sealed and delivered across Nigeria.",
  banners: ["1541643600914-78b084683601", "1592945403244-b3fbafd7f539", "1594035910387-fea47794261f"],
  categories: ["For Her", "For Him", "Oud & Oils", "Gift Sets"],
  products: [
    ["Velvet Rose Eau de Parfum", "1541643600914-78b084683601", 65000, "For Her", "Damask rose, pink pepper and soft musk. 100ml.", 72000],
    ["Amber Nights", "1592945403244-b3fbafd7f539", 58000, "For Her", "Warm amber, vanilla and sandalwood — made for evenings out."],
    ["Bloom Body Mist", "1588405748880-12d1d2a59f75", 9500, "For Her", "Light floral mist for everyday freshness. 250ml."],
    ["Noir Intense", "1594035910387-fea47794261f", 72000, "For Him", "Leather, tobacco and black pepper. Long-lasting and bold.", 80000],
    ["Citrus Cologne", "1523293182086-7651a899d37f", 38000, "For Him", "Bergamot, neroli and vetiver — crisp and clean for the office."],
    ["Aqua Sport", "1587017539504-67cfbddac569", 32000, "For Him", "Fresh marine notes for gym, travel and hot days."],
    ["Royal Oud Oil", "1608528577891-eb055944f2e7", 25000, "Oud & Oils", "Concentrated oud oil, alcohol-free. A few drops last all day."],
    ["Bakhoor Incense Set", "1585386959984-a4155224a1ad", 18000, "Oud & Oils", "Scented bakhoor with a burner for the home."],
    ["Signature Discovery Set", "1592945403244-b3fbafd7f539", 30000, "Gift Sets", "Five 10ml bestsellers in a keepsake box.", 36000],
    ["Couple's Gift Box", "1541643600914-78b084683601", 120000, "Gift Sets", "His-and-hers fragrances, gift-wrapped with a card."],
  ],
  reviews: [
    ["Ifeoma K.", "100% original — the Velvet Rose lasts all day and I get compliments everywhere.", 0],
    ["Segun B.", "Noir Intense is my new signature. Delivery was quick and the packaging was beautiful.", 3],
    ["Hauwa M.", "The oud oil is rich and long-lasting. Will definitely restock.", 6],
  ],
};

const MARKET: DemoSeed = {
  name: "Mama Nkechi's Market",
  description: "Fresh foodstuff, pepper, grains and provisions from the market to your kitchen — same-day delivery.",
  banners: ["1542838132-92c53300491e", "1488459716781-31db52582fe9", "1543168256-418811576931"],
  categories: ["Grains & Rice", "Fresh Produce", "Provisions", "Bulk Deals"],
  products: [
    ["Local Rice (10kg)", "1586201375761-83865001e31c", 18500, "Grains & Rice", "Stone-free, parboiled local rice. Cooks soft and fluffy.", 20000],
    ["Honey Beans (5kg)", "1574323347407-f5e1ad6d020b", 9000, "Grains & Rice", "Sweet oloyin beans, handpicked and clean."],
    ["Garri Ijebu (5kg)", "1550989460-0adf9ea622e2", 5500, "Grains & Rice", "Crisp, sour Ijebu garri — perfect for soaking."],
    ["Fresh Tomatoes (basket)", "1506484381205-f7945653044d", 12000, "Fresh Produce", "Firm, ripe tomatoes straight from the market.", 14000],
    ["Mixed Peppers (paint)", "1488459716781-31db52582fe9", 4500, "Fresh Produce", "Tatashe, rodo and shombo for your stews."],
    ["Fresh Vegetables Bundle", "1543168256-418811576931", 6000, "Fresh Produce", "Ugu, efo and spinach — washed and bundled."],
    ["Groundnut Oil (5L)", "1610348725531-843dff563e2c", 11000, "Provisions", "Pure, filtered groundnut oil for cooking and frying."],
    ["Seasoning & Spice Pack", "1597362925123-77861d3fbac7", 3500, "Provisions", "Curry, thyme, crayfish and stock cubes in one pack."],
    ["Family Provisions Box", "1542838132-92c53300491e", 25000, "Provisions", "Milk, tea, sugar, noodles and cereal for the month."],
    ["Rice Bag (50kg)", "1586201375761-83865001e31c", 82000, "Bulk Deals", "Full bag for families, parties and caterers.", 88000],
    ["Yam Tubers (10 pcs)", "1518977676601-b53f82aba655", 30000, "Bulk Deals", "Big, healthy Abuja yams — great for parties."],
  ],
  reviews: [
    ["Chioma A.", "Everything was fresh and well packed. Saved me a whole Saturday at the market!", 3],
    ["Bola T.", "The rice is stone-free like they promised. Delivery same day.", 0],
    ["Aminu S.", "Ordered the bulk rice for my shop — good price and quick delivery.", 9],
  ],
};

const GADGETS: DemoSeed = {
  name: "Volt Gadgets",
  description: "Original phones, laptops, audio and accessories with warranty — delivered same day in Lagos.",
  banners: ["1511707171634-5f897ff02aa9", "1496181133206-80ce9b88a853", "1593642632559-0c6d3fc62b89"],
  categories: ["Phones", "Laptops", "Audio", "Accessories"],
  products: [
    ["Flagship Smartphone 256GB", "1511707171634-5f897ff02aa9", 650000, "Phones", "6.7\" OLED display, triple camera and all-day battery.", 720000],
    ["Mid-range Smartphone 128GB", "1546054454-aa26e2b734c7", 215000, "Phones", "Big screen, 5000mAh battery and a great camera for the price."],
    ["Ultrabook 14\" (16GB RAM)", "1496181133206-80ce9b88a853", 890000, "Laptops", "Light, fast and quiet — 512GB SSD and a 12-hour battery."],
    ["Pro Laptop 16\"", "1517336714731-489689fd1ca8", 1850000, "Laptops", "For creators: powerful chip, stunning display, 1TB storage.", 1990000],
    ["Work Laptop 15\"", "1593642632559-0c6d3fc62b89", 520000, "Laptops", "Reliable everyday laptop for office and school."],
    ["Wireless Earbuds", "1606220945770-b5b6c2c55bf1", 45000, "Audio", "Noise cancelling, 30-hour battery with case.", 52000],
    ["Over-Ear Headphones", "1505740420928-5e560c06d30e", 62000, "Audio", "Deep bass, plush cushions and 40-hour battery."],
    ["Bluetooth Speaker", "1608043152269-423dbba4e7e1", 27000, "Audio", "Waterproof, room-filling sound, 12-hour playtime."],
    ["Smart Watch", "1546868871-7041f2a55e12", 68000, "Accessories", "Health tracking, notifications and a bright display."],
    ["Wireless Mouse", "1527864550417-7fd91fc51a46", 12000, "Accessories", "Silent clicks, ergonomic grip, USB-C charging."],
    ["Mechanical Keyboard", "1585060544812-6b45742d762f", 38000, "Accessories", "Tactile switches with backlight — for work and play."],
  ],
  reviews: [
    ["Tobi O.", "Phone was brand new and sealed, with a receipt and warranty. Delivered in 3 hours.", 0],
    ["Grace E.", "Laptop is super fast and the battery really lasts all day.", 2],
    ["Ahmed L.", "The earbuds sound amazing for the price. Great customer service too.", 5],
  ],
};

const HAIR: DemoSeed = {
  name: "Crown & Co. Hair",
  description: "100% human hair wigs, bundles, closures and hair care — luxury quality, delivered nationwide.",
  banners: ["1519699047748-de8e457a634e", "1580618672591-eb180b1a973f", "1562322140-8baeececf3df"],
  categories: ["Wigs", "Bundles", "Closures & Frontals", "Hair Care"],
  products: [
    ["Bone Straight Wig 24\"", "1519699047748-de8e457a634e", 185000, "Wigs", "13x4 HD lace, 200% density, pre-plucked hairline.", 210000],
    ["Body Wave Wig 20\"", "1580618672591-eb180b1a973f", 145000, "Wigs", "Soft, bouncy body wave on a glueless cap."],
    ["Pixie Curl Wig", "1595476108010-b4d1f102b1b1", 85000, "Wigs", "Short, sassy and ready to wear in minutes."],
    ["Straight Bundles (3 pcs)", "1605497788044-5a32c7078486", 120000, "Bundles", "Double-drawn, minimal shedding. 18/20/22\".", 135000],
    ["Deep Wave Bundles (3 pcs)", "1634449571010-02389ed0f9b0", 135000, "Bundles", "Defined curls that last wash after wash."],
    ["HD Lace Closure 5x5", "1626954079979-ec4f7b05e032", 55000, "Closures & Frontals", "Melts into every skin tone. Pre-plucked."],
    ["13x6 Frontal", "1562322140-8baeececf3df", 75000, "Closures & Frontals", "Ear-to-ear frontal for a natural hairline."],
    ["Silk Press Treatment Kit", "1522337360788-8b13dee7a37e", 18000, "Hair Care", "Heat protectant, serum and wrap strips."],
    ["Growth Oil", "1560066984-138dadb4c035", 9500, "Hair Care", "Rosemary and castor blend for edges and scalp."],
  ],
  reviews: [
    ["Amaka N.", "The bone straight is so silky and the lace melted perfectly. Worth every naira!", 0],
    ["Ruth A.", "Bundles came full and soft, no shedding after three washes.", 3],
    ["Zainab O.", "Ordered on Monday, got it Tuesday. The frontal is everything.", 6],
  ],
};

const INTERIOR: DemoSeed = {
  name: "Studio Ìlé Interiors",
  description: "Curated furniture, decor and interior styling for homes and offices in Lagos and Abuja.",
  banners: ["1586023492125-27b2c045efd7", "1618221195710-dd6b41faaea6", "1616486338812-3dadae4b4ace"],
  categories: ["Living Room", "Bedroom", "Decor", "Design Services"],
  products: [
    ["Bouclé Three-Seater Sofa", "1555041469-a586c61ea9bc", 950000, "Living Room", "Deep seats, oak legs and a soft bouclé finish.", 1050000],
    ["Marble Coffee Table", "1600210492486-724fe5c67fb0", 320000, "Living Room", "Solid marble top on a brushed brass base."],
    ["Accent Lounge Chair", "1567538096630-e0c55bd6374c", 280000, "Living Room", "Sculpted chair for reading corners."],
    ["Upholstered Bed Frame", "1616486338812-3dadae4b4ace", 680000, "Bedroom", "King size, padded headboard in linen."],
    ["Bedside Table Lamp", "1513694203232-719a280e022f", 45000, "Bedroom", "Warm, dimmable light with a linen shade."],
    ["Ceramic Vase Set", "1493663284031-b7e3aefcae8e", 38000, "Decor", "Three handmade vases in earthy tones.", 45000],
    ["Wooden Side Stool", "1503602642458-232111445657", 35000, "Decor", "Solid hardwood stool that doubles as a side table."],
    ["Room Styling Consultation", "1586023492125-27b2c045efd7", 150000, "Design Services", "On-site visit, mood board and shopping list for one room."],
    ["Full Home Design Package", "1618221195710-dd6b41faaea6", 1500000, "Design Services", "Concept, 3D renders, sourcing and installation."],
  ],
  reviews: [
    ["Funke D.", "They transformed our living room in two weeks. It finally feels like us.", 7],
    ["Emeka U.", "The sofa is even better in person — solid build and so comfortable.", 0],
    ["Lara K.", "Loved the vases and the delivery team placed everything for me.", 5],
  ],
};

function seedFor(theme: StorefrontTheme): DemoSeed {
  if (theme.id === "prism") return GADGETS_POP;
  switch (theme.category) {
    case "perfume": return PERFUME;
    case "market": return MARKET;
    case "gadgets": return GADGETS;
    case "hair": return HAIR;
    case "interior": return INTERIOR;
  }
  if (theme.category === "food") {
    if (theme.id === "sweet-treats") return FOOD_BAKERY;
    if (theme.id === "fresh-bowl") return FOOD_HEALTHY;
    return FOOD;
  }
  if (theme.category === "clothing") return theme.id === "stride" ? STREETWEAR : CLOTHING;
  if (theme.category === "services") {
    if (theme.id === "salon") return SERVICES_SALON;
    if (theme.id === "studio") return SERVICES_CREATIVE;
    return SERVICES_BUSINESS;
  }
  if (theme.id === "pulse") return FITNESS;
  if (theme.id === "nova") return LIFESTYLE;
  if (theme.id === "dew") return SKINCARE;
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
