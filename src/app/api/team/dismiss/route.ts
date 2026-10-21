import { NextRequest, NextResponse } from "next/server";
import { INVITE_COOKIE } from "@/lib/team";

// Forget a pending invite (e.g. it expired) and carry on to set up a store.
export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/onboarding", req.url));
  res.cookies.delete(INVITE_COOKIE);
  return res;
}
