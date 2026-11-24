import { describe, expect, it } from "vitest";
import { blogSlug, isBlogCategory, parseArticle, readingMinutes, tableOfContents } from "@/lib/blog-shared";
import { BlogBody } from "@/app/api/admin/blog/schema";

const BODY = `Intro paragraph.

## Getting paid
Turn on **Duka Pay**.

> Tip: Check your bank app before confirming a transfer.

![A seller packing orders](https://res.cloudinary.com/demo/image/upload/a.jpg)

### Fees
- Small fee
- Paystack fee

## Getting paid
Second section with the same title.`;

describe("blog article format", () => {
  const blocks = parseArticle(BODY);

  it("turns image lines into figures (https only)", () => {
    expect(blocks.some((b) => b.t === "img" && b.alt === "A seller packing orders")).toBe(true);
    expect(parseArticle("![x](javascript:alert(1))").some((b) => b.t === "img")).toBe(false);
    expect(parseArticle("![x](http://insecure.test/a.jpg)").some((b) => b.t === "img")).toBe(false);
  });

  it("turns '> Tip:' quotes into callouts without the prefix", () => {
    const tip = blocks.find((b) => b.t === "callout");
    expect(tip && tip.t === "callout" && tip.kind).toBe("tip");
    expect(JSON.stringify(tip)).not.toContain("Tip:");
  });

  it("builds a table of contents with unique heading ids", () => {
    const toc = tableOfContents(blocks);
    expect(toc.map((t) => t.id)).toEqual(["getting-paid", "fees", "getting-paid-2"]);
    expect(toc.map((t) => t.level)).toEqual([2, 3, 2]);
  });

  it("estimates reading time and makes clean slugs", () => {
    expect(readingMinutes("word ".repeat(1100))).toBe(5);
    expect(readingMinutes("")).toBe(1);
    expect(blogSlug("How to Sell on WhatsApp in 2026!")).toBe("how-to-sell-on-whatsapp-in-2026");
    expect(isBlogCategory("guides")).toBe(true);
    expect(isBlogCategory("hacking")).toBe(false);
  });
});

describe("admin post validation", () => {
  const base = { title: "A useful guide", body: "x".repeat(60), category: "guides", status: "published", tags: [], author_name: "Duka Team", featured: false };
  it("accepts a valid post", () => expect(BlogBody.safeParse(base).success).toBe(true));
  it("rejects publishing an empty post, but allows an empty draft", () => {
    expect(BlogBody.safeParse({ ...base, body: "" }).success).toBe(false);
    expect(BlogBody.safeParse({ ...base, body: "", status: "draft" }).success).toBe(true);
  });
  it("rejects unsafe cover links, bad slugs and unknown categories", () => {
    expect(BlogBody.safeParse({ ...base, cover_url: "javascript:alert(1)" }).success).toBe(false);
    expect(BlogBody.safeParse({ ...base, slug: "Bad Slug!" }).success).toBe(false);
    expect(BlogBody.safeParse({ ...base, category: "random" }).success).toBe(false);
  });
});

describe("image credits", () => {
  it("attaches a 'Photo:' line under an image as that image's credit", () => {
    const blocks = parseArticle("Intro\n\n![A market](https://res.cloudinary.com/x/a.jpg)\nPhoto: [Sir Demo](https://commons.wikimedia.org/wiki/File:A.jpg), CC BY-SA 4.0\n\nAfter");
    const img = blocks.find((b) => b.t === "img");
    expect(img && img.t === "img" && img.credit?.some((n) => n.t === "link" && n.href.startsWith("https://commons.wikimedia.org"))).toBe(true);
    // the credit is not repeated as a paragraph
    expect(blocks.filter((b) => b.t === "p").length).toBe(2);
  });
  it("leaves a 'Photo:' paragraph alone when it isn't right under an image", () => {
    const blocks = parseArticle("![A](https://x.com/a.jpg)\n\nSome text\n\nPhoto: tips for better photos");
    const img = blocks.find((b) => b.t === "img");
    expect(img && img.t === "img" && img.credit).toBeFalsy();
  });
});
