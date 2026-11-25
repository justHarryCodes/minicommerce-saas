import { describe, expect, it } from "vitest";
import { blocksHtml, emailImage, parseBlocks, plainText } from "@/lib/email-elements";
import { EMAIL_THEMES, heroHtml, themeById, themeColors, withAccent } from "@/lib/email-themes";
import { CAMPAIGN_TEMPLATES } from "@/lib/admin/campaign-templates";

const colors = themeColors(themeById("celebrate"));

describe("marketing message elements", () => {
  it("turns line markers into elements", () => {
    const blocks = parseBlocks(
      [
        "Hello **there**",
        "",
        "1. First",
        "2. Second",
        "",
        "• 💬 Chat with us",
        "- Plain bullet",
        "",
        "> 💡 A tip",
        "",
        "[[🚀 Fast | quick]]",
        "[[🛡️ Safe | secure]]",
        "",
        "![Shop](https://res.cloudinary.com/x/image/upload/v1/a.jpg)",
        "---",
      ].join("\n"),
    );
    expect(blocks.map((b) => b.kind)).toEqual(["para", "steps", "list", "tip", "tiles", "image", "divider"]);
    expect(blocks[1]).toEqual({ kind: "steps", items: ["First", "Second"] });
    expect(blocks[2]).toEqual({ kind: "list", items: [{ icon: "💬", text: "Chat with us" }, { icon: null, text: "Plain bullet" }] });
    expect(blocks[3]).toEqual({ kind: "tip", icon: "💡", text: "A tip" });
    expect(blocks[4]).toEqual({ kind: "tiles", items: [{ icon: "🚀", title: "Fast", text: "quick" }, { icon: "🛡️", title: "Safe", text: "secure" }] });
  });

  it("a line in bold is a paragraph, not a bullet", () => {
    expect(parseBlocks("**Big news** today").map((b) => b.kind)).toEqual(["para"]);
  });

  it("only shows pictures from Duka's own image host", () => {
    expect(parseBlocks("![x](https://evil.example/track.png)")).toEqual([]);
    expect(parseBlocks("![x](https://res.cloudinary.com/x/image/upload/a.jpg)")[0].kind).toBe("image");
  });

  it("escapes everything a vendor or admin types", () => {
    const html = blocksHtml(parseBlocks('<script>alert(1)</script>\n\n• 💬 <img src=x onerror=1>\n\n> "quoted"'), colors);
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;script&gt;");
  });

  it("plain text keeps the emoji and drops the markers (push, WhatsApp)", () => {
    expect(plainText("Hi **you**\n\n1. One\n• 💬 Chat\n\n> 💡 Tip\n\n[[🚀 Fast | quick]]")).toBe("Hi you\n\n1. One\n\n💬 Chat\n\n💡 Tip\n\n🚀 Fast: quick");
  });

  it("sizes Cloudinary pictures for email as JPEG", () => {
    expect(emailImage("https://res.cloudinary.com/x/image/upload/v12/a.webp", 600, 300)).toBe("https://res.cloudinary.com/x/image/upload/c_fill,g_auto,w_600,h_300,q_auto:good,f_jpg/v12/a.webp");
    expect(emailImage("https://example.com/a.jpg")).toBe("https://example.com/a.jpg");
  });
});

describe("themes", () => {
  it("every campaign template has a real theme and renders elements", () => {
    const ids = new Set(EMAIL_THEMES.map((t) => t.id));
    for (const t of CAMPAIGN_TEMPLATES) {
      expect(ids.has(t.theme), t.id).toBe(true);
      expect(parseBlocks(t.body).some((b) => b.kind !== "para"), `${t.id} uses an element`).toBe(true);
    }
  });

  it("an unknown theme falls back to the simple look", () => {
    expect(themeById("nope").id).toBe("plain");
  });

  it("a store colour picks readable button text", () => {
    expect(withAccent(themeById("sale"), "#fde047").onAccent).toBe("#000000");
    expect(withAccent(themeById("sale"), "#1e3a8a").onAccent).toBe("#ffffff");
  });

  it("the hero shows the emoji badge and label", () => {
    const html = heroHtml(themeById("whatsapp"));
    expect(html).toContain("💬");
    expect(html).toContain("New feature");
  });
});
