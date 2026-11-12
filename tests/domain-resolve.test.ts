import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/domains", () => ({ slugForHostname: vi.fn(), refreshPendingForHost: vi.fn() }));

import { refreshPendingForHost, slugForHostname } from "@/lib/domains";
import { GET } from "@/app/api/domains/resolve/route";

// The Worker asks "which store owns this hostname?". A domain Cloudflare has
// just verified may still be pending in Duka: the first visit should fix it.

const ask = (host: string) => GET(new NextRequest(`http://x.test/api/domains/resolve?host=${host}`));

beforeEach(() => {
  delete process.env.WORKER_SECRET;
  vi.mocked(slugForHostname).mockReset();
  vi.mocked(refreshPendingForHost).mockReset().mockResolvedValue(false);
});

describe("custom domain lookup", () => {
  it("answers straight away for an active domain", async () => {
    vi.mocked(slugForHostname).mockResolvedValue("awarizon");
    const res = await ask("www.awarizon.shop");
    expect(await res.json()).toEqual({ slug: "awarizon" });
    expect(refreshPendingForHost).not.toHaveBeenCalled();
  });

  it("switches on a pending domain Cloudflare has verified, then answers", async () => {
    vi.mocked(slugForHostname).mockResolvedValueOnce(null).mockResolvedValueOnce("awarizon");
    vi.mocked(refreshPendingForHost).mockResolvedValue(true);
    const res = await ask("www.awarizon.shop");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ slug: "awarizon" });
    expect(refreshPendingForHost).toHaveBeenCalledWith("www.awarizon.shop");
  });

  it("still 404s for unknown or unverified domains, even if the check fails", async () => {
    vi.mocked(slugForHostname).mockResolvedValue(null);
    vi.mocked(refreshPendingForHost).mockRejectedValue(new Error("cloudflare down"));
    expect((await ask("random.shop")).status).toBe(404);
  });
});
