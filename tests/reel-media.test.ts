import { beforeEach, describe, expect, it, vi } from "vitest";

const resource = vi.fn();
const destroy = vi.fn(async () => ({ result: "ok" }));
vi.mock("@/lib/cloudinary-server", () => ({
  default: { api: { resource: (...a: unknown[]) => resource(...a) }, uploader: { destroy: (...a: unknown[]) => destroy(...(a as [])) } },
}));

import { verifyReelUpload } from "@/lib/reel-media";

const STORE = "11111111-1111-1111-1111-111111111111";
const ID = `duka-reels/${STORE}/clip`;

beforeEach(() => {
  resource.mockReset();
  destroy.mockClear();
});

describe("reels only accept real videos", () => {
  it("accepts a video and uses Cloudinary's own URL, not the client's", async () => {
    resource.mockResolvedValue({ secure_url: "https://res.cloudinary.com/x/video/upload/clip.mp4", format: "mp4", width: 720, height: 1280, duration: 14.6 });
    const r = await verifyReelUpload(STORE, ID, "https://res.cloudinary.com/x/video/upload/so_0/clip.jpg");
    expect(r).toEqual({
      ok: true,
      videoUrl: "https://res.cloudinary.com/x/video/upload/clip.mp4",
      durationSeconds: 15,
      thumbnailUrl: "https://res.cloudinary.com/x/video/upload/so_0/clip.jpg",
    });
    expect(destroy).not.toHaveBeenCalled();
  });

  it("refuses and deletes an image uploaded into the reels folder", async () => {
    resource.mockRejectedValue(new Error("Resource not found"));
    const r = await verifyReelUpload(STORE, ID);
    expect(r.ok).toBe(false);
    expect(destroy).toHaveBeenCalled();
  });

  it("refuses audio-only files", async () => {
    resource.mockResolvedValue({ secure_url: "https://res.cloudinary.com/x/video/upload/a.mp3", format: "mp3", is_audio: true, duration: 30 });
    expect((await verifyReelUpload(STORE, ID)).ok).toBe(false);
    expect(destroy).toHaveBeenCalled();
  });

  it("refuses another store's upload without touching it", async () => {
    const r = await verifyReelUpload(STORE, "duka-reels/22222222-2222-2222-2222-222222222222/clip");
    expect(r.ok).toBe(false);
    expect(resource).not.toHaveBeenCalled();
    expect(destroy).not.toHaveBeenCalled();
  });

  it("drops a thumbnail that points outside Duka's image hosts", async () => {
    resource.mockResolvedValue({ secure_url: "https://res.cloudinary.com/x/video/upload/clip.mp4", format: "mov", width: 1080, height: 1920 });
    const r = await verifyReelUpload(STORE, ID, "https://evil.example/t.jpg");
    expect(r.ok && r.thumbnailUrl).toBe(null);
  });
});
