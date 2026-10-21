import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { INVITE_COOKIE } from "@/lib/team";
import { verifySession } from "@/lib/auth";
import { getStoreAccess, pausedMembershipStore } from "@/lib/access";
import { verifyAdminSession, getPlatformSettings } from "@/lib/admin-auth";

export async function GET() {
  const user = await verifySession();
  if (!user) return NextResponse.json({ url: "/auth/login" });

  const admin = await verifyAdminSession();
  if (admin) return NextResponse.json({ url: "/admin" });

  // Signed in from a team invitation link: go back and accept it
  const invite = (await cookies()).get(INVITE_COOKIE)?.value;
  if (invite) return NextResponse.json({ url: `/team/join?token=${encodeURIComponent(invite)}` });

  const access = await getStoreAccess(user);
  if (!access) return NextResponse.json({ url: (await pausedMembershipStore(user)) ? "/team/paused" : "/onboarding" });
  const { store } = access;
  // Team members land on the work they do; the owner handles billing.
  if (access.role === "staff") return NextResponse.json({ url: "/dashboard/orders" });
  if (access.role === "manager") return NextResponse.json({ url: "/dashboard" });

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
