import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB client limit

export async function POST(req: NextRequest) {
  try {
    const user = await verifySession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files allowed" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 8 MB)" }, { status: 400 });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET ?? "shopforge";

    if (!cloudName) {
      return NextResponse.json({ error: "Cloudinary not configured" }, { status: 500 });
    }

    const uploadData = new FormData();
    uploadData.append("file", file);
    uploadData.append("upload_preset", uploadPreset);
    uploadData.append("folder", `shopforge/${user.firebaseUid}`);

    // Cap the stored master image at 1 600 px wide and apply smart quality.
    // This runs once at upload time — every derivative (clCard, clBanner, etc.)
    // is then generated from a reasonably-sized master, not a 6 MB original.
    uploadData.append("transformation", "c_limit,w_1600,q_auto:good");

    // Pre-generate the two most-requested sizes so the first visitor never
    // triggers an on-the-fly transformation. async=true means the upload
    // response is instant; Cloudinary generates these in the background.
    uploadData.append(
      "eager",
      "f_auto,q_auto:good,c_fill,w_480,h_480|f_auto,q_auto:good,c_limit,w_1200"
    );
    uploadData.append("eager_async", "true");

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: uploadData }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[Cloudinary upload error]", err);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const data = await res.json();

    // Return the plain secure_url (no transforms baked in).
    // Callers apply display-specific transforms via clCard/clBanner/etc.
    return NextResponse.json(
      { url: data.secure_url, publicId: data.public_id },
      {
        headers: {
          // This API response itself should not be cached (it's a write).
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    console.error("[upload] error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
