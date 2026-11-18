import { describe, expect, it, vi } from "vitest";
import fs from "fs";

// No database in unit tests: the tools module only needs the functions to exist
vi.mock("@/lib/db", () => ({ query: async () => [], queryOne: async () => null, queryMany: async () => [], toCamel: (x: unknown) => x, default: {} }));
import { HELP, searchHelp } from "@/lib/assistant/knowledge";
import { TOOL_DEFS } from "@/lib/assistant/tools";

describe("Duka Assistant help guide", () => {
  it.each([
    ["How do I get paid?", "duka-pay"],
    ["when does money reach my bank account", "duka-pay"],
    ["create a discount code", "coupons"],
    ["how to confirm a bank transfer", "bank-transfer"],
    ["set delivery fees for Lekki", "delivery"],
    ["my products are running out of stock", "inventory"],
    ["tips for product photos", "photos"],
    ["I have no sales", "first-sale"],
    ["connect my whatsapp number", "whatsapp-shop"],
    ["use my own domain name", "custom-domain"],
    ["add staff to my store", "team"],
  ])("finds the right guide for %j", (q, id) => {
    expect(searchHelp(q, 3, 7).map((a) => a.id)).toContain(id);
  });

  it("returns nothing relevant for off-topic questions at the fallback threshold", () => {
    expect(searchHelp("write me a poem about football", 2, 7)).toEqual([]);
    expect(searchHelp("what is the capital of france", 2, 7)).toEqual([]);
  });

  it("has unique ids and only links to dashboard pages that exist", () => {
    expect(new Set(HELP.map((a) => a.id)).size).toBe(HELP.length);
    for (const a of HELP.filter((x) => x.url)) {
      const path = a.url!.split("?")[0].replace(/^\/dashboard\/?/, "");
      const dir = path ? `src/app/dashboard/${path}` : "src/app/dashboard";
      expect(fs.existsSync(dir), `${a.id} links to ${a.url}`).toBe(true);
    }
  });
});

describe("Duka Assistant tools", () => {
  it("defines each tool once, and every definition is implemented", () => {
    const names = TOOL_DEFS.map((t) => t.function.name);
    expect(new Set(names).size).toBe(names.length);
    const src = fs.readFileSync("src/lib/assistant/tools.ts", "utf8");
    for (const n of names) expect(src.includes(`case "${n}":`), n).toBe(true);
  });

  it("never lets an action tool write directly (they only propose)", () => {
    const src = fs.readFileSync("src/lib/assistant/tools.ts", "utf8");
    expect(/\b(UPDATE|INSERT INTO|DELETE FROM)\b/.test(src)).toBe(false);
  });
});
