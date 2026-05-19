import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import cloudinary from "@/lib/cloudinary-server";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const store = await queryOne<{ id: string }>(
    "SELECT id FROM stores WHERE owner_id = $1 AND is_active = true",
    [user.firebaseUid]
  );
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const timestamp = Math.round(Date.now() / 1000);
  const folder = `duka-reels/${store.id}`;

  const paramsToSign: Record<string, string | number> = {
    folder,
    timestamp,
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!
  );

  return NextResponse.json({
    signature,
    timestamp,
    folder,
    apiKey:    process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    storeId:   store.id,
  });
}
