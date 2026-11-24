import { describe, expect, it } from "vitest";
import { STARTER_CATEGORIES, subcategoryIdeas } from "@/lib/category-ideas";

describe("category ideas", () => {
  it.each([
    ["Shoes", "Sneakers"],
    ["Men's Footwear", "Sandals"],
    ["Wigs & Hair", "Bundles"],
    ["Phones & Gadgets", "Chargers & cables"],
    ["Food & Drinks", "Small chops"],
    ["Home & Kitchen", "Cookware"],
    ["Cakes", "Cupcakes"],
    ["Perfumes", "Body mists"],
  ])("suggests subcategories for %j", (name, idea) => {
    expect(subcategoryIdeas(name)).toContain(idea);
  });

  it("matches whole words, not pieces of other words", () => {
    expect(subcategoryIdeas("Women's wear")).not.toContain("Suits"); // "men" inside "women"
    expect(subcategoryIdeas("Footwear")).not.toContain("Dresses"); // "wear" inside "footwear"
    expect(subcategoryIdeas("Hair care")).not.toContain("Spare parts"); // "car" inside "care"
    expect(subcategoryIdeas("Home & Kitchen")).not.toContain("Small chops"); // kitchen isn't food
  });

  it("returns nothing for unknown categories and has no duplicate ideas", () => {
    expect(subcategoryIdeas("Zxqv")).toEqual([]);
    const all = subcategoryIdeas("Kids fashion shoes");
    expect(new Set(all).size).toBe(all.length);
    expect(new Set(STARTER_CATEGORIES).size).toBe(STARTER_CATEGORIES.length);
  });
});
