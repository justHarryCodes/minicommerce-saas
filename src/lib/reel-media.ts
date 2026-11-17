import cloudinary from "@/lib/cloudinary-server";
import { isAllowedImageUrl } from "@/lib/safe-image-url";

// A reel is only saved once the server has asked Cloudinary what the uploaded
// file really is. The upload itself goes straight from the browser / app to
// Cloudinary, so whatever the client claims (URL, type, length) is not trusted:
// anything that isn't a video in this store's own reels folder is refused, and
// a non-video upload is deleted.

export const REEL_VIDEO_FORMATS = new Set(["mp4", "mov", "webm", "m4v", "3gp", "mkv", "avi"]);

export function reelFolder(storeId: string) {
  return `duka-reels/${storeId}`;
}

export type ReelCheck =
  | { ok: true; videoUrl: string; durationSeconds: number | null; thumbnailUrl: string | null }
  | { ok: false; error: string };

interface VideoResource {
  secure_url: string;
  format?: string;
  width?: number;
  height?: number;
  duration?: number;
  is_audio?: boolean;
}

/** Remove a non-video file someone uploaded into the reels folder. */
async function discard(publicId: string) {
  await Promise.all(
    (["image", "raw"] as const).map((resource_type) => cloudinary.uploader.destroy(publicId, { resource_type, invalidate: true }).catch(() => null)),
  );
}

export async function verifyReelUpload(storeId: string, publicId: string, thumbnailUrl?: string): Promise<ReelCheck> {
  // Only this store's own uploads (no claiming another store's file)
  if (!publicId.startsWith(`${reelFolder(storeId)}/`) || publicId.includes("..")) {
    return { ok: false, error: "That upload doesn't belong to your store." };
  }

  let res: VideoResource;
  try {
    res = (await cloudinary.api.resource(publicId, { resource_type: "video" })) as VideoResource;
  } catch {
    // Not found as a video: it was uploaded as an image or another file type
    await discard(publicId);
    return { ok: false, error: "Only video files can be uploaded as reels." };
  }

  const format = (res.format ?? "").toLowerCase();
  const isVideo = !res.is_audio && (res.width ?? 0) > 0 && (res.height ?? 0) > 0 && REEL_VIDEO_FORMATS.has(format);
  if (!isVideo) {
    await cloudinary.uploader.destroy(publicId, { resource_type: "video", invalidate: true }).catch(() => null);
    return { ok: false, error: "Only video files can be uploaded as reels." };
  }

  return {
    ok: true,
    // Cloudinary's own address for the file, never one sent by the client
    videoUrl: res.secure_url,
    durationSeconds: res.duration ? Math.round(res.duration) : null,
    thumbnailUrl: thumbnailUrl && isAllowedImageUrl(thumbnailUrl) ? thumbnailUrl : null,
  };
}
