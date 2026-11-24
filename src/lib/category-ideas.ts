// Ready-made ideas for organising a store: starter categories for a seller
// with none yet, and subcategory suggestions matched to a category's name.
// Plain data, safe on the client.

export const STARTER_CATEGORIES = [
  "Clothing", "Shoes", "Bags", "Accessories", "Beauty", "Hair", "Phones & Gadgets",
  "Home & Kitchen", "Food & Drinks", "Fragrances", "Kids", "Services",
];

/** keywords (matched at the start of a word; "=word" must be the whole word) → subcategory ideas */
const IDEAS: [string[], string[]][] = [
  [["shoe", "footwear", "sneaker", "kick"], ["Sneakers", "Sandals", "Slides", "Heels", "Loafers", "Boots", "Kids' shoes"]],
  [["bag", "purse", "luggage"], ["Handbags", "Backpacks", "Tote bags", "Clutches", "Travel bags", "Wallets"]],
  [["cloth", "wear", "fashion", "apparel", "outfit", "dress", "attire"], ["Dresses", "Tops", "Trousers", "Shirts", "Ankara", "Native wear", "Two-piece sets", "Loungewear"]],
  [["men"], ["Shirts", "Trousers", "Native wear", "Suits", "Polos", "Shorts"]],
  [["women", "lady", "ladies"], ["Dresses", "Tops", "Skirts", "Two-piece sets", "Jumpsuits", "Native wear"]],
  [["kid", "child", "baby", "toddler"], ["Baby clothes", "Kids' clothes", "Toys", "Baby care", "School items", "Kids' shoes"]],
  [["hair", "wig"], ["Wigs", "Bundles", "Closures & frontals", "Braids & extensions", "Hair care", "Tools & accessories"]],
  [["beauty", "makeup", "cosmetic"], ["Makeup", "Skincare", "Lips", "Nails", "Tools & brushes", "Gift sets"]],
  [["skin", "body care"], ["Cleansers", "Serums", "Moisturisers", "Sunscreen", "Body care", "Sets"]],
  [["perfume", "fragrance", "scent", "oud"], ["For her", "For him", "Unisex", "Body mists", "Oud & oils", "Gift sets"]],
  [["jewel", "accessor", "watch"], ["Necklaces", "Earrings", "Bracelets", "Rings", "Watches", "Sunglasses", "Belts"]],
  [["phone", "gadget", "electronic", "tech", "mobile"], ["Phones", "Laptops", "Audio", "Smart watches", "Chargers & cables", "Phone cases", "Power banks"]],
  [["computer", "laptop"], ["Laptops", "Desktops", "Monitors", "Keyboards & mice", "Storage", "Accessories"]],
  [["home", "kitchen", "household", "interior", "decor"], ["Cookware", "Kitchen tools", "Storage", "Bedding", "Decor", "Cleaning", "Appliances"]],
  [["furniture"], ["Sofas", "Chairs", "Tables", "Beds", "Storage", "Outdoor"]],
  [["food", "snack", "meal", "restaurant", "chop"], ["Main meals", "Rice dishes", "Soups & swallow", "Small chops", "Snacks", "Drinks", "Desserts"]],
  [["drink", "beverage", "juice", "wine"], ["Soft drinks", "Juices", "Smoothies", "Wines", "Water", "Party packs"]],
  [["cake", "pastr", "bak", "dessert"], ["Celebration cakes", "Cupcakes", "Pastries", "Cookies", "Desserts", "Party trays"]],
  [["grocer", "foodstuff", "market", "provision"], ["Grains & rice", "Beans & legumes", "Oils", "Spices & seasoning", "Tubers", "Fresh produce", "Provisions"]],
  [["health", "fitness", "gym", "sport"], ["Supplements", "Gym equipment", "Activewear", "Yoga & mats", "Sports gear", "Recovery"]],
  [["book", "stationer", "school"], ["Books", "Notebooks", "Pens & art", "School bags", "Office supplies"]],
  [["service", "appointment", "salon", "barb", "=spa"], ["Haircuts", "Styling", "Braiding", "Makeup sessions", "Spa & massage", "Consultations"]],
  [["=car", "=cars", "auto", "vehicle"], ["Car accessories", "Car care", "Spare parts", "Electronics", "Tyres"]],
  [["gift", "souvenir", "party"], ["Gift boxes", "Hampers", "Souvenirs", "Party supplies", "Cards & wrapping"]],
];

/** Subcategory ideas for a category name (empty when nothing fits). */
export function subcategoryIdeas(categoryName: string): string[] {
  const n = categoryName.toLowerCase();
  const out: string[] = [];
  for (const [keys, ideas] of IDEAS) {
    // word start only: "men" must not match "women", "wear" must not match "footwear"
    if (keys.some((k) => new RegExp(k.startsWith("=") ? `(^|[^a-z])${k.slice(1)}($|[^a-z])` : `(^|[^a-z])${k}`).test(n))) for (const i of ideas) if (!out.includes(i)) out.push(i);
  }
  return out;
}
