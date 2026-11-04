import { describe, it, expect, beforeEach } from "vitest";
import { readBookmarks, toggleBookmarkIn } from "@/hooks/useBookmarks";
import { THEMES } from "@/lib/themes/catalog";

// Favourites keep every saved product (one shared list per store), and
// themes stay visibly different from each other.

const mem = new Map<string, string>();
beforeEach(() => {
  mem.clear();
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  } as Storage;
});

const product = (id: string) => ({ id, name: `P${id}`, slug: `p${id}`, price: 1000, compare_price: null, image_url: null });

describe("favourites", () => {
  it("saving from different cards keeps all of them (the old bug kept only the last)", () => {
    const slug = "shop-a-" + Math.random();
    toggleBookmarkIn(slug, product("1"));
    toggleBookmarkIn(slug, product("2"));
    toggleBookmarkIn(slug, product("3"));
    expect(readBookmarks(slug).map((b) => b.id)).toEqual(["3", "2", "1"]);
    expect(JSON.parse(mem.get(`sf_bookmarks_${slug}`)!)).toHaveLength(3);
  });

  it("tapping again removes just that one; stores never share lists", () => {
    const a = "shop-b-" + Math.random();
    const b = "shop-c-" + Math.random();
    toggleBookmarkIn(a, product("1"));
    toggleBookmarkIn(a, product("2"));
    toggleBookmarkIn(b, product("9"));
    toggleBookmarkIn(a, product("1"));
    expect(readBookmarks(a).map((x) => x.id)).toEqual(["2"]);
    expect(readBookmarks(b).map((x) => x.id)).toEqual(["9"]);
  });

  it("reads favourites saved before this fix, and ignores junk", () => {
    mem.set("sf_bookmarks_old-shop", JSON.stringify([product("7"), { nope: true }]));
    expect(readBookmarks("old-shop").map((x) => x.id)).toEqual(["7"]);
    mem.set("sf_bookmarks_bad-shop", "{not json");
    expect(readBookmarks("bad-shop")).toEqual([]);
  });
});

describe("themes feel different", () => {
  const sig = (t: (typeof THEMES)[number]) => [
    t.layout.nav, t.layout.hero, t.layout.card, t.layout.categories, t.layout.product, t.layout.collection, t.tokens.headingFont,
  ];

  it("no two themes share more than 4 of nav, hero, card, categories, product page, category page and heading font", () => {
    for (let i = 0; i < THEMES.length; i++) {
      for (let j = i + 1; j < THEMES.length; j++) {
        const a = sig(THEMES[i]);
        const b = sig(THEMES[j]);
        const same = a.filter((v, k) => v === b[k]).length;
        expect(same, `${THEMES[i].id} vs ${THEMES[j].id}`).toBeLessThanOrEqual(4);
      }
    }
  });

  it("every category style is used, including the showcase grid and bento", () => {
    const used = new Set(THEMES.map((t) => t.layout.categories));
    for (const s of ["tiles", "circles", "pills", "cards", "showcase", "bento"]) expect(used.has(s as never), s).toBe(true);
  });
});
