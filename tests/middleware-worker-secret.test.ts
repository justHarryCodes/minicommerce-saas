import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

// The Worker's shared secret: app code never sees it, except the custom-domain
// lookup the Worker calls, which verifies it itself. Stripping it there made
// every lookup answer 401, so custom domains never loaded.

const SECRET = "s3cret-value";

function forwardedSecret(path: string) {
  const req = new NextRequest(`https://dukanigeria.com${path}`, { headers: { "x-worker-secret": SECRET, host: "dukanigeria.com" } });
  const res = middleware(req);
  // NextResponse.next({ request: { headers } }) passes request headers on as x-middleware-request-*
  return res.headers.get("x-middleware-request-x-worker-secret");
}

beforeEach(() => {
  process.env.WORKER_SECRET = SECRET;
});

describe("Worker secret in middleware", () => {
  it("reaches the custom-domain lookup", () => {
    expect(forwardedSecret("/api/domains/resolve?host=www.awarizon.shop")).toBe(SECRET);
  });

  it("is stripped from everything else", () => {
    expect(forwardedSecret("/api/storefront/amaka/orders")).toBeNull();
    expect(forwardedSecret("/store/amaka")).toBeNull();
    expect(forwardedSecret("/pricing")).toBeNull();
  });
});
