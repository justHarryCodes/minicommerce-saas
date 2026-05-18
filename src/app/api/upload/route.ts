import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary-server";

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB

export async function POST(req: NextRequest) {
  try {
    const user = await verifySession();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!file.type.startsWith("image/"))
      return NextResponse.json({ error: "Only image files allowed" }, { status: 400 });
    if (file.size > MAX_FILE_SIZE)
      return NextResponse.json({ error: "File too large (max 8 MB)" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `duka/${user.firebaseUid}`,
            // Cap master at 1600 px — display transforms (clCard/clBanner) derive from this
            transformation: { width: 1600, crop: "limit", quality: "auto:good" },
            // Pre-generate common display sizes in the background
            eager: [
              { width: 480, height: 480, crop: "fill",  quality: "auto:good", fetch_format: "auto" },
              { width: 1200,              crop: "limit", quality: "auto:good", fetch_format: "auto" },
            ],
            eager_async: true,
          },
          (error, res) => (error ? reject(error) : resolve(res!))
        );
        stream.end(buffer);
      }
    );

    return NextResponse.json(
      { url: result.secure_url, publicId: result.public_id },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[upload] error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
