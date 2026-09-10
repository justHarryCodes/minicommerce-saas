import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ─────────────────────────────────────────────────────────────────────────
// Cross-tenant isolation guard (AUDIT.md §14.2).
//
// Multi-tenancy in this app is enforced entirely by hand-written `WHERE
// store_id = $N` clauses in each route — there is no ORM-level scoping and
// no Postgres RLS. The single worst bug this architecture can produce is a
// route that forgets that clause and lets store A read or mutate store B's
// data.
//
// These tests don't stand up a real Postgres — they mock the DB layer, same
// as tests/billing-fulfillment.test.ts and tests/paystack-webhook.test.ts —
// so they can't prove Postgres itself enforces isolation. What they *do*
// prove, for each route:
//
//   1. When the scoped lookup finds nothing (which is what real Postgres
//      returns when `id` matches a row but `store_id` doesn't), the route
//      responds with "not found" rather than falling back to an unscoped
//      lookup or leaking a partial result.
//   2. The query actually sent to the DB layer was parameterized with the
//      *authenticated* store's id and mentions `store_id` in its SQL text —
//      so a future change that drops the scoping clause fails this test
//      immediately, rather than only failing if someone happens to also
//      break the "not found" behaviour.
//
// Store A is the authenticated caller throughout. "Store B's row" is
// simulated by having the mocked, store-scoped lookup return nothing (or,
// for delete/update-only routes with no pre-check, by asserting the mutating
// query itself is scoped) — exactly what a correctly-scoped query would
// return in production when the target id belongs to another tenant.
// ─────────────────────────────────────────────────────────────────────────

const STORE_A = "store-a-11111111-1111-1111-1111-111111111111";
const USER_A = { firebaseUid: "uid-a", email: "vendor-a@example.com" };

vi.mock("@/lib/auth", () => ({
  verifySession: vi.fn(),
  getUserStore: vi.fn(),
}));
vi.mock("@/lib/db", () => {
  // Shared with `withTransaction` below so a route that moves its mutation
  // inside a transaction (e.g. products/[productId] PATCH, for product
  // sizes) still shows up in `mockedQuery.mock.calls` for the scoping
  // assertions — same mock instance, whether called directly or via a
  // transaction's client.
  const queryMock = vi.fn();
  const queryOneMock = vi.fn();
  return {
    query: queryMock,
    queryOne: queryOneMock,
    queryMany: queryMock,
    toCamel: (row: unknown) => row,
    rowsToCamel: (rows: unknown[]) => rows,
    withTransaction: vi.fn(
      async (fn: (client: { query: (...args: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<unknown>) =>
        fn({ query: async (...args: unknown[]) => ({ rows: (await queryMock(...args)) ?? [] }) })
    ),
  };
});
vi.mock("@/lib/redis", () => ({
  cacheDel: vi.fn(),
  cacheDelPattern: vi.fn(),
  CacheKey: { categories: (id: string) => `categories:${id}` },
  reelKey: { storeFeed: (id: string) => `reels:feed:${id}`, trending: () => "reels:trending" },
}));
vi.mock("@/lib/cloudinary-server", () => ({
  default: { uploader: { destroy: vi.fn() } },
}));

import { verifySession, getUserStore } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

const mockedVerifySession = vi.mocked(verifySession);
const mockedGetUserStore = vi.mocked(getUserStore);
const mockedQuery = vi.mocked(query);
const mockedQueryOne = vi.mocked(queryOne);

function fakeReq(body?: unknown): NextRequest {
  return {
    json: async () => body ?? {},
  } as unknown as NextRequest;
}

function ctx<T extends Record<string, string>>(params: T) {
  return { params: Promise.resolve(params) };
}

/** Asserts that, among all calls made to a mocked query fn, at least one
 *  included both `store_id` in its SQL text and `storeId` among its bound
 *  parameters — i.e. the query was actually tenant-scoped, not just that
 *  the mock happened to return "not found". */
function expectScopedByStore(mockFn: typeof mockedQuery | typeof mockedQueryOne, storeId: string) {
  const scoped = mockFn.mock.calls.some(([sql, params]) => {
    const sqlText = String(sql);
    const bound = (params ?? []) as unknown[];
    return sqlText.includes("store_id") && bound.includes(storeId);
  });
  expect(scoped, `expected a call scoped by store_id=${storeId}, got calls: ${JSON.stringify(mockFn.mock.calls)}`).toBe(true);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedVerifySession.mockResolvedValue(USER_A);
  mockedGetUserStore.mockResolvedValue({ id: STORE_A } as never);
});

describe("products/[productId] — tenant isolation", () => {
  it("GET on another store's product returns 404, not the row", async () => {
    const { GET } = await import("@/app/api/products/[productId]/route");
    mockedQueryOne.mockResolvedValueOnce(null); // scoped lookup finds nothing for store A
    const res = await GET(fakeReq(), ctx({ productId: "other-store-product" }));
    expect(res.status).toBe(404);
    expectScopedByStore(mockedQueryOne, STORE_A);
  });

  it("PATCH on another store's product is a no-op 404, not an update", async () => {
    const { PATCH } = await import("@/app/api/products/[productId]/route");
    mockedQuery.mockResolvedValueOnce([]); // UPDATE ... RETURNING * matched no rows
    const res = await PATCH(fakeReq({ name: "hijacked" }), ctx({ productId: "other-store-product" }));
    expect(res.status).toBe(404);
    expectScopedByStore(mockedQuery, STORE_A);
  });

  it("DELETE issues a store-scoped DELETE even for a foreign product id", async () => {
    const { DELETE } = await import("@/app/api/products/[productId]/route");
    mockedQuery.mockResolvedValueOnce([]);
    await DELETE(fakeReq(), ctx({ productId: "other-store-product" }));
    expectScopedByStore(mockedQuery, STORE_A);
  });
});

describe("categories/[categoryId] — tenant isolation", () => {
  it("PATCH on another store's category returns 404 before any UPDATE is issued", async () => {
    const { PATCH } = await import("@/app/api/categories/[categoryId]/route");
    mockedQueryOne.mockResolvedValueOnce(null); // pre-check SELECT ... WHERE store_id=$2 finds nothing
    const res = await PATCH(fakeReq({ name: "hijacked" }), ctx({ categoryId: "other-store-category" }));
    expect(res.status).toBe(404);
    expectScopedByStore(mockedQueryOne, STORE_A);
    // No UPDATE should have been attempted once the ownership check fails.
    expect(mockedQuery).not.toHaveBeenCalled();
  });

  it("DELETE issues a store-scoped DELETE even for a foreign category id", async () => {
    const { DELETE } = await import("@/app/api/categories/[categoryId]/route");
    mockedQuery.mockResolvedValueOnce([]);
    await DELETE(fakeReq(), ctx({ categoryId: "other-store-category" }));
    expectScopedByStore(mockedQuery, STORE_A);
  });
});

describe("orders/[orderId] — tenant isolation", () => {
  it("GET on another store's order returns 404, not the row", async () => {
    const { GET } = await import("@/app/api/orders/[orderId]/route");
    mockedQueryOne.mockResolvedValueOnce(null);
    const res = await GET(fakeReq(), ctx({ orderId: "other-store-order" }));
    expect(res.status).toBe(404);
    expectScopedByStore(mockedQueryOne, STORE_A);
  });

  it("PATCH on another store's order updates nothing, but is still scoped", async () => {
    // This route doesn't check `rows[0]` before responding (pre-existing
    // behaviour — always 200 with `data: undefined` on a no-match). That's
    // a UX quirk, not a tenant leak: assert the scoping held regardless.
    const { PATCH } = await import("@/app/api/orders/[orderId]/route");
    mockedQuery.mockResolvedValueOnce([]);
    const res = await PATCH(fakeReq({ orderStatus: "shipped" }), ctx({ orderId: "other-store-order" }));
    expect(res.status).toBe(200);
    expect((await res.json()).data).toBeUndefined();
    expectScopedByStore(mockedQuery, STORE_A);
  });
});

describe("reels/[reelId] — tenant isolation", () => {
  // This route authorizes via a JOIN on stores.owner_id rather than a
  // store_id column on `reels` directly — same guarantee, different shape,
  // so the scoping assertion checks for owner_id + the authenticated uid
  // instead of store_id + store id.
  function expectScopedByOwner(mockFn: typeof mockedQueryOne) {
    const scoped = mockFn.mock.calls.some(([sql, params]) => {
      const sqlText = String(sql);
      const bound = (params ?? []) as unknown[];
      return sqlText.includes("owner_id") && bound.includes(USER_A.firebaseUid);
    });
    expect(scoped, "expected a call scoped by stores.owner_id").toBe(true);
  }

  it("PATCH on another store's reel returns 404 before any UPDATE is issued", async () => {
    const { PATCH } = await import("@/app/api/reels/[reelId]/route");
    mockedQueryOne.mockResolvedValueOnce(null); // owner_id-scoped lookup finds nothing
    const res = await PATCH(fakeReq({ title: "hijacked" }), ctx({ reelId: "other-store-reel" }));
    expect(res.status).toBe(404);
    expectScopedByOwner(mockedQueryOne);
  });

  it("DELETE on another store's reel returns 404 before any delete/Cloudinary call", async () => {
    const { DELETE } = await import("@/app/api/reels/[reelId]/route");
    mockedQueryOne.mockResolvedValueOnce(null);
    const res = await DELETE(fakeReq(), ctx({ reelId: "other-store-reel" }));
    expect(res.status).toBe(404);
    expectScopedByOwner(mockedQueryOne);
  });
});

describe("stores/coupons/[id] — tenant isolation", () => {
  // Like orders/PATCH, these routes don't check affected-row count before
  // responding (pre-existing behaviour — always `{ success: true }`). Assert
  // the mutating query is still store-scoped, so a cross-tenant id is a
  // silent no-op rather than an actual cross-tenant mutation.
  it("PATCH issues a store-scoped UPDATE even for a foreign coupon id", async () => {
    const { PATCH } = await import("@/app/api/stores/coupons/[id]/route");
    mockedQueryOne.mockResolvedValueOnce({ id: STORE_A }); // getStore() owner lookup
    mockedQuery.mockResolvedValueOnce([]);
    await PATCH(fakeReq({ is_active: false }), ctx({ id: "other-store-coupon" }));
    expectScopedByStore(mockedQuery, STORE_A);
  });

  it("DELETE issues a store-scoped DELETE even for a foreign coupon id", async () => {
    const { DELETE } = await import("@/app/api/stores/coupons/[id]/route");
    mockedQueryOne.mockResolvedValueOnce({ id: STORE_A }); // getStore() owner lookup
    mockedQuery.mockResolvedValueOnce([]);
    await DELETE(fakeReq(), ctx({ id: "other-store-coupon" }));
    expectScopedByStore(mockedQuery, STORE_A);
  });
});
