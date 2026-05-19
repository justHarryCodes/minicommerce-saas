import { NextResponse } from "next/server";
import { verifySession, getUserStore } from "@/lib/auth";
import { getPlatformSettings } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ required: false, paid: true });

  const [store, settings] = await Promise.all([
    getUserStore(user.firebaseUid),
    getPlatformSettings(),
  ]);

  if (!store) return NextResponse.json({ required: false, paid: true });
  if (!settings.require_setup_fee) return NextResponse.json({ required: false, paid: true });

  const paid =
    store.subscriptionStatus === "setup_fee_paid" ||
    store.subscriptionStatus === "subscribed";

  return NextResponse.json({ required: true, paid });
}
