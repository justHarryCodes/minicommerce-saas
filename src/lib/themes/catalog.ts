import type { StorefrontTheme, ThemeCategory, ThemeCopy } from "./types";

// ── Shared copy per vertical ────────────────────────────────────────────────
// Themes spread these and override a few lines so each one has its own voice
// while the vertical-specific wording (Add / Add to bag / Book now) stays put.

const ECOMMERCE_COPY: ThemeCopy = {
  heroEyebrow: "",
  heroTitle: "",
  heroSubtitle: "",
  heroCta: "Shop now",
  addToCart: "Add to cart",
  categoriesTitle: "Shop by category",
  featuredTitle: "Featured",
  newArrivalsTitle: "New arrivals",
  allProductsTitle: "All products",
  promoEyebrow: "Limited offer",
  promoTitle: "Deals worth shouting about",
  promoText: "Fresh discounts every week on the things you love. Grab them before they're gone.",
  promoCta: "Shop the deals",
  testimonialsTitle: "What customers say",
  ctaTitle: "Questions before you buy?",
  ctaText: "Chat with us on WhatsApp — we usually reply within minutes.",
  announcement: "",
  highlights: [
    { icon: "truck", title: "Nationwide delivery", text: "Lagos in 24–48h, other states in 3–5 days" },
    { icon: "shield", title: "Secure payment", text: "Pay with card, transfer or USSD" },
    { icon: "refresh", title: "Easy returns", text: "Hassle-free within 7 days" },
  ],
};

const FOOD_COPY: ThemeCopy = {
  heroEyebrow: "Now delivering",
  heroTitle: "",
  heroSubtitle: "",
  heroCta: "Order now",
  addToCart: "Add",
  categoriesTitle: "Menu",
  featuredTitle: "Chef's picks",
  newArrivalsTitle: "New on the menu",
  allProductsTitle: "Full menu",
  promoEyebrow: "Combo deals",
  promoTitle: "Feed the whole squad",
  promoText: "Party packs and family combos for birthdays, office lunches and lazy Sundays.",
  promoCta: "See combos",
  testimonialsTitle: "Loved by our customers",
  ctaTitle: "Hungry? Order on WhatsApp",
  ctaText: "Tell us what you want and where you are — we'll handle the rest.",
  announcement: "",
  highlights: [
    { icon: "clock", title: "30–45 min delivery", text: "Hot and fresh to your door" },
    { icon: "flame", title: "Cooked to order", text: "Nothing sits waiting under a lamp" },
    { icon: "shield", title: "Pay your way", text: "Online, transfer or on delivery" },
  ],
};

const CLOTHING_COPY: ThemeCopy = {
  heroEyebrow: "New season",
  heroTitle: "",
  heroSubtitle: "",
  heroCta: "Shop the collection",
  addToCart: "Add to bag",
  categoriesTitle: "Collections",
  featuredTitle: "Editor's picks",
  newArrivalsTitle: "Just dropped",
  allProductsTitle: "All pieces",
  promoEyebrow: "The edit",
  promoTitle: "Pieces made to be worn on repeat",
  promoText: "Considered essentials and statement looks, cut from fabrics that last.",
  promoCta: "Explore the edit",
  testimonialsTitle: "Worn & loved",
  ctaTitle: "Need help with sizing?",
  ctaText: "Send us your measurements on WhatsApp and we'll find your perfect fit.",
  announcement: "",
  highlights: [
    { icon: "truck", title: "Fast delivery", text: "Nationwide, tracked to your door" },
    { icon: "refresh", title: "Easy exchanges", text: "Wrong size? Swap within 7 days" },
    { icon: "sparkles", title: "Quality checked", text: "Every piece inspected before it ships" },
  ],
};

const SERVICES_COPY: ThemeCopy = {
  heroEyebrow: "",
  heroTitle: "",
  heroSubtitle: "",
  heroCta: "Book a service",
  addToCart: "Book now",
  categoriesTitle: "Services",
  featuredTitle: "Popular services",
  newArrivalsTitle: "New services",
  allProductsTitle: "All services",
  promoEyebrow: "How it works",
  promoTitle: "Book in minutes, relax for the rest",
  promoText: "Choose a service, pay securely, and we'll confirm your slot straight away.",
  promoCta: "Book now",
  testimonialsTitle: "Client stories",
  ctaTitle: "Not sure what you need?",
  ctaText: "Tell us about it on WhatsApp and we'll recommend the right service.",
  announcement: "",
  highlights: [
    { icon: "award", title: "Experienced team", text: "Years of trusted, proven work" },
    { icon: "calendar", title: "Flexible booking", text: "Pick a time that suits you" },
    { icon: "shield", title: "Satisfaction promise", text: "We're not done until you're happy" },
  ],
};

const LIGHT_BG = "#ffffff";
const DARK_BG = "#09090b";

// ── Catalog ─────────────────────────────────────────────────────────────────
// 5 e-commerce · 5 food delivery · 5 clothing · 3 business services.
// The first e-commerce theme reproduces the original storefront look and is
// what stores without a chosen theme fall back to.

export const THEMES: StorefrontTheme[] = [
  // ── E-commerce ────────────────────────────────────────────────────────────
  {
    id: "classic",
    name: "Duka Classic",
    category: "ecommerce",
    tagline: "The dependable all-rounder — banner slider, category tiles and product rails.",
    bestFor: ["General stores", "Mixed catalogs", "First-time sellers"],
    tokens: { accent: "#f59e0b", bodyFont: "inter", headingFont: "inter", headingStyle: "bold", radius: "lg", density: "comfortable", mode: "auto", background: LIGHT_BG, backgroundDark: DARK_BG },
    layout: { header: "standard", hero: "split", card: "classic", categories: "tiles", footer: "standard", columns: 5, sections: ["hero", "categories", "perks", "featured", "newArrivals", "categoryRails", "allProducts", "testimonials"] },
    copy: ECOMMERCE_COPY,
  },
  {
    id: "marketplace",
    name: "Marketplace",
    category: "ecommerce",
    tagline: "Big-catalog energy — wide banner, department icons and a dense, scannable grid.",
    bestFor: ["Supermarkets", "Large catalogs", "Wholesale"],
    tokens: { accent: "#2563eb", bodyFont: "dmsans", headingFont: "dmsans", headingStyle: "bold", radius: "md", density: "compact", mode: "light", background: "#f4f6fa", backgroundDark: DARK_BG },
    layout: { header: "standard", hero: "banner", card: "classic", categories: "circles", footer: "standard", columns: 5, sections: ["hero", "highlights", "categories", "featured", "promo", "categoryRails", "newArrivals", "allProducts", "testimonials"] },
    copy: { ...ECOMMERCE_COPY, featuredTitle: "Top deals today", categoriesTitle: "Browse departments", announcement: "" },
  },
  {
    id: "gadget-hub",
    name: "Gadget Hub",
    category: "ecommerce",
    tagline: "Dark, precise and techy — built for phones, laptops and accessories.",
    bestFor: ["Electronics", "Phone accessories", "Gaming"],
    tokens: { accent: "#22d3ee", bodyFont: "spacegrotesk", headingFont: "spacegrotesk", headingStyle: "bold", radius: "sm", density: "comfortable", mode: "dark", background: LIGHT_BG, backgroundDark: "#05070d" },
    layout: { header: "minimal", hero: "split", card: "minimal", categories: "tiles", footer: "bold", columns: 4, sections: ["hero", "highlights", "featured", "categories", "promo", "newArrivals", "allProducts", "testimonials", "ctaBand"] },
    copy: {
      ...ECOMMERCE_COPY,
      heroEyebrow: "Latest tech",
      featuredTitle: "Trending now",
      heroCta: "Explore gear",
      promoEyebrow: "Upgrade season",
      promoTitle: "Trade up to the latest",
      promoText: "Genuine devices with warranty, delivered and set up for you.",
      highlights: [
        { icon: "shield", title: "Genuine products", text: "100% original, with warranty" },
        { icon: "truck", title: "Same-day in Lagos", text: "Order before 12pm" },
        { icon: "phone", title: "Expert support", text: "Real people, on WhatsApp" },
      ],
    },
  },
  {
    id: "minimal-store",
    name: "Minimal",
    category: "ecommerce",
    tagline: "Quiet, monochrome and product-first. Lets your photography do the talking.",
    bestFor: ["Home & decor", "Design objects", "Small curated shops"],
    tokens: { accent: "#18181b", bodyFont: "inter", headingFont: "inter", headingStyle: "elegant", radius: "none", density: "airy", mode: "light", background: LIGHT_BG, backgroundDark: DARK_BG },
    layout: { header: "minimal", hero: "minimal", card: "minimal", categories: "pills", footer: "minimal", columns: 4, sections: ["hero", "categories", "featured", "allProducts", "about"] },
    copy: { ...ECOMMERCE_COPY, heroCta: "Shop all", featuredTitle: "Selected" },
  },
  {
    id: "bazaar",
    name: "Bazaar",
    category: "ecommerce",
    tagline: "Warm, friendly and colourful — perfect for gift shops and lifestyle stores.",
    bestFor: ["Gift shops", "Beauty & cosmetics", "Lifestyle"],
    tokens: { accent: "#f97316", bodyFont: "poppins", headingFont: "poppins", headingStyle: "bold", radius: "xl", density: "comfortable", mode: "light", background: "#fff8f1", backgroundDark: DARK_BG },
    layout: { header: "standard", hero: "centered", card: "classic", categories: "circles", footer: "bold", columns: 5, sections: ["hero", "highlights", "categories", "featured", "promo", "newArrivals", "categoryRails", "allProducts", "testimonials", "ctaBand"] },
    copy: { ...ECOMMERCE_COPY, heroEyebrow: "Welcome to the shop", heroCta: "Start shopping" },
  },

  // ── Food delivery ─────────────────────────────────────────────────────────
  {
    id: "quick-bites",
    name: "Quick Bites",
    category: "food",
    tagline: "Fast-food delivery — bold photo hero and a scannable two-column menu.",
    bestFor: ["Fast food", "Shawarma & burgers", "Cloud kitchens"],
    tokens: { accent: "#dc2626", bodyFont: "poppins", headingFont: "poppins", headingStyle: "bold", radius: "lg", density: "compact", mode: "light", background: LIGHT_BG, backgroundDark: DARK_BG },
    layout: { header: "minimal", hero: "fullbleed", card: "menu", categories: "pills", footer: "bold", columns: 2, sections: ["hero", "highlights", "categories", "featured", "allProducts", "testimonials", "ctaBand"] },
    copy: { ...FOOD_COPY, heroTitle: "Hot food, delivered fast", heroSubtitle: "Burgers, wraps, wings and more — made fresh and at your door in under an hour." },
  },
  {
    id: "home-kitchen",
    name: "Home Kitchen",
    category: "food",
    tagline: "Cosy, home-cooked warmth — cream paper tones and a classic serif.",
    bestFor: ["Local dishes", "Soups & swallows", "Meal prep"],
    tokens: { accent: "#c2410c", bodyFont: "dmsans", headingFont: "fraunces", headingStyle: "elegant", radius: "lg", density: "comfortable", mode: "light", background: "#fbf6ee", backgroundDark: "#140d07" },
    layout: { header: "centered", hero: "split", card: "menu", categories: "circles", footer: "standard", columns: 2, sections: ["hero", "highlights", "featured", "categories", "allProducts", "testimonials", "about", "ctaBand"] },
    copy: { ...FOOD_COPY, heroEyebrow: "Cooked like mum's", featuredTitle: "Today's specials", heroTitle: "Real food, made with love" },
  },
  {
    id: "grill-house",
    name: "Grill House",
    category: "food",
    tagline: "Smoky, dark and loud — for suya spots, grills, burgers and late-night kitchens.",
    bestFor: ["Suya & grills", "Bars & lounges", "Late-night kitchens"],
    tokens: { accent: "#f59e0b", bodyFont: "inter", headingFont: "bebas", headingStyle: "condensed", radius: "sm", density: "comfortable", mode: "dark", background: LIGHT_BG, backgroundDark: "#0c0a09" },
    layout: { header: "minimal", hero: "fullbleed", card: "minimal", categories: "pills", footer: "bold", columns: 4, sections: ["hero", "highlights", "featured", "promo", "categories", "allProducts", "testimonials", "ctaBand"] },
    copy: {
      ...FOOD_COPY,
      heroEyebrow: "Open till late",
      heroTitle: "Fire-grilled. Made to order.",
      featuredTitle: "Crowd favourites",
      promoEyebrow: "Weekend special",
      promoTitle: "Platters built for sharing",
      promoText: "Mixed grills, wings and sides for the whole table. Order ahead for game night.",
      promoCta: "See platters",
    },
  },
  {
    id: "fresh-bowl",
    name: "Fresh Bowl",
    category: "food",
    tagline: "Light and healthy — salads, smoothies, juices and clean meal prep.",
    bestFor: ["Salads & bowls", "Juice bars", "Healthy meal plans"],
    tokens: { accent: "#059669", bodyFont: "outfit", headingFont: "outfit", headingStyle: "bold", radius: "xl", density: "airy", mode: "light", background: "#f3faf6", backgroundDark: DARK_BG },
    layout: { header: "minimal", hero: "centered", card: "minimal", categories: "circles", footer: "standard", columns: 4, sections: ["hero", "highlights", "categories", "featured", "allProducts", "promo", "testimonials"] },
    copy: {
      ...FOOD_COPY,
      heroEyebrow: "Eat well, feel good",
      heroTitle: "Fresh, healthy & delivered",
      featuredTitle: "Bestsellers",
      promoEyebrow: "Meal plans",
      promoTitle: "A week of healthy, sorted",
      promoText: "Subscribe to 5 or 10-day plans, delivered fresh every morning.",
      promoCta: "View plans",
      highlights: [
        { icon: "leaf", title: "Fresh ingredients", text: "Sourced every morning" },
        { icon: "clock", title: "Fast delivery", text: "Within 45 minutes" },
        { icon: "heart", title: "Calorie-counted", text: "Know exactly what you eat" },
      ],
    },
  },
  {
    id: "sweet-treats",
    name: "Sweet Treats",
    category: "food",
    tagline: "Bakeries, cakes, small chops and desserts — soft blush tones and an elegant serif.",
    bestFor: ["Cakes & pastries", "Small chops", "Dessert bars"],
    tokens: { accent: "#db2777", bodyFont: "poppins", headingFont: "playfair", headingStyle: "elegant", radius: "xl", density: "comfortable", mode: "light", background: "#fff5f8", backgroundDark: "#12070b" },
    layout: { header: "centered", hero: "centered", card: "classic", categories: "tiles", footer: "standard", columns: 4, sections: ["hero", "featured", "highlights", "categories", "allProducts", "promo", "testimonials", "ctaBand"] },
    copy: {
      ...FOOD_COPY,
      heroEyebrow: "Baked fresh daily",
      heroCta: "Order a treat",
      featuredTitle: "Customer favourites",
      addToCart: "Add to order",
      promoEyebrow: "Celebrations",
      promoTitle: "Custom cakes for every occasion",
      promoText: "Birthdays, weddings and everything in between — order 48 hours ahead.",
      promoCta: "Order a custom cake",
      highlights: [
        { icon: "sparkles", title: "Baked fresh", text: "Every single morning" },
        { icon: "gift", title: "Gift-ready", text: "Beautifully boxed" },
        { icon: "truck", title: "Careful delivery", text: "Arrives picture-perfect" },
      ],
    },
  },

  // ── Clothing brands ───────────────────────────────────────────────────────
  {
    id: "atelier",
    name: "Atelier",
    category: "clothing",
    tagline: "Luxury fashion house — full-bleed imagery, refined serif and tall product shots.",
    bestFor: ["Luxury & designer", "Bridal", "Tailoring"],
    tokens: { accent: "#111111", bodyFont: "inter", headingFont: "cormorant", headingStyle: "elegant", radius: "none", density: "airy", mode: "light", background: "#faf8f5", backgroundDark: DARK_BG },
    layout: { header: "centered", hero: "fullbleed", card: "editorial", categories: "cards", footer: "minimal", columns: 4, sections: ["hero", "featured", "promo", "categories", "newArrivals", "allProducts", "testimonials", "about"] },
    copy: { ...CLOTHING_COPY, heroEyebrow: "Autumn / Winter", heroTitle: "The new collection", heroCta: "Discover" },
  },
  {
    id: "streetwear",
    name: "Streetwear",
    category: "clothing",
    tagline: "Hype-drop energy — black canvas, condensed type and a neon accent.",
    bestFor: ["Streetwear", "Sneakers", "Merch drops"],
    tokens: { accent: "#a3e635", bodyFont: "spacegrotesk", headingFont: "bebas", headingStyle: "condensed", radius: "none", density: "compact", mode: "dark", background: LIGHT_BG, backgroundDark: "#000000" },
    layout: { header: "minimal", hero: "fullbleed", card: "editorial", categories: "cards", footer: "bold", columns: 4, sections: ["hero", "newArrivals", "categories", "promo", "featured", "allProducts"] },
    copy: {
      ...CLOTHING_COPY,
      heroEyebrow: "Drop 07",
      heroTitle: "New drop out now",
      heroCta: "Cop now",
      newArrivalsTitle: "Latest drop",
      promoEyebrow: "Limited run",
      promoTitle: "Once it's gone, it's gone",
      promoText: "Small batches, no restocks. Turn on notifications so you never miss a drop.",
      promoCta: "Shop the drop",
      announcement: "",
    },
  },
  {
    id: "boutique",
    name: "Boutique",
    category: "clothing",
    tagline: "Feminine and polished — rose accent, soft corners, elegant serif headlines.",
    bestFor: ["Women's fashion", "Accessories", "Lingerie"],
    tokens: { accent: "#be123c", bodyFont: "poppins", headingFont: "playfair", headingStyle: "elegant", radius: "lg", density: "comfortable", mode: "light", background: LIGHT_BG, backgroundDark: DARK_BG },
    layout: { header: "centered", hero: "split", card: "editorial", categories: "circles", footer: "standard", columns: 4, sections: ["hero", "highlights", "featured", "categories", "promo", "allProducts", "testimonials", "ctaBand"] },
    copy: { ...CLOTHING_COPY, heroCta: "Shop the edit" },
  },
  {
    id: "ankara",
    name: "Ankara",
    category: "clothing",
    tagline: "Proudly African — warm gold, expressive type and big collection cards.",
    bestFor: ["Ankara & aso-ebi", "Native wear", "Made-in-Nigeria"],
    tokens: { accent: "#b45309", bodyFont: "dmsans", headingFont: "syne", headingStyle: "bold", radius: "md", density: "comfortable", mode: "light", background: "#fdf8ef", backgroundDark: "#120c03" },
    layout: { header: "centered", hero: "centered", card: "editorial", categories: "cards", footer: "bold", columns: 3, sections: ["hero", "categories", "featured", "promo", "newArrivals", "allProducts", "testimonials", "ctaBand"] },
    copy: {
      ...CLOTHING_COPY,
      heroEyebrow: "Handmade in Nigeria",
      heroTitle: "Made with heritage",
      categoriesTitle: "Shop by style",
      promoEyebrow: "Made to measure",
      promoTitle: "Your fabric, your fit",
      promoText: "Send your measurements and we'll tailor any piece just for you, ready in 7 days.",
      promoCta: "Start a custom order",
    },
  },
  {
    id: "essentials",
    name: "Essentials",
    category: "clothing",
    tagline: "Everyday basics — neutral stone palette, a clean grid and zero noise.",
    bestFor: ["Basics & loungewear", "Menswear", "Kids"],
    tokens: { accent: "#44403c", bodyFont: "manrope", headingFont: "manrope", headingStyle: "elegant", radius: "md", density: "airy", mode: "light", background: "#f5f5f4", backgroundDark: "#0c0a09" },
    layout: { header: "minimal", hero: "minimal", card: "minimal", categories: "pills", footer: "minimal", columns: 4, sections: ["hero", "highlights", "categories", "newArrivals", "allProducts", "about"] },
    copy: { ...CLOTHING_COPY, heroEyebrow: "", heroCta: "Shop essentials" },
  },

  // ── Business services ─────────────────────────────────────────────────────
  {
    id: "consult",
    name: "Consult",
    category: "services",
    tagline: "Professional services — consultants, agencies, lawyers and accountants.",
    bestFor: ["Consulting", "Legal & accounting", "Agencies"],
    tokens: { accent: "#1d4ed8", bodyFont: "manrope", headingFont: "manrope", headingStyle: "bold", radius: "md", density: "airy", mode: "light", background: "#f8fafc", backgroundDark: DARK_BG },
    layout: { header: "minimal", hero: "centered", card: "service", categories: "pills", footer: "bold", columns: 2, sections: ["hero", "highlights", "featured", "promo", "allProducts", "testimonials", "about", "ctaBand"] },
    copy: { ...SERVICES_COPY, heroEyebrow: "Trusted by 200+ businesses", heroTitle: "Expert help for your business" },
  },
  {
    id: "studio",
    name: "Studio",
    category: "services",
    tagline: "Creative studios — photographers, designers, event planners and media.",
    bestFor: ["Photography", "Design & media", "Events"],
    tokens: { accent: "#8b5cf6", bodyFont: "inter", headingFont: "syne", headingStyle: "bold", radius: "lg", density: "airy", mode: "dark", background: LIGHT_BG, backgroundDark: "#07060b" },
    layout: { header: "minimal", hero: "fullbleed", card: "service", categories: "pills", footer: "bold", columns: 2, sections: ["hero", "featured", "promo", "about", "testimonials", "allProducts", "ctaBand"] },
    copy: { ...SERVICES_COPY, heroEyebrow: "Creative studio", heroCta: "Book a session", featuredTitle: "What we do", ctaTitle: "Have a project in mind?", ctaText: "Tell us about it — we'll send a quote within 24 hours." },
  },
  {
    id: "salon",
    name: "Salon & Spa",
    category: "services",
    tagline: "Beauty and wellness — salons, barbers, spas and makeup artists.",
    bestFor: ["Hair & barbing", "Spa & massage", "Makeup & nails"],
    tokens: { accent: "#0f766e", bodyFont: "inter", headingFont: "lora", headingStyle: "elegant", radius: "xl", density: "comfortable", mode: "light", background: "#f6faf9", backgroundDark: "#04100e" },
    layout: { header: "centered", hero: "split", card: "service", categories: "pills", footer: "standard", columns: 2, sections: ["hero", "highlights", "featured", "allProducts", "testimonials", "about", "ctaBand"] },
    copy: {
      ...SERVICES_COPY,
      heroEyebrow: "Relax · Refresh · Renew",
      heroCta: "Book an appointment",
      featuredTitle: "Signature treatments",
      highlights: [
        { icon: "scissors", title: "Skilled stylists", text: "Certified and experienced" },
        { icon: "calendar", title: "Book online", text: "Choose your time in seconds" },
        { icon: "sparkles", title: "Premium products", text: "Only the brands we trust" },
      ],
    },
  },
];

export const DEFAULT_THEME_ID = "classic";

export const THEME_CATEGORIES: { id: ThemeCategory; label: string; limit: number }[] = [
  { id: "ecommerce", label: "E-commerce", limit: 5 },
  { id: "food", label: "Food delivery", limit: 5 },
  { id: "clothing", label: "Clothing brand", limit: 5 },
  { id: "services", label: "Business services", limit: 3 },
];

const BY_ID = new Map(THEMES.map((t) => [t.id, t]));

export function getTheme(id: string | null | undefined): StorefrontTheme | undefined {
  return id ? BY_ID.get(id) : undefined;
}
