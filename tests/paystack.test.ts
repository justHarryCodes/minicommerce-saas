import { describe, it, expect, vi, afterEach } from "vitest";
import { getAppUrl } from "@/lib/paystack";

// getAppUrl() is what every Paystack callback_url is built from (storefront
// checkout, monthly subscription, plan upgrades) — a missing/blank
// NEXT_PUBLIC_APP_URL here means a customer's browser gets redirected
// nowhere useful after a successful payment, which looks exactly like a
// failed payment even though Paystack processed it fine. See lib/paystack.ts
// for the full story.

const ORIGINAL = process.env.NEXT_PUBLIC_APP_URL;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = ORIGINAL;
  vi.restoreAllMocks();
});

describe("getAppUrl", () => {
  it("returns NEXT_PUBLIC_APP_URL when set", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://dukanigeria.com";
    expect(getAppUrl()).toBe("https://dukanigeria.com");
  });

  it("strips a trailing slash so callback URLs never end up with a double slash", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://dukanigeria.com/";
    expect(getAppUrl()).toBe("https://dukanigeria.com");
  });

  it("falls back to the real production domain (never localhost) when unset", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(getAppUrl()).toBe("https://dukanigeria.com");
    expect(getAppUrl()).not.toContain("localhost");
    errorSpy.mockRestore();
  });

  it("falls back when the env var is set but blank", () => {
    process.env.NEXT_PUBLIC_APP_URL = "";
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(getAppUrl()).toBe("https://dukanigeria.com");
    errorSpy.mockRestore();
  });

  it("logs loudly when falling back, so a misconfigured deployment is visible in logs", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    getAppUrl();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][0]).toMatch(/NEXT_PUBLIC_APP_URL/);
    errorSpy.mockRestore();
  });
});
