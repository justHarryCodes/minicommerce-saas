import { NextResponse } from "next/server";
import { verifySession, getUserStore } from "@/lib/auth";
import { verifyAdminSession, getPlatformSettings } from "@/lib/admin-auth";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ url: "/auth/login" });

  const admin = await verifyAdminSession();
  if (admin) return NextResponse.json({ url: "/admin" });

  const store = await getUserStore(user.firebaseUid);
  if (!store) return NextResponse.json({ url: "/onboarding" });

  // Resolve the final destination including the billing gate so the client
  // only does a single navigation (no server-side redirect chain).
  const settings = await getPlatformSettings();
  if (settings.require_setup_fee) {
    const paid =
      store.subscriptionStatus === "setup_fee_paid" ||
      store.subscriptionStatus === "subscribed";
    if (!paid) return NextResponse.json({ url: "/dashboard/billing" });
  }

  return NextResponse.json({ url: "/dashboard" });
}
