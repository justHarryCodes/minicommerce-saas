import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { INVITE_COOKIE } from "@/lib/team";
import { verifySession } from "@/lib/auth";
import { getStoreAccess, pausedMembershipStore } from "@/lib/access";
import { verifyAdminSession } from "@/lib/admin-auth";

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
  // Team members land on the work they do; the owner handles billing.
  if (access.role === "staff") return NextResponse.json({ url: "/dashboard/orders" });
  if (access.role === "manager") return NextResponse.json({ url: "/dashboard" });

  // No registration fee: every store goes straight to its dashboard
  return NextResponse.json({ url: "/dashboard" });
}
