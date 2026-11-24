import { vi } from "vitest";

// The growth engine creates its tables on first use in production
// (lib/growth-schema). Tests queue database results in order, so that
// one-time setup is a no-op here.
vi.mock("@/lib/growth-schema", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/growth-schema")>();
  return { ...actual, ensureGrowthSchema: vi.fn(async () => {}), growthSchemaReady: vi.fn(async () => true) };
});
