import { describe, it, expect } from "vitest";
import { appPageUrl, storePageUrl } from "@/lib/payment-return";

// After paying with Duka Pay the shopper must land on the receipt on the same
// address they shopped on — never localhost (the proxy's view of itself) and
// never a site that isn't the store's.

const base = { slug: "luxary", customDomain: null, appUrl: "https://dukanigeria.com", rootDomain: "dukanigeria.com", path: "/receipt/1001?t=abc&paid=1" };

describe("receipt after paying", () => {
  it("returns to the store's subdomain", () => {
    expect(storePageUrl({ ...base, returnTo: "https://luxary.dukanigeria.com" })).toBe("https://luxary.dukanigeria.com/receipt/1001?t=abc&paid=1");
  });

  it("returns to the store's custom domain", () => {
    expect(storePageUrl({ ...base, customDomain: "www.awarizon.shop", returnTo: "https://www.awarizon.shop" })).toBe(
      "https://www.awarizon.shop/receipt/1001?t=abc&paid=1",
    );
  });

  it("returns to the main site's /store/<slug> when they shopped there", () => {
    expect(storePageUrl({ ...base, returnTo: "https://dukanigeria.com" })).toBe("https://dukanigeria.com/store/luxary/receipt/1001?t=abc&paid=1");
  });

  it("without a return address, uses the store's own address (custom domain first)", () => {
    expect(storePageUrl({ ...base, returnTo: null })).toBe("https://luxary.dukanigeria.com/receipt/1001?t=abc&paid=1");
    expect(storePageUrl({ ...base, customDomain: "www.awarizon.shop", returnTo: null })).toBe("https://www.awarizon.shop/receipt/1001?t=abc&paid=1");
  });

  it("never sends anyone to localhost or another site", () => {
    for (const returnTo of ["http://localhost:3000", "https://evil.com", "https://other-store.dukanigeria.com", "javascript:alert(1)", "not a url"]) {
      expect(storePageUrl({ ...base, returnTo }), returnTo).toBe("https://luxary.dukanigeria.com/receipt/1001?t=abc&paid=1");
    }
  });

  it("dashboard pages are absolute on the app's public address", () => {
    expect(appPageUrl("https://dukanigeria.com", "/dashboard/billing?success=paid")).toBe("https://dukanigeria.com/dashboard/billing?success=paid");
    expect(appPageUrl("https://dukanigeria.com/", "/")).toBe("https://dukanigeria.com/");
  });
});
