import { NextResponse } from "next/server";
import { INVITE_COOKIE } from "@/lib/team";
import { getAppUrl } from "@/lib/paystack"; // public address: behind the proxy req.url is localhost

// Forget a pending invite (e.g. it expired) and carry on to set up a store.
export async function GET() {
  const res = NextResponse.redirect(new URL("/onboarding", getAppUrl()));
  res.cookies.delete(INVITE_COOKIE);
  return res;
}
