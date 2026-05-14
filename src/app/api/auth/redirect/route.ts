import { NextResponse } from "next/server";
import { verifySession, getUserStore } from "@/lib/auth";
import { verifyAdminSession } from "@/lib/admin-auth";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ url: "/auth/login" });

  const admin = await verifyAdminSession();
  if (admin) return NextResponse.json({ url: "/admin" });

  const store = await getUserStore(user.firebaseUid);
  return NextResponse.json({ url: store ? "/dashboard" : "/onboarding" });
}
